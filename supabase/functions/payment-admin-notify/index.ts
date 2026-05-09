// Sends an admin Telegram alert for manual / UPI payment review with inline
// Approve / Reject buttons. Callbacks are handled in telegram-webhook.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const ADMIN_CHAT = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!TG_TOKEN || !ADMIN_CHAT) return j({ ok: false, skipped: "no_admin_chat" });
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { payment_id, user_email, amount, plan, payment_ref, method } = await req.json();
    if (!payment_id) return j({ error: "payment_id required" }, 400);

    const text = [
      `<b>💸 Manual payment review</b>`,
      `User: <code>${escape(user_email || "—")}</code>`,
      `Plan: <b>${escape(plan || "—")}</b>`,
      `Amount: <b>${escape(String(amount || "—"))}</b>`,
      `Method: ${escape(method || "UPI")}`,
      `Ref: <code>${escape(payment_ref || "—")}</code>`,
    ].join("\n");

    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Approve", callback_data: `pay_ok:${payment_id}` },
            { text: "❌ Reject", callback_data: `pay_no:${payment_id}` },
          ]],
        },
      }),
    });
    const jr = await r.json().catch(() => ({}));
    if (!jr?.ok) return j({ ok: false, error: jr?.description });

    await sb.from("notification_events").insert({
      user_id: null,
      category: "payments_admin",
      title: "Manual review queued",
      message: text,
      metadata: { payment_id, telegram_message_id: jr.result?.message_id },
    } as any).catch(() => {});
    return j({ ok: true, message_id: jr.result?.message_id });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function escape(s: string) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }