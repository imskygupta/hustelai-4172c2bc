// Sprint D Phase 8.6 — read-only worker/queue/recon snapshot for admins.
//
// Reads ONLY from ADMIN DB. Returns a compact snapshot for the
// Integrations control center "Runtime" card and the admin diagnostics
// drawer. JWT-gated to authenticated admins (resolveSession.is_admin).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAdmin } from "../_shared/clients.ts";
import { resolveSession } from "../_shared/auth/resolveSession.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-runtime-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const session = await resolveSession(req);
    if (!session.user_id) return j({ error: "unauthorized" }, 401);
    if (!session.is_admin) return j({ error: "forbidden" }, 403);

    const admin = getAdmin();

    const [workersRes, queuesRes, runsRes] = await Promise.allSettled([
      admin.from("v_worker_status").select("*").order("last_seen_at", { ascending: false }).limit(20),
      admin.from("queue_metrics").select("*").order("measured_at", { ascending: false }).limit(30),
      admin.from("delivery_reconciliation_runs").select("*").order("started_at", { ascending: false }).limit(20),
    ]);

    const workers = workersRes.status === "fulfilled" ? (workersRes.value.data ?? []) : [];
    const queueMetrics = queuesRes.status === "fulfilled" ? (queuesRes.value.data ?? []) : [];
    const reconRuns = runsRes.status === "fulfilled" ? (runsRes.value.data ?? []) : [];

    // Latest snapshot per queue
    const latestByQueue: Record<string, any> = {};
    for (const m of queueMetrics) {
      if (!latestByQueue[m.queue_name]) latestByQueue[m.queue_name] = m;
    }

    // Reconciliation success rate over the last 20 runs
    const totalScanned = reconRuns.reduce((a, r) => a + (r.scanned || 0), 0);
    const totalRepaired = reconRuns.reduce((a, r) => a + (r.repaired || 0), 0);
    const totalFailures = reconRuns.reduce((a, r) => a + (r.failures || 0), 0);
    const successRate = totalScanned > 0
      ? Math.round((totalRepaired / Math.max(1, totalRepaired + totalFailures)) * 100)
      : null;

    return j({
      ok: true,
      workers,
      queues: Object.values(latestByQueue),
      reconciliation: {
        runs: reconRuns,
        success_rate_pct: successRate,
        totals: { scanned: totalScanned, repaired: totalRepaired, failures: totalFailures },
        last_run_at: reconRuns[0]?.started_at ?? null,
      },
    });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}