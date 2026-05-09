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
    const { export_id, token_id, delete_file = false } = await req.json().catch(() => ({}));

    if (token_id) {
      // Revoke single token (verify ownership through join)
      const { data: tok } = await sb.from("export_download_tokens").select("id, export_id").eq("id", token_id).maybeSingle();
      if (!tok) return j({ error: "token not found" }, 404);
      const exp = (await sb.from("generated_exports").select("user_id").eq("id", tok.export_id).maybeSingle()).data;
      if (!exp || exp.user_id !== u.user.id) return j({ error: "forbidden" }, 403);
      await sb.from("export_download_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", token_id);
      return j({ ok: true });
    }

    if (export_id) {
      const { data: exp } = await sb.from("generated_exports").select("*").eq("id", export_id).maybeSingle();
      if (!exp || exp.user_id !== u.user.id) return j({ error: "forbidden" }, 403);
      await sb.from("export_download_tokens").update({ revoked_at: new Date().toISOString() }).eq("export_id", export_id);
      await sb.from("generated_exports").update({ status: "revoked" }).eq("id", export_id);
      if (delete_file && exp.storage_path) {
        await sb.storage.from(exp.storage_bucket).remove([exp.storage_path]);
      }
      return j({ ok: true });
    }
    return j({ error: "export_id or token_id required" }, 400);
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}