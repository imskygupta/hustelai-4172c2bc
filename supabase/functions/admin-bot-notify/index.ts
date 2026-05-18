// admin-bot-notify — minimal, fire-and-forget Telegram notifier for admin
// observability. Two events for now: signup_started/completed and
// payment_initiated. Never blocks app flow; never throws into caller.
//
// Intentionally NOT coupled to event-dispatcher / notification routes / queues.
// Keep this surface tiny so it cannot affect auth, payments, or middleware.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { dispatchToWorker } from "../_shared/notifications/worker.ts";

// All Telegram delivery now goes through the Railway worker. The "skymedia"
// bot routing is handled there via SKYMEDIA_BOT_TOKEN.
// Permanent owner allowlist still applied so alerts reach the operator even
// if the worker's admin chat list is wiped.
const PERMANENT_ADMIN_CHATS = ["1378192648"];

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

function fmtSignupBlocked(p: Record<string, any>): string {
  return [
    "🚫 <b>Signup blocked</b>",
    `email: <code>${esc(p.email)}</code>`,
    p.reason ? `reason: ${esc(p.reason)}` : "",
    p.source ? `source: ${esc(p.source)}` : "",
    `time: ${esc(p.timestamp || new Date().toISOString())}`,
  ].filter(Boolean).join("\n");
}

function fmtAuthSuspicious(p: Record<string, any>): string {
  return [
    "🛡 <b>Suspicious auth attempt</b>",
    p.email ? `email: <code>${esc(p.email)}</code>` : "",
    p.ip ? `ip: <code>${esc(p.ip)}</code>` : "",
    p.reason ? `reason: ${esc(p.reason)}` : "",
    `time: ${esc(p.timestamp || new Date().toISOString())}`,
  ].filter(Boolean).join("\n");
}

async function sendViaWorker(text: string, event: string): Promise<void> {
  // Default fan-out (no chatId) → worker uses its ADMIN_CHAT_IDS list.
  await dispatchToWorker({
    bot: "skymedia",
    message: text,
    source: `admin-bot-notify:${event}`,
    force_telegram: true,
  });
  // Belt & suspenders: explicit fan-out to permanent owner chat(s).
  await Promise.allSettled(
    PERMANENT_ADMIN_CHATS.map((chatId) =>
      dispatchToWorker({
        bot: "skymedia",
        message: text,
        chatId,
        source: `admin-bot-notify:${event}:owner`,
        force_telegram: true,
        dedupe_key: `bot-notify:${event}:${chatId}:${text.slice(0, 80)}`,
      }),
    ),
  );
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
    else if (event === "signup_blocked") text = fmtSignupBlocked(payload);
    else if (event === "auth_suspicious") text = fmtAuthSuspicious(payload);
    else if (event === "test") text = `✅ <b>HustleAI Ops connected successfully</b>\n${esc(payload.note || "")}`;
    else text = `ℹ️ <b>${esc(event || "unknown")}</b>\n${esc(JSON.stringify(payload).slice(0, 400))}`;
    // background dispatch
    void sendViaWorker(text, event || "unknown");
  } catch {
    // swallow
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});