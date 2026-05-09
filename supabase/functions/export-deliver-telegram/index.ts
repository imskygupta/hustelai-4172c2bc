import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTelegram } from "../_shared/notifications/telegram.ts";
import { randomToken, siteOrigin } from "../_shared/exports/createExport.ts";

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const FIFTY_MB = 50 * 1024 * 1024;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { export_id } = await req.json().catch(() => ({}));
    if (!export_id) return j({ error: "export_id required" }, 400);
    const { data: exp } = await sb.from("generated_exports").select("*").eq("id", export_id).maybeSingle();
    if (!exp || !exp.storage_path) return j({ error: "not found" }, 404);

    const { data: integ } = await sb.from("notification_integrations")
      .select("*").eq("user_id", exp.user_id).eq("provider", "telegram").eq("status", "connected").maybeSingle();
    if (!integ?.provider_chat_id) return j({ ok: false, reason: "no_telegram" });

    // Always issue a fresh single-use share token
    const tok = randomToken(24);
    await sb.from("export_download_tokens").insert({
      export_id: exp.id, token: tok, user_id: exp.user_id,
      expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
      max_uses: 5, requires_otp: false,
    });
    const link = `${siteOrigin(req)}/d/${tok}`;

    let messageId: string | null = null;
    if (TG_TOKEN && exp.size_bytes > 0 && exp.size_bytes < FIFTY_MB) {
      try {
        const signed = await sb.storage.from(exp.storage_bucket).createSignedUrl(exp.storage_path, 60 * 5, { download: exp.title });
        const url = signed.data?.signedUrl;
        if (url) {
          const fileResp = await fetch(url);
          const blob = await fileResp.blob();
          const fd = new FormData();
          fd.append("chat_id", integ.provider_chat_id);
          fd.append("caption", `<b>${escape(exp.title)}</b>\n${escape(exp.export_type)}\n🔗 ${link}`);
          fd.append("parse_mode", "HTML");
          fd.append("document", blob, exp.title);
          const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendDocument`, { method: "POST", body: fd });
          const jr = await r.json().catch(() => ({}));
          if (jr?.ok) messageId = String(jr.result?.message_id || "");
        }
      } catch (_e) { /* fall through to link-only */ }
    }
    if (!messageId) {
      const r = await sendTelegram(integ.provider_chat_id, {
        title: `📦 ${exp.title}`,
        body: `Your ${exp.export_type} is ready.`,
        url: link,
      });
      messageId = r.external_message_id || null;
    }

    await sb.from("generated_exports").update({
      status: "delivered",
      telegram_chat_id: integ.provider_chat_id,
      telegram_message_id: messageId,
      delivered_at: new Date().toISOString(),
    }).eq("id", exp.id);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function escape(s: string) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }