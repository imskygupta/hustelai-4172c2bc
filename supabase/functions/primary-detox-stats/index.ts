// Phase 8A — public read-only stats endpoint for the Primary Detox Status
// admin card. Aggregates the last 24h of `runtime_direct_write_violations`
// from the Admin DB. Public so the admin card can render even before the
// frontend has an admin DB client; no PII, only counts.
import { getAdmin } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = getAdmin();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from("runtime_direct_write_violations")
      .select("table_name, path, reported_at")
      .gte("reported_at", since)
      .order("reported_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    const rows = data ?? [];
    const byTable: Record<string, number> = {};
    const byPath: Record<string, number> = {};
    let realtimeAttempts = 0;
    for (const r of rows) {
      const t = String(r.table_name ?? "unknown");
      byTable[t] = (byTable[t] ?? 0) + 1;
      const p = String(r.path ?? "");
      if (p) byPath[p] = (byPath[p] ?? 0) + 1;
      if (t.startsWith("realtime:")) realtimeAttempts++;
    }
    const hourBuckets: Record<string, number> = {};
    for (const r of rows) {
      const h = String(r.reported_at).slice(0, 13);
      hourBuckets[h] = (hourBuckets[h] ?? 0) + 1;
    }
    const perHour = Object.entries(hourBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count }));
    const violationsPerHour = rows.length / 24;
    return new Response(
      JSON.stringify({
        ok: true,
        window_hours: 24,
        total: rows.length,
        violations_per_hour: Number(violationsPerHour.toFixed(2)),
        realtime_attempts: realtimeAttempts,
        by_table: Object.entries(byTable)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([table, count]) => ({ table, count })),
        by_path: Object.entries(byPath)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([path, count]) => ({ path, count })),
        per_hour: perHour,
        recent: rows.slice(0, 25),
      }),
      { headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }
});