// Telegram provider. Supports both admin ops alerts (via TELEGRAM_ADMIN_CHAT_ID)
// and per-user notifications (via integration.provider_chat_id).
import type { NotificationProvider, NotificationMessage, DeliveryResult, IntegrationRow } from "./types.ts";

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

function fmt(msg: NotificationMessage): string {
  const lines: string[] = [];
  if (msg.title) lines.push(`<b>${escape(msg.title)}</b>`);
  if (msg.body) lines.push(escape(msg.body));
  if (msg.url) lines.push(`🔗 ${msg.url}`);
  return lines.join("\n");
}
function escape(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendTelegram(chatId: string, msg: NotificationMessage): Promise<DeliveryResult> {
  if (!TG_TOKEN) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };
  if (!chatId) return { ok: false, error: "no chat_id" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: fmt(msg),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) return { ok: false, error: j.description || `HTTP ${r.status}` };
    return { ok: true, external_message_id: String(j.result?.message_id || "") };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function getBotInfo(): Promise<{ username: string; first_name: string } | null> {
  if (!TG_TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getMe`);
    const j = await r.json();
    if (!j.ok) return null;
    return { username: j.result.username, first_name: j.result.first_name };
  } catch { return null; }
}

export const telegramProvider: NotificationProvider = {
  id: "telegram",
  async send(integration: IntegrationRow, msg: NotificationMessage) {
    if (!integration.provider_chat_id) return { ok: false, skipped: true, error: "no chat_id" };
    return sendTelegram(integration.provider_chat_id, msg);
  },
  async verify(integration: IntegrationRow) {
    if (!integration.provider_chat_id) return { ok: false, error: "not connected" };
    return sendTelegram(integration.provider_chat_id, {
      title: "✅ Connection verified",
      body: "Your HustleAI account is now linked to Telegram. You'll receive real-time alerts here.",
    });
  },
};