import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "samratakash0000@gmail.com";
const SITE = "HustleAI";
const SITE_URL = "https://hustlaiapp.in";

interface InvoicePayload {
  user_id: string;
  user_email: string;
  user_name?: string;
  amount: number;
  currency?: string;
  payment_method: string; // "Cashfree" | "UPI Manual"
  payment_reference?: string;
  item_type?: string; // "plan" | "wallet"
  item_label: string;
  metadata?: Record<string, unknown>;
}

function generateInvoiceNumber(): string {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HA-${yyyymmdd}-${random}`;
}

function buildInvoiceHTML(inv: InvoicePayload & { invoice_number: string; created_at: string }): string {
  const date = new Date(inv.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
  const cur = inv.currency || "INR";
  const sym = cur === "INR" ? "₹" : cur + " ";
  const gst = (inv.amount * 0.18 / 1.18).toFixed(2);
  const base = (inv.amount - parseFloat(gst)).toFixed(2);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 20px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(99,102,241,0.12);">

<tr><td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 40px;color:#ffffff;">
<table width="100%"><tr>
<td><h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">⚡ ${SITE}</h1>
<p style="margin:6px 0 0;opacity:0.85;font-size:13px;">Tax Invoice / Receipt</p></td>
<td align="right"><div style="background:rgba(255,255,255,0.18);padding:8px 16px;border-radius:8px;display:inline-block;">
<div style="font-size:11px;opacity:0.85;text-transform:uppercase;letter-spacing:1px;">Invoice #</div>
<div style="font-size:14px;font-weight:700;font-family:monospace;">${inv.invoice_number}</div>
</div></td>
</tr></table>
</td></tr>

<tr><td style="padding:32px 40px;">
<table width="100%" style="margin-bottom:28px;"><tr>
<td width="50%" style="vertical-align:top;">
<div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;">Billed To</div>
<div style="font-size:15px;font-weight:600;color:#1a1a2e;">${inv.user_name || inv.user_email.split("@")[0]}</div>
<div style="font-size:13px;color:#666;margin-top:2px;">${inv.user_email}</div>
</td>
<td width="50%" style="vertical-align:top;text-align:right;">
<div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;">Date</div>
<div style="font-size:15px;font-weight:600;color:#1a1a2e;">${date}</div>
<div style="font-size:13px;color:#666;margin-top:2px;">Status: <span style="color:#10b981;font-weight:600;">PAID</span></div>
</td>
</tr></table>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
<tr style="background:#f9fafb;">
<td style="padding:14px 20px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Description</td>
<td style="padding:14px 20px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600;text-align:right;">Amount</td>
</tr>
<tr style="border-top:1px solid #e5e7eb;">
<td style="padding:18px 20px;font-size:14px;color:#1a1a2e;font-weight:500;">${inv.item_label}<br><span style="font-size:12px;color:#9ca3af;font-weight:400;">${inv.item_type === "wallet" ? "Wallet Credit Top-up" : "Subscription"}</span></td>
<td style="padding:18px 20px;font-size:14px;color:#1a1a2e;text-align:right;font-weight:600;">${sym}${base}</td>
</tr>
<tr><td style="padding:10px 20px;font-size:13px;color:#6b7280;">GST @ 18%</td>
<td style="padding:10px 20px;font-size:13px;color:#6b7280;text-align:right;">${sym}${gst}</td></tr>
<tr style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;">
<td style="padding:18px 20px;font-size:15px;font-weight:700;">Total Paid</td>
<td style="padding:18px 20px;font-size:18px;font-weight:800;text-align:right;">${sym}${inv.amount.toFixed(2)}</td>
</tr>
</table>

<div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:10px;">
<table width="100%"><tr>
<td style="font-size:12px;color:#6b7280;">Payment Method:<br><strong style="color:#1a1a2e;font-size:13px;">${inv.payment_method}</strong></td>
<td style="font-size:12px;color:#6b7280;text-align:right;">Reference:<br><strong style="color:#1a1a2e;font-size:13px;font-family:monospace;">${inv.payment_reference || "—"}</strong></td>
</tr></table>
</div>

<div style="margin-top:32px;text-align:center;">
<a href="${SITE_URL}/profile" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;box-shadow:0 4px 16px rgba(99,102,241,0.3);">View Your Account →</a>
</div>

<p style="margin:32px 0 0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
Thank you for choosing ${SITE}. This is a system-generated invoice; no signature required.<br>
For queries, contact <a href="mailto:contact@hustlaiapp.in" style="color:#6366f1;text-decoration:none;">contact@hustlaiapp.in</a>
</p>
</td></tr>

<tr><td style="padding:20px 40px;background:#1a1a2e;color:#9ca3af;font-size:11px;text-align:center;">
© ${new Date().getFullYear()} ${SITE} · <a href="${SITE_URL}" style="color:#a78bfa;text-decoration:none;">hustlaiapp.in</a> · GSTIN exempt under composition scheme
</td></tr>

</table></td></tr></table>
</body></html>`;
}

