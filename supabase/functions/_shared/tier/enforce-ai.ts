// Drop-in AI quota enforcer for edge functions.
//
// Usage:
//   const gate = await enforceAIQuota(supabase, userId, "hustlebot", corsHeaders);
//   if (gate) return gate;
//
// Behaviour:
// - If the user has an active BYO key in user_ai_keys → bypass entirely.
// - Otherwise resolve the user's tier-aware ai_quota and call
//   consumeAndCheck(kind="ai") which also mirrors into ai_daily_usage.
// - On cap exceeded, returns a 429 Response with a structured body the
//   frontend understands ({ error: "ai_quota_exceeded", used, max, tier }).
// - On any internal error → returns null (fail-open) so transient infra
//   issues never break paid users. The platform tier limits are still
//   the ultimate ceiling because the underlying counter table is
//   service-role only.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { consumeAndCheck } from "./quota.ts";
import { resolveCapabilities, type Tier } from "./resolveCapabilities.ts";

/** Lazily create a service-role client for quota work. */
function svc(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export async function enforceAIQuota(
  userId: string,
  feature: string,
  cors: Record<string, string>,
  supabase?: SupabaseClient,
): Promise<Response | null> {
  const sb = supabase ?? svc();
  try {
    // BYOK bypass — paying users with their own key skip platform limits.
    const { data: keyRow } = await sb
      .from("user_ai_keys")
      .select("api_key, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (keyRow?.api_key) {
      return null;
    }

    // Tier → ai_quota.
    const { data: prof } = await sb
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", userId)
      .maybeSingle();
    const tier = ((prof as any)?.subscription_tier ?? "free") as Tier;
    const caps = resolveCapabilities(tier);

    const q = await consumeAndCheck(sb, userId, "ai", caps.ai_quota, 1, feature);
    if (q.ok) return null;

    return new Response(
      JSON.stringify({
        error: "ai_quota_exceeded",
        feature,
        used: q.count,
        max: q.limit,
        tier,
        message: `Daily AI limit reached (${q.count}/${q.limit}). Upgrade tier or connect your own AI key in Settings → AI Providers.`,
      }),
      { status: 429, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.warn("[enforceAIQuota] failed:", e instanceof Error ? e.message : String(e));
    // Fail-open to avoid blocking paid users on transient infra issues.
    return null;
  }
}