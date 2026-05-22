// Workspace AI helper: infers client niche/budget/vibe from a URL or text,
// and drafts personalized follow-up emails. Uses the shared AI fallback chain.
import { callAIWithFallback } from "../_shared/ai-fallback.ts";
import { requireVerifiedUser as __requireVerifiedUser } from "../_shared/require-verified.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchSnippet(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 HustleAI" } });
    if (!r.ok) return "";
    const html = await r.text();
    // strip tags, collapse whitespace, cap at 4k
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
  } catch { return ""; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const __gate = await __requireVerifiedUser(req, { denialEvent: "verification_blocked_ai", fn: "workspace-ai" });
  if (!__gate.ok) return __gate.response;
  try {
    const body = await req.json();
    const { action, url, text, client, notes, intent, workspace } = body;

    if (action === "scrape") {
      const snippet = url ? await fetchSnippet(url) : (text || "");
      const prompt = `You analyse a freelancer's prospective client based on the page content below.
Return STRICT JSON: { "niche": string, "budget": "low"|"medium"|"high"|"enterprise", "vibe": string (1 sentence, casual/formal/technical/creative), "summary": string (2 sentences) }.
Source: ${url || "(pasted text)"}
Content: ${snippet || "(empty)"}`;
      const { content } = await callAIWithFallback({
        messages: [
          { role: "system", content: "You output ONLY valid JSON. No markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 500,
      });
      const json = content.match(/\{[\s\S]*\}/)?.[0] || "{}";
      return new Response(json, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "draft_email") {
      const prompt = `Write a short, warm, personalised follow-up email (max 110 words) from a freelancer to this prospect.
Prospect: ${client?.name} at ${client?.company || "their company"}
Niche: ${client?.niche || "unknown"}
Vibe: ${client?.vibe || "professional"}
Budget tier: ${client?.budget || "unknown"}
Notes: ${client?.notes || ""}
Return JSON: { "subject": string, "body": string }`;
      const { content } = await callAIWithFallback({
        messages: [
          { role: "system", content: "You output ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      });
      const json = content.match(/\{[\s\S]*\}/)?.[0] || "{}";
      return new Response(json, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "closing_pitch") {
      const prompt = `Write a confident, high-conviction closing pitch (max 90 words) the freelancer can copy-paste to seal this deal NOW.
Prospect: ${client?.name || "the client"} at ${client?.company || "their company"}
Niche: ${client?.niche || "unknown"} | Budget: ${client?.budget || "unknown"} | Vibe: ${client?.vibe || "professional"}
Notes: ${client?.notes || ""}
Return JSON: { "pitch": string }`;
      const { content } = await callAIWithFallback({
        messages: [
          { role: "system", content: "You output ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 400,
      });
      const json = content.match(/\{[\s\S]*\}/)?.[0] || "{}";
      return new Response(json, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "tidy_canvas") {
      // notes: [{ id, color, text, last_action_at }]
      const prompt = `You are organising a freelancer's visual war-room. Group sticky notes into logical zones and flag stalled ones (no activity > 48h).
Notes: ${JSON.stringify(notes || [])}
Return STRICT JSON: { "zones": { "hot": string[], "ideation": string[], "in_progress": string[], "won": string[], "follow_up": string[] }, "summary": string }`;
      const { content } = await callAIWithFallback({
        messages: [
          { role: "system", content: "You output ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 700,
      });
      const json = content.match(/\{[\s\S]*\}/)?.[0] || "{}";
      return new Response(json, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "generate_intent") {
      const w = workspace || {};
      const ctx = [
        w.client_name ? `Client: ${w.client_name}` : "",
        w.company_name ? `Company: ${w.company_name}` : "",
        w.pipeline_stage ? `Stage: ${w.pipeline_stage}` : "",
        w.project_scope ? `Scope: ${w.project_scope}` : "",
        Array.isArray(w.deliverables) && w.deliverables.length ? `Deliverables: ${w.deliverables.join(", ")}` : "",
        Array.isArray(w.tags) && w.tags.length ? `Tags: ${w.tags.join(", ")}` : "",
        w?.pricing?.amount ? `Budget: ${w.pricing.currency || "INR"}${w.pricing.amount}` : "",
        notes ? `Operator notes: ${notes}` : "",
      ].filter(Boolean).join("\n");

      const INTENT_PROMPTS: Record<string, { title: string; instr: string }> = {
        scope:            { title: "Project scope",         instr: "Generate a crisp project scope: objective, in-scope deliverables, out-of-scope, milestones with target dates, success metrics, assumptions." },
        strategy:         { title: "Strategy plan",         instr: "Produce a goal -> strategy -> action-plan document. Include 3 pillars, prioritized initiatives, 30/60/90 milestones, KPIs, risks." },
        automation:       { title: "Automation flow",       instr: "Design an automation flow as Trigger -> Steps -> Output. List required tools, integration points, fallback handling, rollout checklist." },
        outreach:         { title: "Cold outreach email",   instr: "Write a personalised cold outreach email (<=140 words) plus 2 short follow-ups. Include subject lines." },
        icp:              { title: "Ideal customer profile",instr: "Write a sharp ICP: firmographics, pains, triggers, where they hang out, objections, message hooks." },
        content:          { title: "Content pillars",       instr: "Generate 3-5 content pillars with description, sample post hooks, distribution channels per pillar." },
        content_calendar: { title: "30-day content plan",   instr: "Generate a 30-day publishing calendar (markdown table) with date, channel, format, hook, CTA." },
        proposal:         { title: "Client proposal",       instr: "Draft a complete client proposal: executive summary, scope, timeline, deliverables, investment, terms, next steps." },
        invoice:          { title: "Invoice draft",         instr: "Draft an invoice summary: line items, amounts, payment terms, due date, bank/UPI placeholder." },
        research:         { title: "Research brief",        instr: "Produce a research brief: research questions, sources to consult, hypotheses, synthesis framework." },
        onboarding:       { title: "Onboarding checklist",  instr: "Generate an onboarding checklist: kickoff, access, expectations, comms cadence, week-1 deliverables." },
      };
      const meta = INTENT_PROMPTS[String(intent)] || { title: String(intent || "Output"), instr: "Generate a useful deliverable for this freelance project." };

      const prompt = `You are an operator inside a freelancer's project workspace. ${meta.instr}

Project context:
${ctx || "(no extra context provided)"}

Return clean markdown. Be concrete, skip preamble, use tables/lists where useful.`;

      const { content } = await callAIWithFallback({
        messages: [
          { role: "system", content: "You are a senior freelance operator. Produce concrete, ready-to-use deliverables in markdown. No fluff." },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 1800,
      });
      return new Response(JSON.stringify({ title: meta.title, markdown: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});