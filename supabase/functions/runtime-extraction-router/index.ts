// Runtime Extraction Router — single entry point for ALL operational writes
// during Wave 1. Routes by stream posture (primary | owned | mirror | shadow
// | rollback | blocked), attaches confidence + replay metadata, records
// per-stream metrics on the primary registry, and queues replay on sink
// failure. Rail-guarded streams are hard-blocked from leaving primary.
//
// POST /runtime-extraction-router
//   { stream: "notification_deliveries",
//     rows: [{...}, ...],
//     target_table?: "async_runtime.notification_deliveries" }
//
// GET  /runtime-extraction-router?op=overview → admin KPI snapshot
// POST /runtime-extraction-router { op: "scan" } → runs hard-dep scan stub
// POST /runtime-extraction-router { op: "circuit", circuit, action } →
//   open/close/trip a recovery circuit

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getOwned, getPrimaryService, ownedReady, getAsync } from "../_shared/clients.ts";

type Posture = "primary" | "owned" | "mirror" | "shadow" | "rollback" | "blocked";
type StreamCfg = {
  stream: string;
  posture: Posture;
  owner_db: string | null;
  confidence: number;
  rail_guarded: boolean;
  critical: boolean;
  est_bytes_per_write: number;
};

const streamCache = new Map<string, { cfg: StreamCfg; fetchedAt: number }>();
const CACHE_TTL_MS = 30_000;

async function loadStream(name: string): Promise<StreamCfg | null> {
  const c = streamCache.get(name);
  if (c && Date.now() - c.fetchedAt < CACHE_TTL_MS) return c.cfg;
  try {
    const primary = getPrimaryService();
    const { data } = await primary
      .from("runtime_extraction_streams")
      .select("stream,posture,owner_db,confidence,rail_guarded,critical,est_bytes_per_write")
      .eq("stream", name)
      .maybeSingle();
    if (!data) return null;
    const cfg = data as StreamCfg;
    streamCache.set(name, { cfg, fetchedAt: Date.now() });
    return cfg;
  } catch {
    return null;
  }
}

async function recordRoute(stream: string, outcome: string, count: number, confidence: number | null, bytesAvoided: number) {
  try {
    const primary = getPrimaryService();
    await primary.rpc("runtime_record_route", {
      _stream: stream,
      _outcome: outcome,
      _count: count,
      _confidence: confidence,
      _bytes_avoided: bytesAvoided,
    });
  } catch (e) {
    console.warn("record_route failed", (e as Error).message);
  }
}

async function enqueueReplay(stream: string, target: string, rows: Record<string, unknown>[], error: string) {
  try {
    const primary = getPrimaryService();
    await primary.from("telemetry_replay_queue").insert(
      rows.map((r) => ({
        event_name: stream,
        target_table: target,
        payload: r,
        last_error: error.slice(0, 500),
      })),
    );
  } catch { /* tolerate */ }
}

async function checkCircuit(stream: string): Promise<boolean> {
  // returns true if blocked (open)
  try {
    const primary = getPrimaryService();
    const { data } = await primary
      .from("runtime_recovery_circuits")
      .select("state,cools_at")
      .eq("circuit", `${stream}_circuit`)
      .maybeSingle();
    if (!data) return false;
    if (data.state === "open") {
      if (data.cools_at && new Date(data.cools_at) < new Date()) return false;
      return true;
    }
  } catch { /* tolerate */ }
  return false;
}

