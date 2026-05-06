// Centralized HustleAI Workspace OS email sender (Resend)
// Supports transactional templates + ad-hoc HTML.
// Logs every send to public.email_logs.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SENDERS: Record<string, string> = {
  noreply: "HustleAI Workspace OS <noreply@hustlaiapp.in>",
  support: "HustleAI Support <support@hustlaiapp.in>",
  hello: "HustleAI <hello@hustlaiapp.in>",
  billing: "HustleAI Billing <billing@hustlaiapp.in>",
  connect: "HustleAI <connect@hustlaiapp.in>",
};

type Template =
  | "welcome"
  | "magic-link"
  | "password-reset"
  | "workspace-created"
  | "invoice-created"
  | "agreement-approved"
  | "payment-overdue"
  | "client-invite"
  | "subscription-updated"
  | "community-invite"
  | "broadcast"
  | "generic";

interface Payload {
  to: string | string[];
  template: Template;
  data?: Record<string, any>;
  subject?: string;
  html?: string;
  from?: keyof typeof SENDERS;
  user_id?: string;
  campaign_id?: string;
  bypass_prefs?: boolean;
}

function shell(title: string, body: string, cta?: { label: string; href: string }, preheader = "") {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8eaf0;">
    <tr><td style="padding:24px 32px;border-bottom:1px solid #f0f1f5;">
      <div style="font-weight:700;font-size:15px;letter-spacing:-.01em;color:#0f172a;">HustleAI <span style="color:#10b981;">Workspace OS</span></div>
    </td></tr>
    <tr><td style="padding:36px 32px 8px;">
      <h1 style="margin:0 0 14px;font-size:22px;font-weight:600;letter-spacing:-.02em;color:#0f172a;">${title}</h1>
      <div style="color:#475569;font-size:14.5px;line-height:1.65;">${body}</div>
      ${cta ? `<div style="margin:28px 0 8px;"><a href="${cta.href}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">${cta.label}</a></div>` : ""}
    </td></tr>
    <tr><td style="padding:24px 32px 32px;">
      <hr style="border:none;border-top:1px solid #eef0f4;margin:0 0 16px;">
      <div style="color:#94a3b8;font-size:12px;line-height:1.6;">
        You received this because you have an account on HustleAI Workspace OS.<br>
        Manage notifications in your <a href="https://hustlaiapp.in/settings/notifications" style="color:#64748b;">notification settings</a>.
      </div>
    </td></tr>
  </table>
  <div style="color:#94a3b8;font-size:11px;margin-top:14px;">© 2026 HustleAI Workspace OS · hustlaiapp.in</div>
</td></tr></table></body></html>`;
}

function render(template: Template, data: Record<string, any> = {}) {
  const name = data.name || "there";
  const url = (p: string) => `https://hustlaiapp.in${p}`;
  switch (template) {
    case "welcome":
      return { subject: "Welcome to HustleAI Workspace OS",
        html: shell(`Welcome, ${name}.`,
          `<p>Your workspace is ready. HustleAI Workspace OS helps you manage clients, projects, invoices and approvals — in one calm operating layer.</p><p>Start by creating your first workspace.</p>`,
          { label: "Open Workspaces", href: url("/workspaces") },
          "Your operating layer for client work.") };
    case "magic-link":
      return { subject: "Your sign-in link",
        html: shell("Sign in to HustleAI",
          `<p>Click the secure link below to sign in. This link expires in 10 minutes.</p>`,
          { label: "Sign in", href: data.link || url("/login") }) };
    case "password-reset":
      return { subject: "Reset your password",
        html: shell("Reset your password",
          `<p>We received a request to reset your password. If this wasn't you, ignore this email.</p>`,
          { label: "Reset password", href: data.link || url("/reset-password") }) };
    case "workspace-created":
      return { subject: `Workspace "${data.workspace_name || "New"}" created`,
        html: shell("Workspace ready",
          `<p>Your workspace <b>${data.workspace_name || ""}</b> is live. Add your first client, generate a quotation, or invite a collaborator.</p>`,
          { label: "Open workspace", href: url(`/workspaces/${data.workspace_id || ""}`) }) };
    case "invoice-created":
      return { subject: `Invoice ${data.invoice_number || ""} sent`,
        html: shell("Invoice issued",
          `<p>Invoice <b>${data.invoice_number || ""}</b> for <b>${data.amount || ""}</b> has been issued to <b>${data.client_name || "your client"}</b>.</p>`,
          { label: "View invoice", href: url(`/workspaces/${data.workspace_id || ""}`) }) };
    case "agreement-approved":
      return { subject: "Agreement approved",
        html: shell("Agreement approved",
          `<p><b>${data.client_name || "Your client"}</b> approved the agreement for <b>${data.workspace_name || ""}</b>.</p>`,
          { label: "Open workspace", href: url(`/workspaces/${data.workspace_id || ""}`) }) };
    case "payment-overdue":
      return { subject: `Payment overdue — Invoice ${data.invoice_number || ""}`,
        html: shell("Payment overdue",
          `<p>Invoice <b>${data.invoice_number || ""}</b> for <b>${data.client_name || "your client"}</b> is past due. Send a polite reminder from your workspace.</p>`,
          { label: "Send reminder", href: url(`/workspaces/${data.workspace_id || ""}`) }) };
    case "client-invite":
      return { subject: `${data.from_name || "Your collaborator"} invited you to a project`,
        html: shell("You've been invited",
          `<p><b>${data.from_name || "Your collaborator"}</b> invited you to view <b>${data.workspace_name || "a project"}</b> on HustleAI Workspace OS.</p>`,
          { label: "Open client portal", href: data.link || url("/") }) };
    case "subscription-updated":
      return { subject: "Subscription updated",
        html: shell("Subscription updated",
          `<p>Your plan is now <b>${data.tier || "updated"}</b>. Thanks for supporting HustleAI Workspace OS.</p>`,
          { label: "View billing", href: url("/settings/billing") }) };
    case "community-invite":
      return { subject: "Join the HustleAI community",
        html: shell("You're invited",
          `<p>Connect with other freelancers, agencies and operators inside the HustleAI community.</p>`,
          { label: "Join now", href: url("/community") }) };
    case "broadcast":
      return { subject: data.subject || "Update from HustleAI",
        html: shell(data.title || "An update from HustleAI", data.body_html || data.body || "") };
    default:
      return { subject: data.subject || "HustleAI", html: shell(data.title || "HustleAI", data.body_html || data.body || "") };
  }
}

