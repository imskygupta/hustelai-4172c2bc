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
    const { email, displayName } = await req.json();
    if (!email) throw new Error("Email required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    let smtpEmail = Deno.env.get("SMTP_CONTACT_EMAIL") || "contact@hustlaiapp.in";
    let smtpPass = Deno.env.get("SMTP_CONTACT_PASSWORD") || "";

    const { data: setting } = await supabaseAdmin
      .from("email_settings")
      .select("smtp_email, smtp_password, is_active")
      .in("category", ["hello", "support", "newsletters"])
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (setting?.smtp_email && setting?.smtp_password) {
      smtpEmail = setting.smtp_email;
      smtpPass = setting.smtp_password;
    }

    if (!smtpPass) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "No SMTP password" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = displayName || email.split("@")[0];
    await sendWithSmtpFallback(smtpEmail, smtpPass, email, "Welcome to HustleAI! 🚀", generateWelcomeHTML(name));

    return new Response(JSON.stringify({ success: true }), {
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
