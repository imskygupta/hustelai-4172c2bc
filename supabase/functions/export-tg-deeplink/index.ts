// Generates a Telegram deep link that, when tapped, opens the bot
// with /start dl_<token>. Token is short-lived & single-use.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBotInfo } from "../_shared/notifications/telegram.ts";
import { randomToken } from "../_shared/exports/createExport.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("Authorization") || "";
    const { data: u } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!u?.user) return j({ error: "unauthorized" }, 401);

    const { export_id } = await req.json().catch(() => ({}));
    if (!export_id) return j({ error: "export_id required" }, 400);

    const { data: exp } = await sb.from("generated_exports").select("id,user_id,title").eq("id", export_id).maybeSingle();
    if (!exp || exp.user_id !== u.user.id) return j({ error: "not found" }, 404);

    const tok = randomToken(18).replace(/[^a-zA-Z0-9_-]/g, "");
    await sb.from("export_download_tokens").insert({
      export_id: exp.id, token: tok, user_id: exp.user_id,
      expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      max_uses: 1, requires_otp: false,
    });

    const bot = await getBotInfo();
    const username = bot?.username || "HustleAIBot";
    return j({ ok: true, deep_link: `https://t.me/${username}?start=dl_${tok}`, bot_username: username, token: tok });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}