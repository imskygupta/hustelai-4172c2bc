// Universal Delivery Layer — delivery-telegram (text)
// Sends a Deliver payload as a Telegram message to the user's own connected
// chat, then records a 'telegram_sent' delivery row on DB2.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordDelivery } from "../delivery-record/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

function esc(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "unauthenticated" }, 401);
    if (!TG_TOKEN) return j({ error: "telegram_not_configured" }, 500);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return j({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const text: string = String(body?.text || "").slice(0, 3500);
    const title: string = String(body?.title || "").slice(0, 200);
    const toolSlug: string = String(body?.tool_slug || "unknown");
    if (!text) return j({ error: "text required" }, 400);

    // Service-role client to read notification_integrations
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: integ } = await svc.from("notification_integrations")
      .select("provider_chat_id")
      .eq("user_id", user.id).eq("provider", "telegram").eq("status", "connected")
      .maybeSingle();
    if (!integ?.provider_chat_id) return j({ error: "telegram_not_connected" }, 412);

    const message = [
      title ? `<b>${esc(title)}</b>` : null,
      esc(text),
      `\n<i>via HustleAI · ${esc(toolSlug)}</i>`,
    ].filter(Boolean).join("\n");

    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: integ.provider_chat_id,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const jr = await r.json().catch(() => ({}));
    if (!jr?.ok) return j({ error: `telegram: ${jr?.description || r.status}` }, 502);

    const rec = await recordDelivery({
      user_id: user.id,
      tool_slug: toolSlug,
      channel: "telegram_sent",
      content_title: title,
      content_preview: text,
      ref_kind: "text",
      client: body?.client || null,
    });

    return j({ ok: true, message_id: jr.result?.message_id, ...rec });
  } catch (e) {
    return j({ error: String((e as Error)?.message || e) }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}