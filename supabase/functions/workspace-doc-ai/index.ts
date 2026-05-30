// Workspace document AI helper — drafts/improves clauses, headlines, bullets.
// Returns STRICT JSON only. BYO key first, platform fallback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/ai-fallback.ts";
import { requireVerifiedUser as __requireVerifiedUser } from "../_shared/require-verified.ts";
import { requireCapability, guardErrorBody } from "../_shared/tier/guard.ts";
import { consumeAndCheck } from "../_shared/tier/quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TASKS: Record<string, string> = {
  improve_text: `Rewrite the given text to be 30% more persuasive, professional, and crisp. Same meaning. Return JSON: { "text": string }`,
  draft_agreement_clause: `Draft a short, professional clause (2-4 sentences) for the section: "{{section}}", tailored to: {{context}}. Return JSON: { "text": string }`,
  service_card_copy: `Generate a service card with bullets. Context: {{context}}. Return JSON: { "service": string, "hook": string, "bullets": string[] (4 items, each <60 chars), "price": string, "cta": string (3 words max) }`,
  payment_structure: `Suggest a smart payment structure for the project context: {{context}}. Return JSON: { "structure": string (one sentence) }`,
  scope_summary: `Summarize this scope in 1 sentence, crisp. Context: {{context}}. Return JSON: { "summary": string }`,
  draft_proposal_section: `Draft a concise, persuasive proposal section (3-5 sentences) for: "{{section}}". Project context: {{context}}. Return JSON: { "text": string }`,
  proposal_full: `Generate a full freelancer proposal from this context: {{context}}. Premium, confident, outcome-focused. Return JSON: { "title": string, "summary": string, "problem": string, "approach": string, "deliverables": string[] (4-6 short items), "timeline": string, "investment": string, "whyUs": string, "cta": string (5 words max) }`,
  // === Tool-page generators (dashboard /tools/*) ===
  // Each takes a `currentState` JSON snapshot + a free-form `prompt` and returns
  // a partial patch object whose keys merge into the page state.
  tool_invoice_full: `You are filling a freelancer invoice. Current state JSON: {{state}}. User prompt: "{{prompt}}". Generate ONLY the fields the user implied. Keep currency & taxLabel sensible for the geography. Return JSON exactly matching this shape (omit keys you don't want to change): { "bizName": string, "bizEmail": string, "bizAddress": string, "bizGstin": string, "clientName": string, "clientEmail": string, "clientAddress": string, "clientGstin": string, "invoiceNo": string, "currency": string, "taxLabel": string, "taxRate": number, "notes": string, "terms": string, "items": [{ "id": string, "desc": string, "qty": number, "rate": number }] }`,
  tool_proposal_full: `You are drafting a freelancer proposal. Current state JSON: {{state}}. User prompt: "{{prompt}}". Outcome-focused, confident, specific numbers. Return JSON (omit keys to keep): { "bizName": string, "bizEmail": string, "clientName": string, "clientCompany": string, "projectTitle": string, "scope": string (3-5 sentences), "deliverables": string[] (4-6 items), "timeline": string, "pricing": string (number only), "pricingNote": string, "currency": string, "notes": string }`,
  tool_contract_full: `You are drafting a freelancer contract / NDA. Current state JSON: {{state}}. User prompt: "{{prompt}}". Plain English, lawyer-style, jurisdiction-neutral. Return JSON (omit keys to keep): { "providerName": string, "providerAddress": string, "providerEmail": string, "clientName": string, "clientAddress": string, "clientEmail": string, "scope": string, "fee": string, "currency": string, "intro": string (1 paragraph), "clauses": [{ "title": string, "body": string (2-4 sentences) }] }`,
  tool_polish_full: `Polish & strengthen every text field of this document state without changing meaning. Make it 30% sharper, more professional, more persuasive. Keep numbers, dates, IDs and currencies UNCHANGED. Document type: {{section}}. Current state JSON: {{state}}. Return JSON with the SAME schema as the input — only string fields rewritten.`,
  tool_intake_form: `Build a freelancer/agency client-onboarding intake form from this brief: "{{prompt}}". Return a focused, NON-redundant set of 5–9 questions a real client must answer before kickoff. Use field types: "text" | "textarea" | "email" | "url" | "select". For "select", include a comma-separated "options" string. Always include an Email field. Return JSON exactly: { "name": string (form title, max 60 chars), "fields": [{ "label": string, "type": "text"|"textarea"|"email"|"url"|"select", "required": boolean, "options": string }] }`,
  tool_content_calendar: `You are building a 4-week, 5-posts-per-week social content calendar for a creator/freelancer/agency described below. Brief: "{{prompt}}". Pillars to rotate: "Authority / how-to", "Personal story", "Hot take / opinion", "Resource / list", "Behind-the-scenes". Mix days Mon–Fri across 4 weeks (20 ideas total). Make ideas hyper-specific to the brief — names, tools, numbers, audience pain. Return JSON exactly: { "niche": string (3-5 words), "audience": string (3-5 words), "brand": string (1-3 words), "ideas": [{ "week": 1|2|3|4, "day": "Mon"|"Tue"|"Wed"|"Thu"|"Fri", "pillar": string, "idea": string (max 110 chars) }] }`,
  tool_pricing_packs: `Suggest 6 alternate pricing positioning angles for: "{{prompt}}". Return JSON: { "angles": [{ "name": string (3 words), "headline": string (8 words), "rationale": string (1 sentence) }] }`,
};

