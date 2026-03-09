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
    const { action, subject, body, recipients, from_account, category } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Unauthorized");
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) throw new Error("Not admin");

    // Determine SMTP credentials
    let smtpEmail = Deno.env.get("SMTP_CONTACT_EMAIL") || "contact@hustelai.eu.cc";
    let smtpPass = Deno.env.get("SMTP_CONTACT_PASSWORD") || "";

    // Try to load from email_settings table if category provided
    if (category || from_account) {
      const cat = category || (from_account === "support" ? "support" : "newsletters");
      const { data: setting } = await supabaseAdmin
        .from("email_settings")
        .select("smtp_email, smtp_password, is_active")
        .eq("category", cat)
        .single();

      if (setting && setting.is_active && setting.smtp_email && setting.smtp_password) {
        smtpEmail = setting.smtp_email;
        smtpPass = setting.smtp_password;
      } else if (from_account === "support") {
        smtpEmail = Deno.env.get("SMTP_SUPPORT_EMAIL") || smtpEmail;
        smtpPass = Deno.env.get("SMTP_SUPPORT_PASSWORD") || smtpPass;
      }
    }

    const client = new SMTPClient({
      connection: {
        hostname: "mail.hustelai.eu.cc",
        port: 465,
        tls: true,
        auth: { username: smtpEmail, password: smtpPass },
      },
    });

    if (action === "send_newsletter") {
      const { data: subs } = await supabaseAdmin.from("newsletter_subscribers").select("email");
      const allRecipients = subs?.map((s: any) => s.email) || [];
      if (allRecipients.length === 0) throw new Error("No subscribers found");

      const batchSize = 20;
      let sent = 0;
      for (let i = 0; i < allRecipients.length; i += batchSize) {
        const batch = allRecipients.slice(i, i + batchSize);
        for (const email of batch) {
          try {
            await client.send({
              from: `HustleAI <${smtpEmail}>`,
              to: email,
              subject: subject || "HustleAI Newsletter",
              content: "auto",
              html: generateEmailHTML(subject, body),
            });
            sent++;
          } catch (e) {
            console.error(`Failed to send to ${email}:`, e.message);
          }
        }
      }

      await client.close();
      return new Response(JSON.stringify({ success: true, sent, total: allRecipients.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_bulk") {
      if (!recipients || recipients.length === 0) throw new Error("No recipients");
      let sent = 0;
      for (const email of recipients) {
        try {
          await client.send({
            from: `HustleAI <${smtpEmail}>`,
            to: email,
            subject: subject || "Message from HustleAI",
            content: "auto",
            html: generateEmailHTML(subject, body),
          });
          sent++;
        } catch (e) {
          console.error(`Failed to send to ${email}:`, e.message);
        }
      }
      await client.close();
      return new Response(JSON.stringify({ success: true, sent, total: recipients.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateEmailHTML(subject: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">⚡ HustleAI</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your AI-Powered Side Hustle Platform</p>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;font-weight:600;">${subject || 'HustleAI Update'}</h2>
          <div style="color:#4a4a5a;font-size:15px;line-height:1.7;">${body || ''}</div>
        </td></tr>
        <!-- Footer -->
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
