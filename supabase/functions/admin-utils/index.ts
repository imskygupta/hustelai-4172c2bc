import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, user_id, email, password, subject, body, recipients, category } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // For bootstrap_admin, skip auth check (one-time setup)
    if (action === "bootstrap_admin") {
      const targetEmail = email || "support@skycart.xyz";
      const targetPassword = password || "Akash@123";
      
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      let found = users?.find(u => u.email === targetEmail);
      
      if (!found) {
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: targetEmail,
          password: targetPassword,
          email_confirm: true,
        });
        if (createErr) throw createErr;
        found = newUser.user;
      } else {
        await supabaseAdmin.auth.admin.updateUserById(found.id, { password: targetPassword });
      }
      
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: found!.id, role: "admin" },
        { onConflict: "user_id,role" }
      );
      
      await supabaseAdmin.from("profiles").update({ subscription_tier: "infinity" }).eq("user_id", found!.id);
      
      return new Response(JSON.stringify({ success: true, user_id: found!.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin for other actions
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) throw new Error("Not admin");

    // ===== SET PASSWORD =====
    if (action === "set_password") {
      let targetId = user_id;
      if (!targetId && email) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const found = users?.find(u => u.email === email);
        if (!found) throw new Error("User not found");
        targetId = found.id;
      }
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, { password });
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== DELETE USER =====
    if (action === "delete_user") {
      if (!user_id) throw new Error("user_id required");
      
      // Don't allow deleting self
      if (user_id === caller.id) throw new Error("Cannot delete your own account");
      
      // Delete profile and related data first (cascade should handle most)
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      await supabaseAdmin.from("profiles").delete().eq("user_id", user_id);
      
      // Delete from auth
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== IMPERSONATE USER (generate magic link) =====
    if (action === "impersonate_user") {
      if (!user_id && !email) throw new Error("user_id or email required");
      
      let targetEmail = email;
      if (!targetEmail && user_id) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const found = users?.find(u => u.id === user_id);
        if (!found) throw new Error("User not found");
        targetEmail = found.email;
      }
      
      // Generate a magic link for the user (admin impersonation)
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: targetEmail!,
      });
      if (error) throw error;
      
      return new Response(JSON.stringify({ 
        success: true,
        // Return the hashed token properties so frontend can use verifyOtp
        token_hash: data.properties?.hashed_token,
        email: targetEmail,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== SEND CUSTOM EMAIL TO USER =====
    if (action === "send_custom_email") {
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) throw new Error("recipients required");
      if (!subject || !body) throw new Error("subject and body required");

      // Use the send-email function logic inline with denomailer
      const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
      
      let smtpEmail = Deno.env.get("SMTP_CONTACT_EMAIL") || "contact@hustlaiapp.in";
      let smtpPass = Deno.env.get("SMTP_CONTACT_PASSWORD") || "";

      if (category) {
        const { data: setting } = await supabaseAdmin
          .from("email_settings")
          .select("smtp_email, smtp_password, is_active")
          .eq("category", category)
          .maybeSingle();
        if (setting?.smtp_email && setting?.smtp_password && setting?.is_active) {
          smtpEmail = setting.smtp_email;
          smtpPass = setting.smtp_password;
        }
      }

      if (!smtpPass) throw new Error("SMTP password not configured");

      const SMTP_CONNECTIONS = [
        { port: 465, tls: true },
        { port: 587, tls: false },
      ] as const;

      let sent = 0;
      const errors: string[] = [];

      for (const recipientEmail of recipients) {
        let lastError: unknown = null;
        let success = false;

        for (const config of SMTP_CONNECTIONS) {
          const client = new SMTPClient({
            connection: {
              hostname: "cp1.dnspark.in",
              port: config.port,
              tls: config.tls,
              auth: { username: smtpEmail, password: smtpPass },
            },
            debug: { log: false, allowUnsecure: true },
          });

          try {
            await client.send({
              from: `HustleAI <${smtpEmail}>`,
              to: recipientEmail,
              subject,
              content: "auto",
              html: generateEmailHTML(subject, body),
            });
            success = true;
            sent++;
            break;
          } catch (error) {
            lastError = error;
          } finally {
            try { await client.close(); } catch { /* no-op */ }
          }
        }

        if (!success) {
          errors.push(`${recipientEmail}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
        }
      }

      return new Response(JSON.stringify({ success: true, sent, total: recipients.length, errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
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
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">⚡ HustleAI</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your AI-Powered Side Hustle Platform</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;font-weight:600;">${subject}</h2>
          <div style="color:#4a4a5a;font-size:15px;line-height:1.7;">${body}</div>
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
