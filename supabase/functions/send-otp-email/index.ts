import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, otp, displayName } = await req.json();
    if (!email || !otp) throw new Error("Email and OTP required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    // Load SMTP from email_settings
    let smtpEmail = Deno.env.get("SMTP_CONTACT_EMAIL") || "contact@hustelai.eu.cc";
    let smtpPass = Deno.env.get("SMTP_CONTACT_PASSWORD") || "";

    const { data: setting } = await supabaseAdmin
      .from("email_settings")
      .select("smtp_email, smtp_password, is_active")
      .eq("category", "welcome")
      .single();

    if (setting?.is_active && setting.smtp_email && setting.smtp_password) {
      smtpEmail = setting.smtp_email;
      smtpPass = setting.smtp_password;
    }

    if (!smtpPass) {
      const { data: fallback } = await supabaseAdmin
        .from("email_settings")
        .select("smtp_email, smtp_password, is_active")
        .eq("category", "contact")
        .single();
      if (fallback?.is_active && fallback.smtp_email && fallback.smtp_password) {
        smtpEmail = fallback.smtp_email;
        smtpPass = fallback.smtp_password;
      }
    }

    if (!smtpPass) {
      return new Response(JSON.stringify({ success: false, error: "No SMTP configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new SMTPClient({
      connection: {
        hostname: "cp1.dnspark.in",
        port: 465,
        tls: true,
        auth: { username: smtpEmail, password: smtpPass },
      },
    });

    const name = displayName || email.split("@")[0];

    await client.send({
      from: `HustleAI <${smtpEmail}>`,
      to: email,
      subject: `${otp} - Verify your HustleAI email`,
      content: "auto",
      html: generateOTPHTML(name, otp),
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OTP email error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateOTPHTML(name: string, otp: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">⚡ HustleAI</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Email Verification</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;font-weight:600;">Hey ${name}! 👋</h2>
          <div style="color:#4a4a5a;font-size:15px;line-height:1.7;">
            <p>Use this <strong>6-digit code</strong> to verify your email address:</p>
            <div style="text-align:center;margin:32px 0;">
              <div style="display:inline-block;padding:20px 40px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;letter-spacing:8px;font-size:36px;font-weight:800;color:#ffffff;">${otp}</div>
            </div>
            <p style="text-align:center;color:#999;font-size:13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
            <p style="color:#999;font-size:13px;margin-top:24px;">If you didn't create an account on HustleAI, you can safely ignore this email.</p>
          </div>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f8f9fa;border-top:1px solid #eee;text-align:center;">
          <p style="margin:0;color:#999;font-size:12px;">© 2026 HustleAI. All rights reserved.</p>
          <p style="margin:4px 0 0;color:#999;font-size:11px;">
            <a href="https://hustelai.eu.cc" style="color:#6366f1;text-decoration:none;">hustelai.eu.cc</a> · 
            <a href="mailto:contact@hustelai.eu.cc" style="color:#6366f1;text-decoration:none;">contact@hustelai.eu.cc</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
