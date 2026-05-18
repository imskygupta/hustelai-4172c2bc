// runtime-extraction-verify — admin-only proof that real production traffic
// is materially landing in the owned async runtime DB.
//
// GET /runtime-extraction-verify
//   → for each async_runtime.* table returns:
//     { table, rows_1h, rows_24h, rows_total, latest_at, schema_present }
//   → plus per-stream parity using runtime_extraction_metrics on primary
//     (routed_owned/primary/mirror/replay/fail in last hour).
//
// No writes. Read-only. Falls back gracefully when owned DB is not yet
// provisioned so the panel can still render.
import { getOwned, getPrimary, getPrimaryService, ownedReady } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES: Array<{ table: string; ts_col: string; stream: string }> = [
  { table: "notification_deliveries", ts_col: "created_at", stream: "notification_deliveries" },
  { table: "telegram_send_log",       ts_col: "created_at", stream: "telegram_send_log" },
  { table: "admin_alert_history",     ts_col: "created_at", stream: "admin_alert_history" },
  { table: "broadcast_telemetry",     ts_col: "occurred_at",stream: "broadcast_telemetry" },
  { table: "delivery_receipts",       ts_col: "received_at",stream: "delivery_receipts" },
  { table: "queue_archive",           ts_col: "finished_at",stream: "queue_archive" },
  { table: "completed_jobs",          ts_col: "finished_at",stream: "completed_jobs" },
  { table: "replay_history",          ts_col: "replayed_at",stream: "telemetry_replay_queue" },
  { table: "retry_history",           ts_col: "recorded_at",stream: "retry_history" },
  { table: "runtime_health_sweeps",   ts_col: "swept_at",   stream: "runtime_health_sweeps" },
  { table: "incident_history",        ts_col: "opened_at",  stream: "production_incidents" },
];

async function isAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false;
  try {
    const sb = getPrimary(authHeader);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return false;
    const svc = getPrimaryService();
    const { data: role } = await svc.rpc("has_role", { _user_id: user.id, _role: "admin" });
    return role === true;
  } catch (e) {
    console.error("isAdmin error:", (e as Error).message);
    return false;
  }
}

function j(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

async function tableStats(owned: any, table: string, ts_col: string) {
  const since1h = new Date(Date.now() - 60 * 60_000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const sch = owned.schema("async_runtime");
  try {
    const [tot, h1, h24, latest] = await Promise.all([
      sch.from(table).select("*", { count: "exact", head: true }),
      sch.from(table).select("*", { count: "exact", head: true }).gte(ts_col, since1h),
      sch.from(table).select("*", { count: "exact", head: true }).gte(ts_col, since24h),
      sch.from(table).select(ts_col).order(ts_col, { ascending: false }).limit(1),
    ]);
    return {
      table,
      schema_present: !tot.error,
      rows_total: tot.count ?? 0,
      rows_1h: h1.count ?? 0,
      rows_24h: h24.count ?? 0,
      latest_at: (latest.data?.[0] as any)?.[ts_col] ?? null,
      error: tot.error?.message || null,
    };
  } catch (e) {
    return { table, schema_present: false, rows_total: 0, rows_1h: 0, rows_24h: 0, latest_at: null, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!(await isAdmin(req.headers.get("Authorization")))) {
    return j({ error: "admin only" }, 403);
  }

  const ready = ownedReady();
  const owned_db_ready = ready;

  let perTable: any[] = [];
  if (ready) {
    const owned = getOwned();
    perTable = await Promise.all(TABLES.map((t) => tableStats(owned, t.table, t.ts_col)));
  } else {
    perTable = TABLES.map((t) => ({
      table: t.table, schema_present: false, rows_total: 0, rows_1h: 0, rows_24h: 0,
      latest_at: null, error: "OWNED_SUPABASE_* secrets not configured",
    }));
  }

  // Per-stream parity from primary metrics (last hour)
  const since1h = new Date(Date.now() - 60 * 60_000).toISOString();
  const primary = getPrimaryService();
  const { data: metrics } = await primary
    .from("runtime_extraction_metrics")
    .select("stream,routed_primary,routed_owned,routed_mirror,routed_shadow,replayed,failed,writes_avoided")
    .gte("bucket_minute", since1h);

  const parity = new Map<string, any>();
  for (const row of (metrics || []) as any[]) {
    const p = parity.get(row.stream) || {
      stream: row.stream, primary: 0, owned: 0, mirror: 0, shadow: 0, replay: 0, fail: 0, avoided: 0,
    };
    p.primary += row.routed_primary || 0;
    p.owned   += row.routed_owned || 0;
    p.mirror  += row.routed_mirror || 0;
    p.shadow  += row.routed_shadow || 0;
    p.replay  += row.replayed || 0;
    p.fail    += row.failed || 0;
    p.avoided += row.writes_avoided || 0;
    parity.set(row.stream, p);
  }

  // Merge: link each async_runtime table to its stream parity for the panel.
  const merged = TABLES.map((t, i) => {
    const stats = perTable[i];
    const p = parity.get(t.stream) || null;
    let reduction_pct: number | null = null;
    if (p) {
      const total = (p.primary + p.owned);
      reduction_pct = total > 0 ? Math.round((p.owned / total) * 100) : null;
    }
    return {
      table: t.table,
      stream: t.stream,
      owned: stats,
      parity: p,
      primary_write_reduction_pct: reduction_pct,
    };
  });

  return j({
    owned_db_ready,
    generated_at: new Date().toISOString(),
    streams: merged,
  });
});