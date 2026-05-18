// Runtime Authority Finalizer
// ---------------------------
// Periodic / on-demand worker that:
//   1) Auto-promotes safe streams (mirror → owned_authoritative → primary_disabled)
//      via the public.runtime_auto_promote_streams() RPC.
//   2) Returns the current authority countdown (remaining primary writes,
//      remaining operational tables, projected days to independence,
//      top offenders, avoided realtime emissions / WAL / replication).
//   3) Scans for direct-write violations against the primary DB by
//      inspecting telemetry_replay_queue + recent edge_invocation_log
//      entries that hit operational tables outside the extraction router.
//   4) Auto-expires stale fallback flags so a fallback is always temporary.
//
// POST /runtime-authority-finalizer            → full pass (promote+scan+countdown)
// POST /runtime-authority-finalizer { op:"countdown" }  → KPIs only
// POST /runtime-authority-finalizer { op:"promote" }    → promotion only
// POST /runtime-authority-finalizer { op:"scan" }       → violation scan only
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getPrimaryService } from "../_shared/clients.ts";

const FALLBACK_TTL_SECONDS = 600; // 10 minutes

// Known operational tables that should never be written directly on primary.
const OPERATIONAL_TABLES = new Set([
  "notification_deliveries",
  "telegram_send_log",
  "admin_alert_history",
  "broadcast_telemetry",
  "delivery_receipts",
  "queue_archive",
  "completed_jobs",
  "replay_history",
  "retry_history",
  "runtime_health_sweeps",
  "incident_history",
  "lease_contention_log",
  "async_worker_state",
]);

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

async function autoPromote() {
  const sb = getPrimaryService();
  const { data, error } = await sb.rpc("runtime_auto_promote_streams" as any);
  if (error) throw error;
  return data ?? [];
}

async function expireStaleFallbacks() {
  const sb = getPrimaryService();
  // Clear fallback flags whose TTL has elapsed
  const { data, error } = await sb
    .from("runtime_extraction_streams")
    .update({
      fallback_activated_at: null,
      fallback_expires_at: null,
      fallback_reason: null,
      updated_at: new Date().toISOString(),
    })
    .lt("fallback_expires_at", new Date().toISOString())
    .select("stream");
  if (error) return { expired: 0, error: error.message };
  return { expired: (data || []).length };
}

async function decayFallbackCounters() {
  const sb = getPrimaryService();
  // Decay fallback_count_1h for streams whose last fallback was > 1h ago
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { error } = await sb
    .from("runtime_extraction_streams")
    .update({ fallback_count_1h: 0, updated_at: new Date().toISOString() })
    .or(`fallback_activated_at.is.null,fallback_activated_at.lt.${cutoff}`)
    .gt("fallback_count_1h", 0);
  return { ok: !error, error: error?.message };
}

async function scanViolations() {
  const sb = getPrimaryService();
  // Pull recent replay queue entries — anything still landing on the primary
  // for an operational target table indicates a bypass of the router.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: replays } = await sb
    .from("telemetry_replay_queue")
    .select("event_name,target_table,created_at")
    .gte("created_at", since)
    .limit(1000);

  const seen = new Map<string, { fn: string; table: string; count: number }>();
  for (const r of (replays || []) as any[]) {
    const tbl = String(r.target_table || "").split(".").pop() || "";
    if (!OPERATIONAL_TABLES.has(tbl)) continue;
    const fn = String(r.event_name || "unknown");
    const key = `${fn}::${tbl}`;
    const cur = seen.get(key) || { fn, table: tbl, count: 0 };
    cur.count += 1;
    seen.set(key, cur);
  }

  let recorded = 0;
  for (const v of seen.values()) {
    const sev = v.count > 50 ? "high" : v.count > 10 ? "medium" : "low";
    const { error } = await sb.rpc("runtime_record_violation" as any, {
      _function: v.fn,
      _table: v.table,
      _runtime: "edge",
      _stream: v.table,
      _writes_per_hour: v.count,
      _severity: sev,
    });
    if (!error) recorded++;
  }
  return { detected: seen.size, recorded };
}

async function countdown() {
  const sb = getPrimaryService();
  const { data, error } = await sb.rpc("runtime_authority_countdown" as any);
  if (error) throw error;

  const { data: violations } = await sb
    .from("runtime_direct_write_violations")
    .select("*")
    .is("resolved_at", null)
    .order("estimated_writes_per_hour", { ascending: false })
    .limit(20);

  return { ...data, direct_write_violations: violations || [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const op = String(body?.op || "all");

    if (op === "countdown") return json(await countdown());
    if (op === "promote") return json({ promotions: await autoPromote() });
    if (op === "scan")    return json(await scanViolations());

    // full pass
    const [fb, decay, promotions, scan, cd] = await Promise.all([
      expireStaleFallbacks(),
      decayFallbackCounters(),
      autoPromote(),
      scanViolations(),
      countdown(),
    ]);
    return json({
      ok: true,
      ran_at: new Date().toISOString(),
      fallback_expired: fb,
      fallback_decay: decay,
      promotions,
      violation_scan: scan,
      countdown: cd,
      fallback_ttl_seconds: FALLBACK_TTL_SECONDS,
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});