import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function siteOrigin(req: Request) {
  const h = req.headers.get("origin") || req.headers.get("referer") || "";
  try { return new URL(h).origin; } catch { return "https://hustlaiapp.in"; }
}

function randomToken(len = 28) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return j({ error: "unauthorized" }, 401);

    const { artifact_id, expires_in_hours = 24 * 7 } = await req.json().catch(() => ({}));
    if (!artifact_id) return j({ error: "artifact_id required" }, 400);

    const { data: art } = await sb.from("workspace_artifacts")
      .select("id, user_id, share_token, share_expires_at, share_revoked_at")
      .eq("id", artifact_id).maybeSingle();
    if (!art || art.user_id !== u.user.id) return j({ error: "not_found" }, 404);

    const stillValid =
      art.share_token &&
      !art.share_revoked_at &&
      (!art.share_expires_at || new Date(art.share_expires_at) > new Date());

    let token = art.share_token;
    let expires = art.share_expires_at;
    if (!stillValid) {
      token = randomToken(28);
      expires = new Date(Date.now() + Math.max(1, Math.min(24 * 90, expires_in_hours)) * 3600_000).toISOString();
      const { error } = await sb.from("workspace_artifacts").update({
        share_token: token, share_expires_at: expires, share_revoked_at: null,
      }).eq("id", artifact_id);
      if (error) return j({ error: error.message }, 500);
    }

    return j({ ok: true, token, url: `${siteOrigin(req)}/a/${token}`, expires_at: expires });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}