import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FROM = "HustleAI <noreply@hustlaiapp.in>";
const SUPPORT_FROM = "HustleAI Support <support@hustlaiapp.in>";

type TemplateName =
  | "welcome"
  | "verify-reminder"
  | "password-reset-confirm"
  | "generic";

interface Payload {
  to: string;
  template: TemplateName;
  data?: Record<string, unknown>;
  subject?: string;
  html?: string;
}

function wrap(title: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 30px rgba(15,23,42,.06);">
      <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#10b981,#0ea5e9 60%,#8b5cf6);">
        <div style="color:#fff;font-weight:700;font-size:20px;letter-spacing:-.01em;">⚡ HustleAI</div>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a;">${title}</h1>
        <div style="color:#334155;font-size:14px;line-height:1.65;">${body}</div>
        ${cta ? `<div style="margin-top:24px;"><a href="${cta.href}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;font-weight:600;font-size:14px;">${cta.label}</a></div>` : ""}
      </td></tr>
      <tr><td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px;text-align:center;">
        © 2026 HustleAI · <a href="https://hustlaiapp.in" style="color:#64748b;text-decoration:none;">hustlaiapp.in</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function render(template: TemplateName, data: Record<string, unknown> = {}) {
  const name = (data.name as string) || "Hustler";
  switch (template) {
    case "welcome":
      return {
        subject: "Welcome to HustleAI 🚀",
        html: wrap(
          `Welcome aboard, ${name}!`,
          `<p>Thanks for joining <b>HustleAI</b>. Your AI-powered hustle workspace is ready.</p>
           <p>Quick verify your email to unlock searches, AI tools and the leaderboard.</p>`,
          { label: "Open dashboard →", href: "https://hustlaiapp.in/dashboard" },
        ),
      };
    case "verify-reminder":
      return {
        subject: "Quick — verify your HustleAI email",
        html: wrap(
          "One quick step",
          `<p>Hey ${name}, we just need you to confirm your email so we can unlock searches and AI tools for your account.</p>
           <p>Tap the button to resend the verification link from your dashboard.</p>`,
          { label: "Verify now", href: "https://hustlaiapp.in/dashboard" },
        ),
      };
    case "password-reset-confirm":
      return {
        subject: "Your HustleAI password was changed",
        html: wrap(
          "Password updated",
          `<p>Hi ${name}, your password was just changed. If this wasn't you, reply to this email immediately.</p>`,
        ),
      };
    default:
      return {
        subject: (data.subject as string) || "Notification from HustleAI",
        html: wrap("HustleAI", (data.body as string) || "Hi there 👋"),
      };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const payload = (await req.json()) as Payload;
    if (!payload?.to) throw new Error("Missing 'to'");

    let subject = payload.subject || "HustleAI";
    let html = payload.html || "";
    if (!html) {
      const r = render(payload.template || "generic", payload.data);
      subject = payload.subject || r.subject;
      html = r.html;
    }

    const from = payload.template === "password-reset-confirm" ? SUPPORT_FROM : FROM;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [payload.to], subject, html }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Resend error", resp.status, txt);
      return new Response(JSON.stringify({ success: false, error: txt }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});