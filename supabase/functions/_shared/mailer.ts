// Unified mailer: Brevo (default) + MailerSend (fallback). Renders DB templates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { safeAnalyticsInsert, getBlogs } from "./clients.ts";

// Phase 7C.2: email_logs primary owner is the Blogs DB. Falls back to the
// caller's client during the staged cutover. Sends MUST NOT fail because
// logging failed — every path swallows errors.
async function logEmail(sb: ReturnType<typeof createClient>, row: Record<string, unknown>) {
  try {
    const blogs = getBlogs();
    await blogs.from("email_logs").insert(row as any);
  } catch (_) {
    try { await sb.from("email_logs").insert(row as any); } catch (_) {}
  }
  void safeAnalyticsInsert("email_logs", { ...row, source: "mailer" });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";
const MAILERSEND_API_KEY = Deno.env.get("MAILERSEND_API_KEY") || "";

function render(tpl: string, data: Record<string, any>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(data[k] ?? ""));
}

async function sendBrevo(opts: { to: string; subject: string; html: string; from: string; fromName: string; replyTo?: string }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: opts.from, name: opts.fromName },
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
      replyTo: opts.replyTo ? { email: opts.replyTo } : undefined,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`brevo ${res.status}: ${JSON.stringify(json)}`);
  return { provider: "brevo", id: json.messageId };
}

async function sendMailerSend(opts: { to: string; subject: string; html: string; from: string; fromName: string; replyTo?: string }) {
  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: { Authorization: `Bearer ${MAILERSEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: { email: opts.from, name: opts.fromName },
      to: [{ email: opts.to }],
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo ? { email: opts.replyTo } : undefined,
    }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`mailersend ${res.status}: ${txt}`);
  return { provider: "mailersend", id: res.headers.get("x-message-id") };
}

export async function sendTemplated(opts: {
  to: string;
  templateSlug: string;
  data?: Record<string, any>;
  providerOverride?: "brevo" | "mailersend" | "auto";
}) {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  // Phase 7C.2: email_templates lives on the Blogs DB. Fall back to primary
  // only if Blogs DB secrets are not yet provisioned.
  let blogs: ReturnType<typeof createClient> | null = null;
  try { blogs = getBlogs() as any; } catch { blogs = null; }
  const tplSrc = blogs ?? sb;
  const { data: tpl } = await tplSrc.from("email_templates").select("*").eq("slug", opts.templateSlug).eq("is_active", true).maybeSingle();
  if (!tpl) throw new Error(`template_not_found:${opts.templateSlug}`);
  // mailing_provider_config stays on primary (admin-owned config table).
  const { data: cfg } = await sb.from("mailing_provider_config").select("*").eq("id", 1).maybeSingle();

  const data = opts.data || {};
  const subject = render(tpl.subject, data);
  const html = render(tpl.html, data);
  const from = cfg?.from_email || "noreply@hustlaiapp.in";
  const fromName = cfg?.from_name || "HustleAI";
  const replyTo = cfg?.reply_to || undefined;

  const preferred = opts.providerOverride && opts.providerOverride !== "auto"
    ? opts.providerOverride
    : (tpl.preferred_provider && tpl.preferred_provider !== "auto" ? tpl.preferred_provider : (cfg?.default_provider || "brevo"));
  const fallback = cfg?.fallback_provider || (preferred === "brevo" ? "mailersend" : "brevo");

  const order = [preferred, fallback].filter((v, i, a) => a.indexOf(v) === i);
  let lastErr: any = null;
  for (const provider of order) {
    try {
      if (provider === "brevo" && cfg?.brevo_enabled !== false && BREVO_API_KEY) {
        const r = await sendBrevo({ to: opts.to, subject, html, from, fromName, replyTo });
        await logEmail(sb, { recipient: opts.to, template: tpl.slug, subject, status: "sent", provider_id: r.id, metadata: { provider: "brevo" } });
        return r;
      }
      if (provider === "mailersend" && cfg?.mailersend_enabled !== false && MAILERSEND_API_KEY) {
        const r = await sendMailerSend({ to: opts.to, subject, html, from, fromName, replyTo });
        await logEmail(sb, { recipient: opts.to, template: tpl.slug, subject, status: "sent", provider_id: r.id, metadata: { provider: "mailersend" } });
        return r;
      }
    } catch (e) {
      lastErr = e;
      console.error(`mailer:${provider} failed`, e);
    }
  }
  await logEmail(sb, { recipient: opts.to, template: tpl.slug, subject, status: "failed", error: String(lastErr?.message || lastErr) });
  throw lastErr || new Error("no_provider_available");
}