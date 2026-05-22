import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isFeatureEnabledServer } from "../_shared/flags/resolve.ts";
import { requireVerifiedUser as __requireVerifiedUser } from "../_shared/require-verified.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const __gate = await __requireVerifiedUser(req, { denialEvent: "verification_blocked_ai", fn: "ai-job-enqueue" });
  if (!__gate.ok) return __gate.response;
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("Authorization");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth || "" } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

    if (!(await isFeatureEnabledServer(user.id, "ai_jobs.engine"))) {
      return new Response(JSON.stringify({ error: "ai_jobs disabled" }), { status: 503, headers: cors });
    }

    const body = await req.json();
    const { kind, input = {}, feature, priority = 100, max_attempts = 3, dedupe_key, scheduled_at } = body || {};
    if (!kind) return new Response(JSON.stringify({ error: "kind required" }), { status: 400, headers: cors });

    // Snapshot the creator's verification context onto the job payload.
    // The runner re-checks current status at execute time and aborts if the
    // user has since been suspended, but the snapshot lets us audit drift.
    const trustSnapshot = {
      verification_status: __gate.profile?.verification_status ?? "unknown",
      trust_tier: __gate.trustTier ?? null,
      snapshot_at: new Date().toISOString(),
    };
    const enrichedInput = { ...input, _trust: trustSnapshot };

    const { data, error } = await sb.rpc("enqueue_ai_job", {
      _kind: kind, _input: enrichedInput, _user: user.id, _feature: feature ?? null,
      _priority: priority, _max_attempts: max_attempts,
      _dedupe_key: dedupe_key ?? null,
      _scheduled_at: scheduled_at ?? new Date().toISOString(),
      _source: "client",
    });
    if (error) throw error;
    return new Response(JSON.stringify({ job_id: data }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: cors });
  }
});
