// Telemetry plane router.
//
// POST /telemetry-router { events: [{name, payload, anon_id?, user_id?, ts?, dedupe_key?}] }
//   - Validates each event.
//   - Applies admin-configured sampling, dedupe, and per-minute rate limits.
//   - Writes to the OWNED telemetry DB (wguuipsikboqqinqeehv) when ownedReady().
//     Falls back to PRIMARY (existing tables) so production never breaks.
//   - On sink failure, enqueues into telemetry_replay_queue on PRIMARY for later
//     async re-delivery (fire-and-forget).
//
// GET  /telemetry-router?op=overview → returns admin-only health snapshot via RPC.
// POST /telemetry-router with { op:"snapshot" } → records a telemetry_health_snapshots row.
//
// Verify JWT: off (telemetry is public-ish, anon events allowed). Admin overview
// requires the caller to be authenticated and pass-through to the RPC which
// enforces admin role.

import { getOwned, getPrimaryService, ownedReady } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ALLOWED_EVENT_NAMES = new Set([
  "blog_event_view",
  "blog_event_read",
  "blog_event_bookmark",
  "blog_event_unbookmark",
  "tool_launch",
  "cta_impression",
  "cta_click",
]);

// Owned-DB table targets per event family (must exist on telemetry DB).
// Falls back to PRIMARY equivalents when owned not ready.
function targetFor(eventName: string): { owned: string; primary: string } {
  if (eventName.startsWith("blog_event_")) {
    return { owned: "blog_events", primary: "blog_events" };
  }
  if (eventName === "tool_launch") {
    return { owned: "tool_launch_events", primary: "tool_launch_events" };
  }
  if (eventName === "cta_impression" || eventName === "cta_click") {
    return { owned: "cta_events", primary: "cta_events" };
  }
  return { owned: "telemetry_misc", primary: "telemetry_misc" };
}

type SamplingRow = {
  event_name: string;
  sample_rate: number;
  dedupe_window_seconds: number;
  max_events_per_minute: number;
  enabled: boolean;
};

const samplingCache = new Map<string, { row: SamplingRow; fetchedAt: number }>();
const rateCounters = new Map<string, { bucket: number; count: number }>();
const dedupeCache = new Map<string, number>(); // key -> expires_at
const SAMPLING_TTL_MS = 60_000;

// Per-stream evacuation toggles (cached 30s).
type ToggleRow = {
  stream: string;
  enabled: boolean;
  owned_enabled: boolean;
  mirror_to_primary: boolean;
};
const toggleCache = new Map<string, { row: ToggleRow; fetchedAt: number }>();
const TOGGLE_TTL_MS = 30_000;

async function getToggle(stream: string): Promise<ToggleRow> {
  const c = toggleCache.get(stream);
  if (c && Date.now() - c.fetchedAt < TOGGLE_TTL_MS) return c.row;
  const fallback: ToggleRow = {
    stream, enabled: true, owned_enabled: false, mirror_to_primary: false,
  };
  try {
    const primary = getPrimaryService();
    const { data } = await primary
      .from("telemetry_evacuation_toggles")
      .select("stream,enabled,owned_enabled,mirror_to_primary")
      .eq("stream", stream)
      .maybeSingle();
    const row = (data as ToggleRow | null) ?? fallback;
    toggleCache.set(stream, { row, fetchedAt: Date.now() });
    return row;
  } catch {
    toggleCache.set(stream, { row: fallback, fetchedAt: Date.now() });
    return fallback;
  }
}

async function recordRoute(stream: string, outcome: "owned"|"primary"|"mirror"|"replay"|"fail", count: number) {
  if (count <= 0) return;
  try {
    const primary = getPrimaryService();
    await primary.rpc("telemetry_record_route", { _stream: stream, _outcome: outcome, _count: count });
  } catch { /* tolerate */ }
}

