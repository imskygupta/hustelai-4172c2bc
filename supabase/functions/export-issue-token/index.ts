import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { randomToken, sha256Hex, siteOrigin } from "../_shared/exports/createExport.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERSISTENT = new Set(["pro", "elite", "infinity"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return json({ error: "unauthorized" }, 401);

    const { export_id, expires_in_minutes = 60, requires_otp = false, max_uses = 1, recipient_user_id = null } =
      await req.json().catch(() => ({}));
    if (!export_id) return json({ error: "export_id required" }, 400);

    const { data: exp } = await sb.from("generated_exports").select("*").eq("id", export_id).maybeSingle();
    if (!exp || exp.user_id !== u.user.id) return json({ error: "not found" }, 404);

    const { data: profile } = await sb.from("profiles").select("subscription_tier").eq("user_id", u.user.id).maybeSingle();
    const tier = (profile?.subscription_tier || "free").toLowerCase();
    const isPersistent = PERSISTENT.has(tier);

    // Tier gates
    const safeMaxUses = isPersistent ? Math.max(1, Math.min(50, max_uses)) : 1;
    const safeRequiresOtp = isPersistent ? !!requires_otp : false;
    const safeMinutes = isPersistent ? Math.max(5, Math.min(60 * 24 * 7, expires_in_minutes)) : 60;

    const token = randomToken(24);
    let otp_hash: string | null = null;
    let otp_clear: string | null = null;
    if (safeRequiresOtp) {
      otp_clear = String(Math.floor(100000 + Math.random() * 900000));
      otp_hash = await sha256Hex(otp_clear + token);
    }

    const { error, data: tokRow } = await sb.from("export_download_tokens").insert({
      export_id, token,
      user_id: recipient_user_id,
      expires_at: new Date(Date.now() + safeMinutes * 60_000).toISOString(),
      max_uses: safeMaxUses,
      requires_otp: safeRequiresOtp,
      otp_hash,
    }).select("*").single();
    if (error) return json({ error: error.message }, 500);

    const url = `${siteOrigin(req)}/d/${token}`;
    return json({ ok: true, token: tokRow.token, url, otp: otp_clear, expires_at: tokRow.expires_at });
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}