// ops-config-read — returns merged operational config snapshot for workers.
// Auth: X-Worker-Secret header (shared with TELEGRAM_WORKER_SECRET).
// Workers poll this every ~60s and fall back to env on failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const secret = req.headers.get("x-worker-secret") || "";
    const expected = Deno.env.get("TELEGRAM_WORKER_SECRET") || "";
    if (!expected || secret !== expected) return j({ error: "unauthorized" }, 401);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [recipients, flags, runtime] = await Promise.all([
      sb.from("ops_telegram_recipients")
        .select("bot,chat_id,label,role,routing_role,severity_min,enabled,muted_until,deprecated")
        .eq("enabled", true).eq("deprecated", false),
      sb.from("infra_feature_flags").select("flag_key,enabled,maintenance,message,environments,rollout_pct"),
      sb.from("infra_runtime_config").select("key,value,scope"),
    ]);

    const now = Date.now();
    const liveRecipients = (recipients.data || []).filter(
      (r: any) => !r.muted_until || new Date(r.muted_until).getTime() < now,
    );

    return j({
      ok: true,
      generated_at: new Date().toISOString(),
      recipients: liveRecipients,
      flags: flags.data || [],
      runtime_config: runtime.data || [],
      ttl_seconds: 60,
    });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}