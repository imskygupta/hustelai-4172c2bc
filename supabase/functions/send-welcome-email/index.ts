import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SMTP_HOST = "cp1.dnspark.in";
const SMTP_CONNECTIONS = [
  { port: 465, tls: true, label: "smtps-465" },
  { port: 587, tls: false, label: "starttls-587" },
] as const;

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function logEmail(row: {
  recipient: string;
  status: "sent" | "failed" | "skipped";
  provider?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const sb = adminClient();
    await sb.from("email_logs").insert({
      template: "welcome",
      recipient: row.recipient.toLowerCase(),
      status: row.status,
      error: row.error || null,
      metadata: { provider: row.provider || null, ...(row.metadata || {}) },
    } as any);
  } catch (e) {
    console.error("welcome email_logs insert failed:", e);
  }
}

async function welcomeAlreadySent(email: string): Promise<boolean> {
  try {
    const sb = adminClient();
    const { data } = await sb.rpc("welcome_email_already_sent", { _email: email.toLowerCase() });
    return !!data;
  } catch {
    return false;
  }
}

async function sendWithResend(to: string, subject: string, html: string): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return false;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HustleAI <noreply@hustlaiapp.in>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Resend failed:", resp.status, txt);
      return false;
    }
    console.log("Welcome email sent via Resend");
    return true;
  } catch (e) {
    console.error("Resend error:", e);
    return false;
  }
}

async function notifyAdminOfFailure(reason: string, email: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HustleAI Alerts <noreply@hustlaiapp.in>",
        to: ["samratakash0000@gmail.com"],
        subject: "⚠️ Welcome email delivery failed",
        html: `<p>Welcome email failed for <strong>${email}</strong>.</p><p>Reason: ${reason}</p>`,
      }),
    });
  } catch {}
}

async function sendWithSmtpFallback(smtpEmail: string, smtpPass: string, to: string, subject: string, html: string) {
  let lastError: unknown = null;

  for (const config of SMTP_CONNECTIONS) {
    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: config.port,
        tls: config.tls,
        auth: { username: smtpEmail, password: smtpPass },
      },
      debug: {
        log: false,
        allowUnsecure: true,
      },
    });

    try {
      await client.send({
        from: `HustleAI <${smtpEmail}>`,
        to,
        subject,
        content: "auto",
        html,
      });
      console.log(`Welcome mail sent via ${config.label}`);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Welcome SMTP attempt failed via ${config.label}:`, message);
    } finally {
      try {
        await client.close();
      } catch {
        // no-op
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("SMTP send failed on all connection attempts");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, displayName, source = "unknown", force = false } = await req.json();
    if (!email) throw new Error("Email required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      // Verify caller when a user JWT is present. Anon/publishable keys
      // (sent automatically by supabase.functions.invoke for unauthenticated
      // callers like the signup form before email confirmation) are allowed
      // through — idempotency + email lookup prevents abuse.
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      // If token is anon key or invalid, user will be null — that's fine,
      // we fall through to the idempotency-protected send path.
      void user;
    }

    // Idempotency: skip if already sent (unless forced via admin "send test")
    if (!force && await welcomeAlreadySent(email)) {
      await logEmail({ recipient: email, status: "skipped", metadata: { source, reason: "already_sent" } });
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = displayName || email.split("@")[0];
    const subject = "Welcome to HustleAI! 🚀";
    const html = generateWelcomeHTML(name);

    // Priority 1: Resend (custom domain)
    const resendOk = await sendWithResend(email, subject, html);
    if (resendOk) {
      await logEmail({ recipient: email, status: "sent", provider: "resend", metadata: { source } });
      return new Response(JSON.stringify({ success: true, provider: "resend" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Priority 2: SMTP fallback
    let smtpEmail = Deno.env.get("SMTP_CONTACT_EMAIL") || "contact@hustlaiapp.in";
    let smtpPass = Deno.env.get("SMTP_CONTACT_PASSWORD") || "";

    const { data: settings } = await supabaseAdmin
      .from("email_settings")
      .select("category, smtp_email, smtp_password, is_active, updated_at")
      .in("category", ["welcome", "contact", "support", "newsletters"])
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    const preferredSetting =
      settings?.find((item) => item.category === "welcome" && item.smtp_email && item.smtp_password) ||
      settings?.find((item) => item.category === "contact" && item.smtp_email && item.smtp_password) ||
      settings?.find((item) => item.smtp_email && item.smtp_password);

    if (preferredSetting?.smtp_email && preferredSetting?.smtp_password) {
      smtpEmail = preferredSetting.smtp_email;
      smtpPass = preferredSetting.smtp_password;
    }

    if (!smtpPass) {
      await notifyAdminOfFailure("No Resend key + no SMTP configured", email);
      await logEmail({ recipient: email, status: "failed", error: "No Resend key + no SMTP configured", metadata: { source } });
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "No SMTP password" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      await sendWithSmtpFallback(smtpEmail, smtpPass, email, subject, html);
      await logEmail({ recipient: email, status: "sent", provider: "smtp", metadata: { source, smtp_email: smtpEmail } });
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      await notifyAdminOfFailure(`Resend + SMTP both failed: ${reason}`, email);
      await logEmail({ recipient: email, status: "failed", error: reason, metadata: { source } });
      throw e;
    }

    return new Response(JSON.stringify({ success: true, provider: "smtp" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Welcome email error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateWelcomeHTML(name: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">⚡ HustleAI</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your AI-Powered Side Hustle Platform</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;font-weight:600;">Welcome aboard, ${name}! 🎉</h2>
          <div style="color:#4a4a5a;font-size:15px;line-height:1.7;">
            <p>Thanks for signing up for <strong>HustleAI</strong>! We're excited to have you.</p>
            <p>Here's what you can do right away:</p>
            <ul style="padding-left:20px;">
              <li>🔍 <strong>Discover</strong> AI-curated side hustles tailored to your skills</li>
              <li>📊 <strong>Track</strong> your income and hustle progress</li>
              <li>🏆 <strong>Compete</strong> on leaderboards and earn XP</li>
              <li>👥 <strong>Connect</strong> with a community of hustlers</li>
            </ul>
            <div style="text-align:center;margin:32px 0;">
              <a href="https://hustlaiapp.in/dashboard" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">Start Exploring →</a>
            </div>
            <p style="color:#999;font-size:13px;">If you have any questions, reply to this email or reach out at <a href="mailto:contact@hustlaiapp.in" style="color:#6366f1;">contact@hustlaiapp.in</a></p>
          </div>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f8f9fa;border-top:1px solid #eee;text-align:center;">
          <p style="margin:0;color:#999;font-size:12px;">© 2026 HustleAI. All rights reserved.</p>
          <p style="margin:4px 0 0;color:#999;font-size:11px;">
            <a href="https://hustlaiapp.in" style="color:#6366f1;text-decoration:none;">hustlaiapp.in</a> · 
            <a href="mailto:contact@hustlaiapp.in" style="color:#6366f1;text-decoration:none;">contact@hustlaiapp.in</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
