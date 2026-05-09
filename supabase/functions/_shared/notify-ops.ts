// Fire-and-forget operational alerts to Telegram (primary) + email (fallback).
// MUST never throw — callers should not be impacted by ops alert failures.

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "";
const FALLBACK_EMAIL = Deno.env.get("OPS_FALLBACK_EMAIL") || Deno.env.get("SMTP_SUPPORT_EMAIL") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

export type OpsEvent =
  | "upi_submitted"
  | "upi_approved"
  | "upi_rejected"
  | "dodo_payment_succeeded"
  | "dodo_payment_failed"
  | "webhook_failed"
  | "duplicate_payment_detected"
  | "generic";

const ICONS: Record<OpsEvent, string> = {
  upi_submitted: "🟡",
  upi_approved: "✅",
  upi_rejected: "❌",
  dodo_payment_succeeded: "💳",
  dodo_payment_failed: "⚠️",
  webhook_failed: "🚨",
  duplicate_payment_detected: "🔁",
  generic: "ℹ️",
};

function fmt(event: OpsEvent, p: Record<string, any>): string {
  const lines = [
    `${ICONS[event] || "ℹ️"} <b>${event.replace(/_/g, " ").toUpperCase()}</b>`,
    p.user_email ? `👤 ${p.user_email}` : "",
    p.amount ? `💰 ₹${p.amount} ${p.currency || ""}`.trim() : "",
    p.plan ? `📦 ${p.plan}` : "",
    p.payment_id ? `🆔 <code>${p.payment_id}</code>` : "",
    p.note ? `📝 ${p.note}` : "",
    `🕒 ${new Date().toISOString()}`,
    p.review_url ? `🔗 ${p.review_url}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function notifyOps(event: OpsEvent, payload: Record<string, any> = {}): Promise<void> {
  // fire-and-forget: schedule but do not await
  const task = (async () => {
    try {
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_CHAT_ID) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_ADMIN_CHAT_ID,
            text: fmt(event, payload),
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        }).catch(() => {});
        return;
      }
      // Fallback: Resend email if available
      if (RESEND_API_KEY && FALLBACK_EMAIL) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ops@hustlaiapp.in",
            to: [FALLBACK_EMAIL],
            subject: `[Ops] ${event}`,
            text: fmt(event, payload).replace(/<[^>]+>/g, ""),
          }),
        }).catch(() => {});
      }
    } catch {
      // swallow — never break caller
    }
  })();
  // Resolve immediately; the task runs in background
  void task;
  return Promise.resolve();
}