async function handleIngest(body: any): Promise<Response> {
  const stream = String(body?.stream || "");
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  const target = String(body?.target_table || stream);
  if (!stream || rows.length === 0) {
    return json({ error: "stream and rows required" }, 400);
  }

  const cfg = await loadStream(stream);
  if (!cfg) {
    return json({ error: "unknown stream", stream }, 404);
  }

  // Rail guard: critical/auth/payments streams cannot leave primary.
  let posture: Posture = cfg.posture;
  if (cfg.rail_guarded && (posture !== "primary" && posture !== "rollback")) {
    posture = "primary";
  }
  if (posture === "blocked") {
    await recordRoute(stream, "fail", rows.length, cfg.confidence, 0);
    return json({ ok: false, blocked: true, stream });
  }

  if (await checkCircuit(stream)) {
    await enqueueReplay(stream, target, rows, "circuit_open");
    await recordRoute(stream, "replay", rows.length, cfg.confidence, 0);
    return json({ ok: true, deferred: true, reason: "circuit_open" });
  }

  const wantOwned = (posture === "owned" || posture === "mirror" || posture === "shadow")
    && (ownedReady() || cfg.owner_db);
  const primary = getPrimaryService();
  const ownedClient = wantOwned ? getOwned() : null;

  // Attach metadata
  const enriched = rows.map((r: Record<string, unknown>) => ({
    ...r,
    _meta: {
      routed_at: new Date().toISOString(),
      stream,
      posture,
      confidence: cfg.confidence,
    },
  }));

  const bytesAvoided = rows.length * cfg.est_bytes_per_write;

  try {
    if (posture === "shadow") {
      // shadow-write only to owned, never to primary
      if (ownedClient) {
        const { error } = await ownedClient.from(target).insert(enriched);
        if (error) throw error;
        await recordRoute(stream, "shadow", rows.length, cfg.confidence, bytesAvoided);
      }
      return json({ ok: true, posture, rows: rows.length });
    }

    if (posture === "owned" && ownedClient) {
      const { error } = await ownedClient.from(target).insert(enriched);
      if (error) throw error;
      await recordRoute(stream, "owned", rows.length, cfg.confidence, bytesAvoided);
      return json({ ok: true, posture, rows: rows.length });
    }

    if (posture === "mirror" && ownedClient) {
      const { error: oErr } = await ownedClient.from(target).insert(enriched);
      if (oErr) throw oErr;
      await recordRoute(stream, "owned", rows.length, cfg.confidence, bytesAvoided);
      // mirror to primary (best-effort, do not fail the request)
      try {
        const { error: pErr } = await primary.from(target).insert(rows);
        if (!pErr) await recordRoute(stream, "mirror", rows.length, cfg.confidence, 0);
      } catch { /* tolerate mirror miss */ }
      return json({ ok: true, posture, rows: rows.length });
    }

    // primary or rollback
    const { error } = await primary.from(target).insert(rows);
    if (error) throw error;
    await recordRoute(stream, "primary", rows.length, cfg.confidence, 0);
    return json({ ok: true, posture: "primary", rows: rows.length });
  } catch (e) {
    const msg = (e as Error).message || String(e);
    // Automatic fallback to primary when owned sink fails
    if (wantOwned && posture !== "shadow") {
      try {
        const { error: fbErr } = await primary.from(target).insert(rows);
        if (!fbErr) {
          await recordRoute(stream, "primary", rows.length, cfg.confidence, 0);
          return json({ ok: true, posture: "primary_fallback", rows: rows.length, owned_error: msg });
        }
      } catch { /* fall through */ }
    }
    await enqueueReplay(stream, target, rows, msg);
    await recordRoute(stream, "replay", rows.length, cfg.confidence, 0);
    await recordRoute(stream, "fail", rows.length, cfg.confidence, 0);
    return json({ ok: false, replayed: true, error: msg }, 202);
  }
}

async function handleOverview(): Promise<Response> {
  try {
    const primary = getPrimaryService();
    const { data, error } = await primary.rpc("runtime_extraction_overview");
    if (error) throw error;
    return json(data);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}

async function handleScan(): Promise<Response> {
  // Lightweight code-pattern scan stub. Records seed findings if none exist.
  const primary = getPrimaryService();
  const seed = [
    { kind: "direct_primary_write", location: "supabase/functions/log-event/index.ts", detail: "writes via analytics client — promote to runtime-extraction-router", severity: "medium" },
    { kind: "hardcoded_project_ref", location: "src/integrations/community/client.ts", detail: "hardcoded qeswhaytgvosfzzgraef ref", severity: "low" },
    { kind: "scattered_router", location: "supabase/functions/telemetry-router/index.ts", detail: "still owns its own routing — consolidate behind extraction router", severity: "medium" },
    { kind: "duplicate_emitter", location: "supabase/functions/_shared/events/emit.ts", detail: "duplicate fan-out emitter alongside log-event", severity: "low" },
  ];
  let inserted = 0;
  for (const f of seed) {
    try {
      const { error } = await primary
        .from("runtime_hard_dependency_findings")
        .upsert({ ...f, last_seen_at: new Date().toISOString() }, { onConflict: "kind,location" });
      if (!error) inserted++;
    } catch { /* skip */ }
  }
  return json({ ok: true, scanned: seed.length, recorded: inserted });
}

async function handleCircuit(body: any): Promise<Response> {
  const circuit = String(body?.circuit || "");
  const action = String(body?.action || "");
  if (!circuit || !["open", "close", "trip"].includes(action)) {
    return json({ error: "circuit + action(open|close|trip) required" }, 400);
  }
  try {
    const primary = getPrimaryService();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (action === "close") {
      patch.state = "closed"; patch.current_count = 0; patch.cools_at = null;
    } else {
      patch.state = "open";
      patch.tripped_at = new Date().toISOString();
      patch.cools_at = new Date(Date.now() + 5 * 60_000).toISOString();
    }
    const { error } = await primary.from("runtime_recovery_circuits").update(patch).eq("circuit", circuit);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

// Silence unused warnings for clients reserved for future drain ops.
void getAsync;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);

  if (req.method === "GET" && url.searchParams.get("op") === "overview") {
    return handleOverview();
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.op === "overview") return handleOverview();
    if (body?.op === "scan")     return handleScan();
    if (body?.op === "circuit")  return handleCircuit(body);
    return handleIngest(body);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});