async function logEmail(sb: any, row: any) {
  try { await sb.from("email_logs").insert(row); } catch (_) {}
}

function prefKeyFor(template: Template): string | null {
  switch (template) {
    case "invoice-created":
    case "payment-overdue": return "invoice_reminders";
    case "workspace-created":
    case "agreement-approved": return "workspace_updates";
    case "client-invite": return "collaboration_alerts";
    case "community-invite": return "community_notifications";
    case "subscription-updated": return "payment_alerts";
    case "broadcast": return "product_announcements";
    case "welcome":
    case "magic-link":
    case "password-reset": return null; // critical — always send
    default: return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body: Payload = await req.json();
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const recipients = Array.isArray(body.to) ? body.to : [body.to];
    const fromAddr = SENDERS[body.from || "noreply"] || SENDERS.noreply;
    const rendered = body.html
      ? { subject: body.subject || "HustleAI", html: body.html }
      : render(body.template, body.data || {});

    const results = [];
    for (const to of recipients) {
      // notification prefs check
      if (!body.bypass_prefs) {
        const key = prefKeyFor(body.template);
        if (key) {
          const { data: prof } = await sb.from("profiles").select("user_id").eq("email", to).maybeSingle();
          if (prof?.user_id) {
            const { data: pref } = await sb.from("notification_preferences").select("email_enabled," + key).eq("user_id", prof.user_id).maybeSingle();
            if (pref && (pref.email_enabled === false || (pref as any)[key] === false)) {
              await logEmail(sb, { recipient: to, template: body.template, subject: rendered.subject, status: "skipped", user_id: body.user_id, campaign_id: body.campaign_id, error: "user_pref_off" });
              results.push({ to, status: "skipped" });
              continue;
            }
          }
        }
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromAddr, to, subject: rendered.subject, html: rendered.html }),
      });
      const json = await res.json().catch(() => ({}));
      const ok = res.ok;
      await logEmail(sb, {
        recipient: to,
        template: body.template,
        subject: rendered.subject,
        status: ok ? "sent" : "failed",
        provider_id: json?.id || null,
        error: ok ? null : (json?.message || `HTTP ${res.status}`),
        user_id: body.user_id || null,
        campaign_id: body.campaign_id || null,
        metadata: { from: fromAddr },
      });
      results.push({ to, status: ok ? "sent" : "failed", id: json?.id, error: ok ? null : json });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});