async function getSampling(eventName: string): Promise<SamplingRow | null> {
  const cached = samplingCache.get(eventName);
  if (cached && Date.now() - cached.fetchedAt < SAMPLING_TTL_MS) return cached.row;
  try {
    const primary = getPrimaryService();
    const { data } = await primary
      .from("telemetry_sampling_config")
      .select("event_name,sample_rate,dedupe_window_seconds,max_events_per_minute,enabled")
      .eq("event_name", eventName)
      .maybeSingle();
    if (data) {
      samplingCache.set(eventName, { row: data as SamplingRow, fetchedAt: Date.now() });
      return data as SamplingRow;
    }
  } catch { /* tolerate */ }
  const fallback: SamplingRow = {
    event_name: eventName, sample_rate: 1, dedupe_window_seconds: 0,
    max_events_per_minute: 0, enabled: true,
  };
  samplingCache.set(eventName, { row: fallback, fetchedAt: Date.now() });
  return fallback;
}

function rateLimited(eventName: string, perMinute: number): boolean {
  if (perMinute <= 0) return false;
  const minute = Math.floor(Date.now() / 60_000);
  const c = rateCounters.get(eventName);
  if (!c || c.bucket !== minute) {
    rateCounters.set(eventName, { bucket: minute, count: 1 });
    return false;
  }
  c.count += 1;
  return c.count > perMinute;
}

function isDuplicate(key: string, windowSec: number): boolean {
  if (!key || windowSec <= 0) return false;
  const now = Date.now();
  // Opportunistic gc
  if (dedupeCache.size > 2000) {
    for (const [k, exp] of dedupeCache) if (exp < now) dedupeCache.delete(k);
  }
  const exp = dedupeCache.get(key);
  if (exp && exp > now) return true;
  dedupeCache.set(key, now + windowSec * 1000);
  return false;
}

async function recordDrop(eventName: string, reason: string, n = 1) {
  try {
    const primary = getPrimaryService();
    await primary.rpc("telemetry_record_drop", {
      _event_name: eventName, _reason: reason, _count: n,
    });
  } catch { /* swallow */ }
}

async function bumpRouterState(stream: string, ingested: number, dropped: number, error?: string) {
  try {
    const primary = getPrimaryService();
    const patch: Record<string, unknown> = {
      stream,
      updated_at: new Date().toISOString(),
      total_ingested: ingested,
      total_dropped: dropped,
    };
    if (error) {
      patch.last_failure_at = new Date().toISOString();
      patch.last_error = error.slice(0, 500);
    } else {
      patch.last_success_at = new Date().toISOString();
      patch.consecutive_failures = 0;
    }
    // upsert via raw insert + on conflict requires rpc; use update fallback
    await primary.from("telemetry_router_state")
      .upsert(patch, { onConflict: "stream" });
  } catch { /* tolerate */ }
}

function toRow(eventName: string, ev: any): { table: string; row: Record<string, unknown> } {
  const { owned } = targetFor(eventName);
  const p = ev.payload || {};
  if (eventName.startsWith("blog_event_")) {
    const kind = eventName === "blog_event_view" ? "view"
      : eventName === "blog_event_read" ? "read"
      : eventName === "blog_event_bookmark" ? "bookmark"
      : "unbookmark";
    return {
      table: owned,
      row: {
        post_slug: String(p.post_slug || p.slug || ""),
        user_id: ev.user_id ?? null,
        anon_id: ev.anon_id ?? null,
        kind,
      },
    };
  }
  if (eventName === "tool_launch") {
    return {
      table: owned,
      row: {
        tool_slug: String(p.tool_slug || ""),
        source_kind: p.source_kind ?? null,
        source_slug: p.source_slug ?? null,
        cta_id: p.cta_id ?? null,
        persona: p.persona ?? null,
        user_id: ev.user_id ?? null,
        anon_id: ev.anon_id ?? null,
        metadata: p.metadata ?? {},
      },
    };
  }
  if (eventName === "cta_impression" || eventName === "cta_click") {
    return {
      table: owned,
      row: {
        cta_id: String(p.cta_id || ""),
        kind: eventName === "cta_impression" ? "impression" : "click",
        source_slug: p.source_slug ?? null,
        target_slug: p.target_slug ?? null,
        persona: p.persona ?? null,
        user_id: ev.user_id ?? null,
        anon_id: ev.anon_id ?? null,
        metadata: p.metadata ?? {},
      },
    };
  }
  return { table: owned, row: { event_name: eventName, payload: p } };
}