async function sendViaSMTP(to: string[], subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const smtpEmail = Deno.env.get("SMTP_SKYCART_EMAIL") || "contact@skycart.xyz";
  const smtpPass = Deno.env.get("SMTP_SKYCART_PASSWORD");
  if (!smtpPass) return { ok: false, error: "SMTP_SKYCART_PASSWORD not set" };

  const configs = [{ port: 465, tls: true }, { port: 587, tls: false }];
  let lastError = "Unknown error";

  for (const cfg of configs) {
    const client = new SMTPClient({
      connection: {
        hostname: "cp1.dnspark.in",
        port: cfg.port,
        tls: cfg.tls,
        auth: { username: smtpEmail, password: smtpPass },
      },
      debug: { log: false, allowUnsecure: true },
    });
    try {
      await client.send({
        from: `HustleAI Billing <${smtpEmail}>`,
        to,
        subject,
        content: "auto",
        html,
      });
      await client.close().catch(() => {});
      return { ok: true };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      try { await client.close(); } catch { /* no-op */ }
    }
  }
  return { ok: false, error: lastError };
}

async function sendViaLovableFallback(to: string[], subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_KEY) return { ok: false, error: "LOVABLE_API_KEY missing" };
  // Lovable AI Gateway doesn't send emails directly, so we just log the fallback need.
  // In a true fallback, we could invoke any other transactional path here.
  // For now, return not-ok so the failure-notify branch fires.
  return { ok: false, error: "Lovable fallback not configured for invoices" };
}

async function notifyAdminOfFailure(supabase: any, inv: InvoicePayload, invoice_number: string, error: string) {
  // Try one more SMTP attempt to admin only with a stripped-down failure notice
  const html = `<div style="font-family:Arial;padding:20px;">
    <h2 style="color:#ef4444;">⚠️ Invoice Email Failed</h2>
    <p><strong>Invoice:</strong> ${invoice_number}</p>
    <p><strong>User:</strong> ${inv.user_email}</p>
    <p><strong>Amount:</strong> ₹${inv.amount}</p>
    <p><strong>Item:</strong> ${inv.item_label}</p>
    <p><strong>Method:</strong> ${inv.payment_method}</p>
    <p><strong>Reference:</strong> ${inv.payment_reference || "—"}</p>
    <p style="background:#fee;padding:12px;border-radius:8px;color:#991b1b;"><strong>Error:</strong> ${error}</p>
    <p>Please send the invoice manually if needed.</p>
  </div>`;
  try {
    await sendViaSMTP([ADMIN_EMAIL], `[HustleAI] Invoice send failed: ${invoice_number}`, html);
  } catch { /* swallow */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json() as InvoicePayload;
    if (!payload.user_id || !payload.user_email || !payload.amount || !payload.item_label || !payload.payment_method) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const invoice_number = generateInvoiceNumber();
    const created_at = new Date().toISOString();

    // Insert invoice record first
    const { error: insertErr } = await supabase.from("invoices").insert({
      invoice_number,
      user_id: payload.user_id,
      user_email: payload.user_email,
      user_name: payload.user_name,
      amount: payload.amount,
      currency: payload.currency || "INR",
      payment_method: payload.payment_method,
      payment_reference: payload.payment_reference,
      item_type: payload.item_type || "plan",
      item_label: payload.item_label,
      status: "paid",
      metadata: payload.metadata || {},
    });
    if (insertErr) console.error("Invoice insert error:", insertErr);

    const html = buildInvoiceHTML({ ...payload, invoice_number, created_at });
    const subject = `Your ${SITE} Invoice ${invoice_number} — ₹${payload.amount}`;

    // Send to user + admin in one shot
    const recipients = [payload.user_email, ADMIN_EMAIL];
    let result = await sendViaSMTP(recipients, subject, html);

    if (!result.ok) {
      // Fallback attempt
      const fb = await sendViaLovableFallback(recipients, subject, html);
      if (!fb.ok) {
        await notifyAdminOfFailure(supabase, payload, invoice_number, result.error || "Unknown");
        await supabase.from("invoices").update({
          send_error: result.error,
        }).eq("invoice_number", invoice_number);
      } else {
        result = fb;
      }
    }

    if (result.ok) {
      await supabase.from("invoices").update({
        sent_to_user: true,
        sent_to_admin: true,
      }).eq("invoice_number", invoice_number);
    }

    return new Response(JSON.stringify({
      success: result.ok,
      invoice_number,
      error: result.ok ? null : result.error,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("send-invoice error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});