const OPENAI_COMPATIBLE: Record<string, { endpoint: string; defaultModel: string }> = {
  openai: { endpoint: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4o-mini" },
  openrouter: { endpoint: "https://openrouter.ai/api/v1/chat/completions", defaultModel: "google/gemini-2.5-flash-lite" },
  groq: { endpoint: "https://api.groq.com/openai/v1/chat/completions", defaultModel: "llama-3.1-8b-instant" },
  deepseek: { endpoint: "https://api.deepseek.com/v1/chat/completions", defaultModel: "deepseek-chat" },
};

async function callUserKey(provider: string, apiKey: string, model: string | null, messages: any[]) {
  if (provider === "gemini") {
    const m = model || "gemini-2.5-flash";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { temperature: 0.5, responseMimeType: "application/json" },
      }),
    });
    if (!r.ok) throw new Error(`gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  if (provider === "anthropic") {
    const m = model || "claude-3-5-sonnet-20241022";
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: m,
        max_tokens: 900,
        temperature: 0.5,
        system: "You output ONLY valid JSON. No prose, no markdown.",
        messages: messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      }),
    });
    if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const d = await r.json();
    return d.content?.[0]?.text || "";
  }
  const cfg = OPENAI_COMPATIBLE[provider];
  if (!cfg) throw new Error(`Unsupported AI provider: ${provider}`);
  const endpoint = cfg.endpoint;
  const m = model || cfg.defaultModel;
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: m, messages, temperature: 0.5, response_format: { type: "json_object" } }),
  });
  if (!r.ok) throw new Error(`${provider} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const __gate = await __requireVerifiedUser(req, { denialEvent: "verification_blocked_ai", fn: "workspace-doc-ai" });
  if (!__gate.ok) return __gate.response;
  try {
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Sprint E Phase 3 — canonical AI capability gate (backend-first).
    const capAI = await requireCapability(supabase, user.id, "ai_generation");
    if (!capAI.ok) {
      return new Response(JSON.stringify(guardErrorBody(capAI)), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { task, context = "", section = "", input = "", prompt = "", state = null } = await req.json();
    const tpl = TASKS[task];
    if (!tpl) return new Response(JSON.stringify({ error: "Unknown task" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const stateJson = state ? JSON.stringify(state).slice(0, 4000) : "{}";
    const userMsg = tpl
      .replace("{{context}}", String(context).slice(0, 1500))
      .replace("{{section}}", section)
      .replace("{{prompt}}", String(prompt).slice(0, 1500))
      .replace("{{state}}", stateJson)
      + (input ? `\n\nText:\n"""${String(input).slice(0, 1500)}"""` : "");
    const messages = [
      { role: "system", content: "You output ONLY valid JSON. No prose, no markdown." },
      { role: "user", content: userMsg },
    ];

    const { data: keyRow } = await supabase
      .from("user_ai_keys").select("provider, api_key, model, is_active")
      .eq("user_id", user.id).eq("is_active", true).maybeSingle();

    // Server-side daily quota — bypass when user has BYO key.
    const hasKey = !!keyRow?.api_key;
    if (!hasKey) {
      // Sprint E Phase 5 — canonical tier-aware AI quota. BYO bypasses.
      // Map task → dashboard feature key so ai_daily_usage shows the right bucket.
      const featureKey = task.startsWith("tool_invoice") ? "invoice"
        : task.startsWith("tool_proposal") || task === "proposal_full" ? "proposal"
        : task.startsWith("tool_contract") ? "contract"
        : task === "tool_polish_full" ? `polish:${String(section || "doc").toLowerCase()}`
        : `doc_ai:${task}`;
      const q = await consumeAndCheck(supabase, user.id, "ai", capAI.capabilities.ai_quota, 1, featureKey);
      if (!q.ok) {
        return new Response(JSON.stringify({
          error: "ai_quota_exceeded",
          used: q.count, max: q.limit, tier: capAI.tier,
          message: `Daily AI limit reached (${q.count}/${q.limit}). Upgrade tier or connect your own AI key in Settings → AI Providers.`,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    let content = "", used = "platform", ok = true, err: string | null = null;
    try {
      if (keyRow?.api_key) {
        content = await callUserKey(keyRow.provider, keyRow.api_key, keyRow.model, messages);
        used = `user:${keyRow.provider}`;
      } else {
        const r = await callAIWithFallback({ messages, temperature: 0.5, max_tokens: 600 });
        content = r.content;
        used = `platform:${r.usedProvider}`;
      }
    } catch (e) {
      ok = false; err = e instanceof Error ? e.message : String(e);
    }

    await supabase.from("ai_usage_log").insert({
      user_id: user.id, provider_used: used, feature: `doc_ai:${task}`, ok, error: err,
    });

    if (!ok) return new Response(JSON.stringify({ error: err }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const json = content.match(/\{[\s\S]*\}/)?.[0] || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(json); } catch { parsed = { text: content }; }
    return new Response(JSON.stringify({ ok: true, used_provider: used, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});