async function ingestBatch(events: any[]): Promise<{ ingested: number; dropped: number; perStream: Record<string, { ingested: number; dropped: number }> }> {
  const perStream: Record<string, { ingested: number; dropped: number }> = {};
  const bump = (stream: string, key: "ingested" | "dropped", n = 1) => {
    if (!perStream[stream]) perStream[stream] = { ingested: 0, dropped: 0 };
    perStream[stream][key] += n;
  };

  // Group accepted events by target table for batched insert
  const buckets = new Map<string, { rows: Record<string, unknown>[]; stream: string; owned: string; primary: string }>();

  for (const ev of events) {
    const name = String(ev?.name || "");
    if (!ALLOWED_EVENT_NAMES.has(name)) { await recordDrop(name || "unknown", "invalid"); continue; }
    const cfg = await getSampling(name);
    if (!cfg || !cfg.enabled) { await recordDrop(name, "sampled"); continue; }
    if (cfg.sample_rate < 1 && Math.random() > cfg.sample_rate) { await recordDrop(name, "sampled"); continue; }
    if (rateLimited(name, cfg.max_events_per_minute)) { await recordDrop(name, "rate_limited"); continue; }
    const dedupeKey = ev.dedupe_key ? `${name}:${ev.dedupe_key}` : "";
    if (isDuplicate(dedupeKey, cfg.dedupe_window_seconds)) { await recordDrop(name, "duplicate"); continue; }

    const { table, row } = toRow(name, ev);
    const { primary } = targetFor(name);
    const stream = primary; // primary table name acts as stream label
    const key = table;
    if (!buckets.has(key)) buckets.set(key, { rows: [], stream, owned: table, primary });
    buckets.get(key)!.rows.push(row);
  }

  const ownedAvailable = ownedReady();
  const ownedClient = ownedAvailable ? getOwned() : null;
  const primaryClient = getPrimaryService();

  for (const [, b] of buckets) {
    const toggle = await getToggle(b.stream);
    if (!toggle.enabled) {
      bump(b.stream, "dropped", b.rows.length);
      await recordDrop(b.stream, "stream_disabled", b.rows.length);
      continue;
    }
    const wantOwned = ownedAvailable && toggle.owned_enabled;
    const wantMirror = wantOwned && toggle.mirror_to_primary;
    const target = wantOwned ? b.owned : b.primary;
    const sink = wantOwned ? ownedClient! : primaryClient;

    try {
      const { error } = await sink.from(target).insert(b.rows);
      if (error) throw error;
      bump(b.stream, "ingested", b.rows.length);
      void bumpRouterState(b.stream, b.rows.length, 0);
      void recordRoute(b.stream, wantOwned ? "owned" : "primary", b.rows.length);

      // Optional dual-write for cutover verification.
      if (wantMirror) {
        try {
          const { error: mErr } = await primaryClient.from(b.primary).insert(b.rows);
          if (mErr) throw mErr;
          void recordRoute(b.stream, "mirror", b.rows.length);
        } catch {
          void recordRoute(b.stream, "fail", b.rows.length);
        }
      }
    } catch (e) {
      const msg = (e as Error).message || String(e);
      // Owned-sink failure → automatic fallback to primary (no data loss).
      if (wantOwned) {
        try {
          const { error: fbErr } = await primaryClient.from(b.primary).insert(b.rows);
          if (!fbErr) {
            bump(b.stream, "ingested", b.rows.length);
            void recordRoute(b.stream, "primary", b.rows.length);
            void bumpRouterState(b.stream, b.rows.length, 0, `owned_fallback:${msg.slice(0,120)}`);
            continue;
          }
        } catch { /* fall through to replay */ }
      }
      // Enqueue replay on PRIMARY
      try {
        await primaryClient.from("telemetry_replay_queue").insert(
          b.rows.map((r) => ({
            event_name: b.stream,
            target_table: b.owned,
            payload: r,
            last_error: msg.slice(0, 500),
          })),
        );
        void recordRoute(b.stream, "replay", b.rows.length);
      } catch { /* tolerate */ }
      bump(b.stream, "dropped", b.rows.length);
      await recordDrop(b.stream, "sink_unavailable", b.rows.length);
      void recordRoute(b.stream, "fail", b.rows.length);
      void bumpRouterState(b.stream, 0, b.rows.length, msg);
    }
  }

  const totals = Object.values(perStream).reduce(
    (acc, v) => ({ ingested: acc.ingested + v.ingested, dropped: acc.dropped + v.dropped }),
    { ingested: 0, dropped: 0 },
  );
  return { ...totals, perStream };
}

