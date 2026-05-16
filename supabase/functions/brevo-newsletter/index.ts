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
<body style="margin:0;padding:0;background:#f6f5f1;font-family:Inter,Arial,sans-serif;color:#111;">
${previewText ? `<div style="display:none;max-height:0;overflow:hidden">${previewText}</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.06);border:1px solid #ececec;">
<tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:26px 30px;color:#fff;">
<div style="font-weight:800;font-size:22px;letter-spacing:.3px">HustleAI · The Sunday Brief</div>
<div style="opacity:.78;font-size:12px;margin-top:4px">One email a week · the app + the blog, in one place</div>
</td></tr>
<tr><td style="padding:30px 30px 10px 30px;font-size:15.5px;line-height:1.7;color:#1f2330">
${bodyHtml}
</td></tr>
<tr><td style="padding:8px 30px 24px 30px;">
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px 0;">
<tr>
<td align="center" style="background:#0f172a;border-radius:10px;padding:12px 14px;">
<a href="https://hustlaiapp.in?utm_source=newsletter&utm_medium=email&utm_campaign=sunday_brief" style="color:#fff;text-decoration:none;font-weight:600;font-size:14px;">Open the app →</a>
</td>
<td align="center" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 14px;">
<a href="https://blogs.hustlaiapp.in?utm_source=newsletter&utm_medium=email&utm_campaign=sunday_brief" style="color:#9a3412;text-decoration:none;font-weight:600;font-size:14px;">Read the blog →</a>
</td>
</tr></table>
</td></tr>
<tr><td style="padding:14px 30px 28px 30px;font-size:12px;color:#6b6f80;border-top:1px solid #eee;">
You subscribed at <a href="https://hustlaiapp.in" style="color:#0f172a">hustlaiapp.in</a> or <a href="https://blogs.hustlaiapp.in" style="color:#0f172a">blogs.hustlaiapp.in</a>. One email every Sunday, never more.<br/>
<a href="${unsubscribeUrl}" style="color:#6b6f80;text-decoration:underline">Unsubscribe</a> · <a href="https://hustlaiapp.in" style="color:#6b6f80;text-decoration:underline">App</a> · <a href="https://blogs.hustlaiapp.in" style="color:#6b6f80;text-decoration:underline">Blog</a>
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

    // ===== Admin gate helper =====
    async function requireAdmin() {
      const auth = req.headers.get("authorization") || "";
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
      const { data: u } = await userClient.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) throw new Error("unauthorized");
      const { data: r } = await sb.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
      if (!r) throw new Error("forbidden");
      return uid;
    }

    function sectionsToHtml(sections: any[]) {
      return (sections || []).map((s) => {
        const md = String(s.body_md || "").trim();
        // Lightweight md → html (paragraphs, lists, links)
        const html = md
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#6366f1">$1</a>')
          .replace(/^\- (.*)$/gm, "<li>$1</li>")
          .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>")
          .split(/\n\n+/).map(p => p.startsWith("<ul>") ? p : `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("\n");
        return `<h2 style="margin:24px 0 8px;font-size:18px;color:#111">${escapeHtml(s.title || "")}</h2>${html}`;
      }).join("\n");
    }
    function escapeHtml(s: string) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]); }

    // ===== Unified Sunday Brief prompt (used by both manual + cron) =====
    const SUNDAY_BRIEF_SYSTEM = `You write "The Sunday Brief" — ONE weekly email from HustleAI that blends our app (hustlaiapp.in) and our blog (blogs.hustlaiapp.in) for Indian creators, freelancers and small operators.

Output ONLY valid JSON of EXACTLY this shape (4 sections, no more, no less):
{"subject":"Short, specific subject ≤ 60 chars","preheader":"One-line teaser ≤ 90 chars","sections":[
  {"id":"feature","title":"This week's read","body_md":"ONE featured article — 90-130 words. Hook → insight → why it matters this week. End with a markdown link to a relevant blog post on https://blogs.hustlaiapp.in/ ."},
  {"id":"tech_pulse","title":"Tech & AI pulse","body_md":"3-5 short bullet points (use '- ' prefix). Each bullet = one concrete AI/tech/creator-economy update from this past week, India-relevant where possible. ≤ 22 words per bullet. No fluff."},
  {"id":"tool_guide","title":"How to use it inside HustleAI","body_md":"Pick ONE tool or feature inside HustleAI (e.g. Hustle Canvas, Invoice Generator, Hustle Blueprint, Workspace OS, Proposal Generator). 80-110 words. Show a real 3-step workflow ('1. … 2. … 3. …'). End with a markdown link to that tool on https://hustlaiapp.in/ ."},
  {"id":"cta","title":"Open the workspace","body_md":"50-70 words promoting both surfaces — the app at https://hustlaiapp.in for doing the work, and the blog at https://blogs.hustlaiapp.in for the playbooks. Warm, confident, no hype, no emojis spam."}
]}

Hard rules:
- Markdown only inside body_md (paragraphs, '- ' bullets, [text](url) links). NO HTML.
- Never invent product features. Stick to: Hustle Canvas, Hustle Blueprint, Invoice Generator, Proposal Generator, Contract Generator, Workspace OS, HustleBot, Intake Forms, Pricing Calculator.
- Tone: clear, operator-grade, slightly editorial. No "🚀", no "Hey hustler!", no fake urgency.
- This is the ONLY email subscribers get this week — make it feel complete.`;

    // ===== Sectioned AI draft generation (writes a newsletter_issues row) =====
    if (action === "generate_sections") {
      await requireAdmin();
      const focus = body.focus || "the Sunday Brief — what changed this week in AI + side hustles in India";
      const raw = await callAI(`Focus: ${focus}. Write this week's Sunday Brief.`, SUNDAY_BRIEF_SYSTEM);
      const cleaned = raw.replace(/```json\n?/gi, "").replace(/```/g, "").trim();
      let parsed: any;
      try { parsed = JSON.parse(cleaned); }
      catch { return new Response(JSON.stringify({ error: "ai_parse_failed", raw }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

      const { data: issue, error } = await sb.from("newsletter_issues").insert({
        subject: parsed.subject,
        preheader: parsed.preheader || null,
        sections: parsed.sections || [],
        status: "ready",
        provider: body.provider || "brevo",
        channel: body.channel || "email",
        model: "google/gemini-2.5-flash",
        metadata: { focus, format: "sunday_brief_v1" },
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, issue }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== Manual write: admin pastes their own subject/preheader/markdown =====
    if (action === "create_manual_issue") {
      await requireAdmin();
      const { subject, preheader, body_md } = body;
      if (!subject || !body_md) {
        return new Response(JSON.stringify({ error: "subject_and_body_required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: issue, error } = await sb.from("newsletter_issues").insert({
        subject,
        preheader: preheader || null,
        sections: [{ id: "manual", title: "", body_md }],
        status: "ready",
        provider: "brevo",
        channel: "email",
        model: "manual",
        metadata: { format: "manual_v1" },
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, issue }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== Bulk add subscribers (CSV / comma / newline separated) =====
    if (action === "bulk_add_subscribers") {
      await requireAdmin();
      const raw = String(body.emails || "");
      const list = Array.from(new Set(
        raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase())
          .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))
      ));
      if (list.length === 0) {
        return new Response(JSON.stringify({ error: "no_valid_emails" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      let added = 0, reactivated = 0, skipped = 0;
      for (const email of list) {
        const { data: existing } = await sb.from("newsletter_subscribers").select("id,status").eq("email", email).maybeSingle();
        if (existing) {
          if (existing.status !== "active") {
            await sb.from("newsletter_subscribers").update({ status: "active", is_active: true, unsubscribed_at: null }).eq("id", existing.id);
            reactivated++;
          } else skipped++;
        } else {
          const { error } = await sb.from("newsletter_subscribers").insert({
            email, source: "manual", status: "active", is_active: true,
          });
          if (!error) added++; else skipped++;
        }
      }
      return new Response(JSON.stringify({ ok: true, added, reactivated, skipped, total: list.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== Regenerate a single section =====
    if (action === "regenerate_section") {
      await requireAdmin();
      const { issue_id, section_id, hint } = body;
      const { data: issue, error: ie } = await sb.from("newsletter_issues").select("*").eq("id", issue_id).single();
      if (ie) throw ie;
      const sections = (issue.sections || []) as any[];
      const section = sections.find(s => s.id === section_id);
      if (!section) return new Response(JSON.stringify({ error: "section_not_found" }), { status: 404, headers: corsHeaders });

      const system = `Rewrite ONE newsletter section in markdown. Output ONLY JSON: {"title":"...","body_md":"..."}. Keep under 120 words.`;
      const raw = await callAI(`Section: ${section.title}. Hint: ${hint || "tighter, fresher"}. Current:\n${section.body_md}`, system);
      const cleaned = raw.replace(/```json\n?/gi, "").replace(/```/g, "").trim();
      const next = JSON.parse(cleaned);
      const updated = sections.map(s => s.id === section_id ? { ...s, ...next } : s);
      const { error: ue } = await sb.from("newsletter_issues").update({ sections: updated }).eq("id", issue_id);
      if (ue) throw ue;
      return new Response(JSON.stringify({ ok: true, sections: updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== Send a test email of a draft to a given address =====
    if (action === "test_issue") {
      await requireAdmin();
      const { issue_id, to_email } = body;
      const { data: issue, error: ie } = await sb.from("newsletter_issues").select("*").eq("id", issue_id).single();
      if (ie) throw ie;
      const html = sectionsToHtml(issue.sections || []);
      const wrapped = wrapHtml({
        subject: issue.subject,
        bodyHtml: html,
        previewText: issue.preheader,
        unsubscribeUrl: "https://hustlaiapp.in/unsubscribe?token=test",
      });
      const result = await brevoSend({
        sender: { name: "HustleAI", email: "noreply@hustlaiapp.in" },
        to: [{ email: to_email }],
        subject: `[TEST] ${issue.subject}`,
        htmlContent: wrapped,
      });
      return new Response(JSON.stringify({ ok: true, messageId: result.messageId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== Dispatch an APPROVED issue (admin only, approval-gated) =====
    if (action === "dispatch_issue") {
      await requireAdmin();
      const { issue_id } = body;
      const { data: issue, error: ie } = await sb.from("newsletter_issues").select("*").eq("id", issue_id).single();
      if (ie) throw ie;
      if (!["approved", "scheduled"].includes(issue.status)) {
        return new Response(JSON.stringify({ error: "not_approved", status: issue.status }), { status: 409, headers: corsHeaders });
      }
      // Hard throttle: refuse if another issue was dispatched in the last 6 days,
      // unless the caller explicitly passes { force: true }. Prevents accidental spam.
      if (!body.force) {
        const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recent } = await sb.from("newsletter_issues")
          .select("id,sent_at,subject")
          .eq("status", "sent")
          .gte("sent_at", sixDaysAgo)
          .order("sent_at", { ascending: false })
          .limit(1);
        if (recent && recent.length > 0) {
          return new Response(JSON.stringify({
            error: "throttled",
            message: `Another issue ("${recent[0].subject}") was sent on ${new Date(recent[0].sent_at).toUTCString()}. Only one newsletter per 6 days. Pass force=true to override.`,
          }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      await sb.from("newsletter_issues").update({ status: "sending" }).eq("id", issue_id);

      const { data: subs } = await sb.from("newsletter_subscribers")
        .select("id, email, name, unsubscribe_token").eq("status", "active").eq("is_active", true);

      const html = sectionsToHtml(issue.sections || []);
      let sent = 0, failed = 0;
      for (const s of subs || []) {
        const unsubUrl = `https://hustlaiapp.in/unsubscribe?token=${s.unsubscribe_token}`;
        try {
          const result = await brevoSend({
            sender: { name: "HustleAI", email: "noreply@hustlaiapp.in" },
            to: [{ email: s.email, name: s.name || undefined }],
            subject: issue.subject,
            htmlContent: wrapHtml({ subject: issue.subject, bodyHtml: html, previewText: issue.preheader, unsubscribeUrl: unsubUrl }),
            headers: { "List-Unsubscribe": `<${unsubUrl}>` },
          });
          await sb.from("newsletter_sends").upsert({
            issue_id: issue.id, subscriber_id: s.id, email: s.email,
            provider: issue.provider, provider_message_id: result.messageId,
            status: "sent", sent_at: new Date().toISOString(),
          }, { onConflict: "issue_id,subscriber_id" });
          sent++;
        } catch (err: any) {
          await sb.from("newsletter_sends").upsert({
            issue_id: issue.id, subscriber_id: s.id, email: s.email,
            provider: issue.provider, status: "failed", error: String(err?.message || err),
          }, { onConflict: "issue_id,subscriber_id" });
          failed++;
        }
        await new Promise(r => setTimeout(r, 80));
      }
      await sb.from("newsletter_issues").update({
        status: failed === (subs?.length ?? 0) && (subs?.length ?? 0) > 0 ? "failed" : "sent",
        sent_at: new Date().toISOString(),
        body_html: html,
        error: failed > 0 ? `${failed} delivery failures` : null,
      }).eq("id", issue_id);
      return new Response(JSON.stringify({ ok: true, sent, failed, total: subs?.length ?? 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== Retry failed sends for an issue =====
    if (action === "retry_failed") {
      await requireAdmin();
      const { issue_id } = body;
      const { data: issue } = await sb.from("newsletter_issues").select("*").eq("id", issue_id).single();
      const { data: failedRows } = await sb.from("newsletter_sends").select("*").eq("issue_id", issue_id).eq("status", "failed");
      const html = sectionsToHtml(issue.sections || []);
      let sent = 0, failed = 0;
      for (const row of failedRows || []) {
        try {
          const result = await brevoSend({
            sender: { name: "HustleAI", email: "noreply@hustlaiapp.in" },
            to: [{ email: row.email }],
            subject: issue.subject,
            htmlContent: wrapHtml({ subject: issue.subject, bodyHtml: html, previewText: issue.preheader, unsubscribeUrl: `https://hustlaiapp.in/unsubscribe?token=na` }),
          });
          await sb.from("newsletter_sends").update({
            status: "sent", provider_message_id: result.messageId,
            sent_at: new Date().toISOString(), error: null,
            attempt: (row.attempt || 0) + 1,
          }).eq("id", row.id);
          sent++;
        } catch (err: any) {
          await sb.from("newsletter_sends").update({
            error: String(err?.message || err), attempt: (row.attempt || 0) + 1,
          }).eq("id", row.id);
          failed++;
        }
        await new Promise(r => setTimeout(r, 80));
      }
      return new Response(JSON.stringify({ ok: true, sent, failed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    // -------- Sunday auto-draft (cron-callable, NO auto-send) --------
    // Generates an approval-ready issue and pings admins via Telegram.
    if (action === "weekly_cron") {
      const cronSecret = Deno.env.get("CRON_SECRET");
      const provided = req.headers.get("x-cron-secret");
      if (cronSecret && provided !== cronSecret) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const focus = body.focus || "weekly digest for Indian creators and freelancers";
      // Skip cron generation if a Sunday Brief already exists for THIS calendar week
      const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existingWeek } = await sb.from("newsletter_issues")
        .select("id,status,created_at").gte("created_at", weekAgo).limit(1);
      if (existingWeek && existingWeek.length > 0) {
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "issue_already_this_week", issue_id: existingWeek[0].id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const raw = await callAI(`Focus: ${focus}. Write this week's Sunday Brief.`, SUNDAY_BRIEF_SYSTEM);
      const cleaned = raw.replace(/```json\n?/gi, "").replace(/```/g, "").trim();
      let parsed: any;
      try { parsed = JSON.parse(cleaned); }
      catch { return new Response(JSON.stringify({ error: "ai_parse_failed", raw }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

      const { data: issue, error } = await sb.from("newsletter_issues").insert({
        subject: parsed.subject,
        preheader: parsed.preheader || null,
        sections: parsed.sections || [],
        status: "ready",
        provider: "brevo",
        channel: "email",
        model: "google/gemini-2.5-flash",
        metadata: { focus, source: "weekly_cron", format: "sunday_brief_v1" },
      }).select().single();
      if (error) throw error;

      // Emit workflow event for downstream consumers (admin notify, etc.)
      try {
        await sb.rpc("enqueue_workflow_runs", {
          _event_name: "newsletter.draft_ready",
          _payload: { issue_id: issue.id, subject: issue.subject } as any,
          _source: "newsletter_cron",
          _dedupe_key: `newsletter_draft:${issue.id}`,
        } as any);
      } catch (e) { console.warn("workflow enqueue failed", e); }

      // Telegram admin alert (best-effort)
      const tgToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const tgChat = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
      if (tgToken && tgChat) {
        try {
          const text = `📰 *Weekly digest draft ready*\n\n*${issue.subject}*\n${issue.preheader || ""}\n\nSections: ${(issue.sections || []).length}\n\nReview: https://hustlaiapp.in/admin/communications/newsletter`;
          await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: tgChat, text, parse_mode: "Markdown", disable_web_page_preview: true }),
          });
        } catch (e) { console.warn("telegram notify failed", e); }
      }

      return new Response(JSON.stringify({ ok: true, issue_id: issue.id, subject: issue.subject }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("brevo-newsletter error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});