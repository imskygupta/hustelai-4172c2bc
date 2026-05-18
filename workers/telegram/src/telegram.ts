import { env } from "./env.js";

export type TelegramSendResult =
  | { ok: true; message_id: string }
  | { ok: false; error: string };

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendTelegram(chatId: string, text: string): Promise<TelegramSendResult> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) return { ok: false, error: j?.description || `HTTP ${r.status}` };
    return { ok: true, message_id: String(j.result?.message_id || "") };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function getBotInfo(): Promise<{ username: string } | null> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
    const j: any = await r.json();
    if (!j.ok) return null;
    return { username: j.result.username };
  } catch {
    return null;
  }
}

export function formatAlert(input: {
  kind: string;
  severity: string;
  message: string;
  feature?: string | null;
  user_id?: string | null;
  meta?: Record<string, any> | null;
}): string {
  const icon =
    input.severity === "critical" ? "🚨" :
    input.severity === "error" ? "⚠️" :
    input.severity === "warning" ? "🟡" : "ℹ️";
  const lines = [
    `${icon} <b>${escapeHtml(input.kind)}</b>`,
    escapeHtml(input.message),
    input.feature ? `Feature: <code>${escapeHtml(input.feature)}</code>` : null,
    input.user_id ? `User: <code>${escapeHtml(input.user_id)}</code>` : null,
    input.meta?.context ? `Context: <code>${escapeHtml(String(input.meta.context))}</code>` : null,
    input.meta?.raw ? `Raw: <code>${escapeHtml(String(input.meta.raw).slice(0, 200))}</code>` : null,
  ].filter(Boolean);
  return lines.join("\n");
}