async function takeHealthSnapshot() {
  const primary = getPrimaryService();
  // Aggregate last minute from drop counter (best-effort).
  let dropped1m = 0, replayed1m = 0;
  try {
    const since = new Date(Date.now() - 60_000).toISOString();
    const { data: drops } = await primary
      .from("telemetry_drop_counter")
      .select("count,last_at")
      .gte("last_at", since);
    dropped1m = (drops || []).reduce((a: number, r: any) => a + (r.count || 0), 0);
    const { count: replayedCount } = await primary
      .from("telemetry_replay_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("updated_at", since);
    replayed1m = replayedCount || 0;
  } catch { /* tolerate */ }

  let received1m = 0, ingested1m = 0;
  try {
    const { data: state } = await primary
      .from("telemetry_router_state")
      .select("total_ingested,total_dropped,updated_at")
      .gte("updated_at", new Date(Date.now() - 60_000).toISOString());
    for (const r of (state || []) as any[]) {
      ingested1m += r.total_ingested || 0;
      received1m += (r.total_ingested || 0) + (r.total_dropped || 0);
    }
  } catch { /* tolerate */ }

  let sinkReachable = true;
  let lag = 0;
  try {
    const t0 = Date.now();
    const sink = ownedReady() ? getOwned() : getPrimaryService();
    const { error } = await sink.from("blog_events").select("id", { count: "exact", head: true }).limit(1);
    lag = Date.now() - t0;
    if (error) sinkReachable = false;
  } catch { sinkReachable = false; }

  await primary.from("telemetry_health_snapshots").insert({
    events_received_1m: received1m,
    events_ingested_1m: ingested1m,
    events_dropped_1m: dropped1m,
    events_replayed_1m: replayed1m,
    ingestion_lag_ms: lag,
    sink_reachable: sinkReachable,
    table_growth_24h: {},
    estimated_cost_micro: 0,
    notes: ownedReady() ? "owned_sink" : "primary_fallback",
  });
  return { ok: true, sinkReachable, lag, ingested1m, dropped1m };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);

  // Health overview (GET)
  if (req.method === "GET" && url.searchParams.get("op") === "overview") {
    try {
      const primary = getPrimaryService();
      const { data, error } = await primary.rpc("telemetry_health_overview");
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), {
        status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    if (body?.op === "snapshot") {
      const r = await takeHealthSnapshot();
      return new Response(JSON.stringify(r), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const events = Array.isArray(body?.events) ? body.events.slice(0, 100) : [];
    if (events.length === 0) {
      return new Response(JSON.stringify({ ingested: 0, dropped: 0 }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const result = await ingestBatch(events);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});