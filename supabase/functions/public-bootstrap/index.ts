// public-bootstrap — one cached call returning everything the unauthenticated
// shell needs on first paint. Replaces 4 hot PostgREST queries per visitor:
//   1) api_runtime_config       (full table)
//   2) social_links?is_active   (footer)
//   3) unlock_packs?active      (pricing widgets)
//   4) resolve_feature_flags    (RPC, anon)
//
// Returns aggressive cache headers so the CDN + browser serve it for the
// vast majority of visits without ever touching the DB.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const [runtime, social, unlocks, flags] = await Promise.allSettled([
      sb.from("api_runtime_config").select("key,value"),
      sb.from("social_links").select("id,platform,url,icon,display_order").eq("is_active", true).order("display_order"),
      sb.from("unlock_packs").select("*").eq("active", true).order("sort_order"),
      sb.rpc("resolve_feature_flags", { _user: null, _env: "production" }),
    ]);

    const body = {
      runtime_config: runtime.status === "fulfilled" ? (runtime.value.data ?? []) : [],
      social_links: social.status === "fulfilled" ? (social.value.data ?? []) : [],
      unlock_packs: unlocks.status === "fulfilled" ? (unlocks.value.data ?? []) : [],
      flags: flags.status === "fulfilled" ? (flags.value.data ?? {}) : {},
      generated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(body), {
      headers: {
        ...cors,
        "Content-Type": "application/json",
        // 5 min browser cache, 1 hour shared/CDN cache, 1 day stale-while-revalidate.
        // Anonymous payload is identical for every visitor — safe to share aggressively.
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});