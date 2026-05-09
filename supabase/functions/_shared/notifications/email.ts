// Email notification provider — used as fallback when Telegram/Discord fail.
// Uses the unified mailer (Brevo + MailerSend fallback) under the hood.
import type { NotificationProvider, NotificationMessage, DeliveryResult, IntegrationRow } from "./types.ts";
import { sendTemplated } from "../mailer.ts";

function html(msg: NotificationMessage): string {
  const safe = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:14px">
  ${msg.title ? `<h2 style="margin:0 0 12px;font-size:20px;color:#0f172a">${safe(msg.title)}</h2>` : ""}
  <p style="margin:0 0 12px;color:#334155;line-height:1.55">${safe(msg.body || "")}</p>
  ${msg.url ? `<a href="${msg.url}" style="display:inline-block;margin-top:8px;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open</a>` : ""}
  <p style="margin-top:24px;font-size:12px;color:#94a3b8">Sent from HustleAI · You can manage alerts in Settings → Integrations.</p>
</div>`;
}

export const emailProvider: NotificationProvider = {
  id: "email",
  async send(integration: IntegrationRow, msg: NotificationMessage): Promise<DeliveryResult> {
    const to = integration.config?.email || integration.provider_chat_id;
    if (!to) return { ok: false, skipped: true, error: "no email" };
    try {
      const r = await sendTemplated({
        to,
        templateSlug: "generic_notification",
        data: { subject: msg.title || "HustleAI alert", html: html(msg) },
      } as any);
      return { ok: true, external_message_id: String((r as any)?.id || "") };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  },
};

/** Direct fallback that does not require a stored integration row. */
export async function sendEmailFallback(toEmail: string, msg: NotificationMessage): Promise<DeliveryResult> {
  if (!toEmail) return { ok: false, skipped: true, error: "no email" };
  try {
    await sendTemplated({
      to: toEmail,
      templateSlug: "generic_notification",
      data: { subject: msg.title || "HustleAI alert", html: html(msg) },
    } as any);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}