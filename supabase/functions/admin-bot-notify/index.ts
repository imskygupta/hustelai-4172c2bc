// admin-bot-notify — minimal, fire-and-forget Telegram notifier for admin
// observability. Two events for now: signup_started/completed and
// payment_initiated. Never blocks app flow; never throws into caller.
//
// Intentionally NOT coupled to event-dispatcher / notification routes / queues.
// Keep this surface tiny so it cannot affect auth, payments, or middleware.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Use the SkyMedia admin bot (@theskymediabot) for ops notifications.
// Falls back to the user-facing bot only if the admin token is missing.
const TG_TOKEN = Deno.env.get("SKYMEDIA_BOT_TOKEN") || Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TG_CHATS = (Deno.env.get("TELEGRAM_ADMIN_CHAT_IDS") || Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "")
  .split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtSignup(p: Record<string, any>): string {
  return [
    "🆕 <b>New signup</b>",
    `email: <code>${esc(p.email)}</code>`,
    p.name ? `name: ${esc(p.name)}` : "",
    p.source ? `source: ${esc(p.source)}` : "",
    `time: ${esc(p.timestamp || new Date().toISOString())}`,
  ].filter(Boolean).join("\n");
}

function fmtPayment(p: Record<string, any>): string {
  return [
    "💳 <b>Payment initiated</b>",
    `email: <code>${esc(p.email || "—")}</code>`,
    p.plan ? `plan: ${esc(p.plan)}` : "",
    p.amount ? `amount: ₹${esc(p.amount)}` : "",
    p.kind ? `kind: ${esc(p.kind)}` : "",
    `time: ${esc(p.timestamp || new Date().toISOString())}`,
  ].filter(Boolean).join("\n");
}

async function sendTelegram(text: string): Promise<void> {
  if (!TG_TOKEN || TG_CHATS.length === 0) return;
  await Promise.allSettled(TG_CHATS.map(chat_id =>
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text, parse_mode: "HTML", disable_web_page_preview: true }),
    }).catch(() => undefined)
  ));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // Always 200 — caller is fire-and-forget and must never see an error here.
  try {
    const body = await req.json().catch(() => ({} as any));
    const event = String(body?.event || "").trim();
    const payload = (body?.payload && typeof body.payload === "object") ? body.payload : {};
    let text = "";
    if (event === "signup") text = fmtSignup(payload);
    else if (event === "payment_initiated") text = fmtPayment(payload);
    else text = `ℹ️ <b>${esc(event || "unknown")}</b>\n${esc(JSON.stringify(payload).slice(0, 400))}`;
    // background dispatch
    void sendTelegram(text);
  } catch {
    // swallow
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});