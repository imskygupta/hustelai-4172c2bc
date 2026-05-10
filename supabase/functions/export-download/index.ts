// Public download endpoint. Validates token, OTP, expiry, then redirects to a
// short-lived signed Storage URL. Logs every attempt.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256Hex } from "../_shared/exports/createExport.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const u = new URL(req.url);
  const token = u.searchParams.get("token") || u.pathname.split("/").pop() || "";
  const otp = u.searchParams.get("otp") || "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ua = req.headers.get("user-agent") || "";

  if (!token) return j({ error: "missing token" }, 400);

  const { data: tok } = await sb.from("export_download_tokens").select("*").eq("token", token).maybeSingle();
  if (!tok) return log(sb, null, null, null, ip, ua, "not_found", j({ error: "invalid token" }, 404));
  const exp = (await sb.from("generated_exports").select("*").eq("id", tok.export_id).maybeSingle()).data;
  if (!exp || !exp.storage_path) return log(sb, tok.export_id, tok.id, null, ip, ua, "not_found", j({ error: "file missing" }, 404));
  if (exp.status === "expired" || exp.status === "revoked")
    return log(sb, exp.id, tok.id, null, ip, ua, "expired", j({ error: "export unavailable" }, 410));
  if (tok.revoked_at) return log(sb, exp.id, tok.id, null, ip, ua, "revoked", j({ error: "revoked" }, 410));
  if (new Date(tok.expires_at) < new Date()) return log(sb, exp.id, tok.id, null, ip, ua, "expired", j({ error: "expired" }, 410));
  if (tok.use_count >= tok.max_uses) return log(sb, exp.id, tok.id, null, ip, ua, "expired", j({ error: "link used" }, 410));

  if (tok.requires_otp) {
    if (!otp) return j({ error: "otp_required", otp_required: true }, 401);
    const h = await sha256Hex(otp + token);
    if (h !== tok.otp_hash) return log(sb, exp.id, tok.id, null, ip, ua, "bad_otp", j({ error: "bad otp" }, 401));
  }

  // Public share links are intentionally accessible without auth.
  // Only enforce JWT match when the token was issued as a private link.
  if (tok.user_id && !tok.is_public) {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: who } = await sb.auth.getUser(jwt);
    if (!who?.user || who.user.id !== tok.user_id)
      return log(sb, exp.id, tok.id, who?.user?.id || null, ip, ua, "wrong_user", j({ error: "wrong user" }, 403));
  }

  const signed = await sb.storage.from(exp.storage_bucket).createSignedUrl(exp.storage_path, 60, { download: exp.title });
  if (signed.error || !signed.data?.signedUrl)
    return log(sb, exp.id, tok.id, null, ip, ua, "not_found", j({ error: "could not sign" }, 500));

  await sb.from("export_download_tokens").update({ use_count: tok.use_count + 1 }).eq("id", tok.id);
  await sb.from("export_access_logs").insert({
    export_id: exp.id, token_id: tok.id, user_id: tok.user_id, ip, user_agent: ua, outcome: "ok",
  });

  // Allow JSON response or redirect
  if (u.searchParams.get("redirect") === "1") {
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: signed.data.signedUrl } });
  }
  return j({ ok: true, url: signed.data.signedUrl, title: exp.title, mime_type: exp.mime_type, size_bytes: exp.size_bytes });
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
async function log(sb: any, exportId: string | null, tokId: string | null, userId: string | null, ip: string, ua: string, outcome: string, resp: Response) {
  if (exportId) {
    await sb.from("export_access_logs").insert({ export_id: exportId, token_id: tokId, user_id: userId, ip, user_agent: ua, outcome });
  }
  return resp;
}