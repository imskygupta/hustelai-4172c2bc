import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return j({ error: "unauthorized" }, 401);
    const { artifact_id } = await req.json().catch(() => ({}));
    if (!artifact_id) return j({ error: "artifact_id required" }, 400);

    const { data: art } = await sb.from("workspace_artifacts")
      .select("id, user_id").eq("id", artifact_id).maybeSingle();
    if (!art || art.user_id !== u.user.id) return j({ error: "not_found" }, 404);

    await sb.from("workspace_artifacts").update({
      share_revoked_at: new Date().toISOString(),
    }).eq("id", artifact_id);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}