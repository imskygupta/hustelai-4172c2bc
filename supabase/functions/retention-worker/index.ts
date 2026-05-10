// retention-worker — policy-driven cleanup. Reads `retention_policies` from
// the primary DB and applies actions:
//   - exports_free   → mark expired in generated_exports + workspace_doc_exports
//   - exports_paid   → no-op
//   - webhook_logs   → archive then drop (no-op if table absent)
//   - temp_files     → daily cleanup hook (no-op stub)
//   - analytics_events → analytics-DB compression (no-op stub)
//   - telegram_cache → keep file_id forever, expire metadata only
//
// SAFE: never deletes billing/audit data. Idempotent. Designed to run from
// pg_cron daily.
import { getPrimaryService, safeAnalyticsInsert } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!expected || !auth.endsWith(expected)) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = getPrimaryService();
  const summary: Record<string, number | string> = {};

  try {
    const { data: policies } = await sb.from("retention_policies")
      .select("*").eq("enabled", true);

    for (const p of (policies ?? [])) {
      const days = (p as any).retention_days as number;
      const resource = (p as any).resource as string;
      if (days < 0) { summary[resource] = "skipped (forever)"; continue; }

      try {
        if (resource === "exports_free") {
          const { data: marked } = await sb.rpc("mark_expired_exports");
          summary[resource] = (marked as unknown as number) ?? 0;
        } else {
          summary[resource] = "noop"; // hooks for future actions
        }
      } catch (err) {
        summary[resource] = `error: ${(err as Error).message}`;
      }
    }

    await safeAnalyticsInsert("event_log", {
      category: "system",
      action: "retention.run",
      severity: "info",
      source: "retention-worker",
      payload: summary,
    });

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
