// Brevo newsletter sender + AI content generator
// Actions: send_now, generate_ai, send_test, schedule
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BREVO_API = "https://api.brevo.com/v3";
const BREVO_KEY = Deno.env.get("BREVO_API_KEY")!;
const LOVABLE_AI_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function wrapHtml(opts: { subject: string; bodyHtml: string; previewText?: string; unsubscribeUrl: string }) {
  const { subject, bodyHtml, previewText, unsubscribeUrl } = opts;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f7f7f9;font-family:Inter,Arial,sans-serif;color:#111;">
${previewText ? `<div style="display:none;max-height:0;overflow:hidden">${previewText}</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.06);">
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:22px 28px;color:#fff;">
<div style="font-weight:800;font-size:20px;letter-spacing:.3px">HustleAI</div>
<div style="opacity:.85;font-size:12px;margin-top:2px">India's AI-powered side-hustle OS</div>
</td></tr>
<tr><td style="padding:28px 28px 8px 28px;font-size:15px;line-height:1.7;color:#1f2330">
${bodyHtml}
</td></tr>
<tr><td style="padding:18px 28px 28px 28px;font-size:12px;color:#6b6f80;border-top:1px solid #eee;">
You're getting this because you subscribed at <a href="https://hustlaiapp.in" style="color:#6366f1">hustlaiapp.in</a>.<br/>
<a href="${unsubscribeUrl}" style="color:#6b6f80;text-decoration:underline">Unsubscribe</a> · <a href="https://hustlaiapp.in" style="color:#6b6f80;text-decoration:underline">Visit site</a>
</td></tr></table></td></tr></table></body></html>`;
}

async function callAI(prompt: string, system: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_AI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function brevoSend(payload: any) {
  const res = await fetch(`${BREVO_API}/smtp/email`, {
    method: "POST",
    headers: { "api-key": BREVO_KEY, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${txt}`);
  return JSON.parse(txt);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const body = await req.json();
    const action = body.action as string;

    // -------- AI generate --------
    if (action === "generate_ai") {
      const userPrompt = body.prompt || "Generate a weekly digest from HustleAI about new tools, features, and side-hustle tips for Indian creators.";
      const system = `You write friendly, concise newsletters for HustleAI — an AI-powered side-hustle platform for Indian creators. Output ONLY a JSON object: {"subject": "...", "previewText": "...", "html": "<inner email HTML body, no <html/body> tags, use <h2><p><ul><a> etc, modern simple>"}. Do not include unsubscribe footer. Keep under 600 words. Use Indian context. End with a CTA linking to https://hustlaiapp.in.`;
      const raw = await callAI(userPrompt, system);
      const cleaned = raw.replace(/```json\n?/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return new Response(JSON.stringify({ ok: true, ...parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // -------- Send test --------
    if (action === "send_test") {
      const { subject, html, previewText, toEmail, fromName, fromEmail } = body;
      const result = await brevoSend({
        sender: { name: fromName || "HustleAI", email: fromEmail || "noreply@hustlaiapp.in" },
        to: [{ email: toEmail }],
        subject,
        htmlContent: wrapHtml({ subject, bodyHtml: html, previewText, unsubscribeUrl: "https://hustlaiapp.in/unsubscribe?token=test" }),
      });
      return new Response(JSON.stringify({ ok: true, messageId: result.messageId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // -------- Send now (bulk) --------
    if (action === "send_now") {
      const { campaignId, subject, html, previewText, fromName, fromEmail, audience, aiGenerated } = body;

      // Get auth user as creator
      const authHeader = req.headers.get("authorization") || "";
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
      const { data: u } = await userClient.auth.getUser();
      const createdBy = u?.user?.id;
      if (!createdBy) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

      // Create or update campaign row
      let camp;
      if (campaignId) {
        const { data, error } = await sb.from("email_campaigns").update({ status: "sending" }).eq("id", campaignId).select().single();
        if (error) throw error;
        camp = data;
      } else {
        const { data, error } = await sb.from("email_campaigns").insert({
          created_by: createdBy, title: subject, subject, body_html: html, audience: audience || "all",
          status: "sending", provider: "brevo", ai_generated: !!aiGenerated, preview_text: previewText,
          from_name: fromName || "HustleAI", from_email: fromEmail || "noreply@hustlaiapp.in",
        }).select().single();
        if (error) throw error;
        camp = data;
      }

      const { data: subs, error: e2 } = await sb.from("newsletter_subscribers")
        .select("email, name, unsubscribe_token")
        .eq("is_active", true);
      if (e2) throw e2;

      let sent = 0, failed = 0; const errors: string[] = [];
      // Send individually so each gets unique unsubscribe link
      for (const s of subs || []) {
        try {
          const unsubUrl = `https://hustlaiapp.in/unsubscribe?token=${s.unsubscribe_token}`;
          await brevoSend({
            sender: { name: fromName || "HustleAI", email: fromEmail || "noreply@hustlaiapp.in" },
            to: [{ email: s.email, name: s.name || undefined }],
            subject: camp.subject,
            htmlContent: wrapHtml({ subject: camp.subject, bodyHtml: camp.body_html, previewText: camp.preview_text, unsubscribeUrl: unsubUrl }),
            headers: { "List-Unsubscribe": `<${unsubUrl}>` },
          });
          sent++;
        } catch (err: any) {
          failed++;
          if (errors.length < 5) errors.push(`${s.email}: ${err.message}`);
        }
        // Tiny delay to respect Brevo throughput
        await new Promise(r => setTimeout(r, 80));
      }

      await sb.from("email_campaigns").update({
        status: failed === (subs?.length ?? 0) ? "failed" : "sent",
        sent_count: sent, failed_count: failed, sent_at: new Date().toISOString(),
        error_message: errors.length ? errors.join(" | ") : null,
      }).eq("id", camp.id);

      return new Response(JSON.stringify({ ok: true, sent, failed, total: subs?.length ?? 0, campaignId: camp.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // -------- Unsubscribe --------
    if (action === "unsubscribe") {
      const { token } = body;
      const { error } = await sb.from("newsletter_subscribers")
        .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
        .eq("unsubscribe_token", token);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // -------- Run weekly (cron-callable) --------
    if (action === "run_scheduled") {
      const { data: sched } = await sb.from("newsletter_schedules").select("*").limit(1).maybeSingle();
      if (!sched?.enabled) return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Generate
      const system = `You write friendly weekly newsletters for HustleAI. Output ONLY JSON: {"subject":"...","previewText":"...","html":"..."}.`;
      const raw = await callAI(sched.ai_prompt, system);
      const cleaned = raw.replace(/```json\n?/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Insert campaign as system
      const { data: camp, error } = await sb.from("email_campaigns").insert({
        created_by: "00000000-0000-0000-0000-000000000000",
        title: parsed.subject, subject: parsed.subject, body_html: parsed.html, preview_text: parsed.previewText,
        audience: "all", status: "sending", provider: "brevo", ai_generated: true,
        from_name: sched.from_name, from_email: sched.from_email,
      }).select().single();
      if (error) throw error;

      const { data: subs } = await sb.from("newsletter_subscribers").select("email,name,unsubscribe_token").eq("is_active", true);
      let sent = 0, failed = 0;
      for (const s of subs || []) {
        try {
          const unsubUrl = `https://hustlaiapp.in/unsubscribe?token=${s.unsubscribe_token}`;
          await brevoSend({
            sender: { name: sched.from_name, email: sched.from_email },
            to: [{ email: s.email, name: s.name || undefined }],
            subject: parsed.subject,
            htmlContent: wrapHtml({ subject: parsed.subject, bodyHtml: parsed.html, previewText: parsed.previewText, unsubscribeUrl: unsubUrl }),
            headers: { "List-Unsubscribe": `<${unsubUrl}>` },
          });
          sent++;
        } catch { failed++; }
        await new Promise(r => setTimeout(r, 80));
      }
      await sb.from("email_campaigns").update({ status: "sent", sent_count: sent, failed_count: failed, sent_at: new Date().toISOString() }).eq("id", camp.id);
      await sb.from("newsletter_schedules").update({ last_run_at: new Date().toISOString() }).eq("id", sched.id);

      return new Response(JSON.stringify({ ok: true, campaignId: camp.id, sent, failed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("brevo-newsletter error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});