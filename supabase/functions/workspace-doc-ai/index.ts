// Workspace document AI helper — drafts/improves clauses, headlines, bullets.
// Returns STRICT JSON only. BYO key first, platform fallback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/ai-fallback.ts";

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
  const endpoint = provider === "openrouter"
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const m = model || (provider === "openrouter" ? "google/gemini-2.5-flash-lite" : "gpt-4o-mini");
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

    const { task, context = "", section = "", input = "" } = await req.json();
    const tpl = TASKS[task];
    if (!tpl) return new Response(JSON.stringify({ error: "Unknown task" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userMsg = tpl.replace("{{context}}", String(context).slice(0, 1500)).replace("{{section}}", section) + (input ? `\n\nText:\n"""${String(input).slice(0, 1500)}"""` : "");
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
      const { data: quota, error: qErr } = await supabase.rpc("consume_ai_quota", {
        _user_id: user.id, _feature: `doc_ai:${task}`,
      });
      if (qErr) {
        return new Response(JSON.stringify({ error: qErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const q = quota as any;
      if (!q?.allowed) {
        return new Response(JSON.stringify({
          error: "quota_exceeded",
          used: q?.used, max: q?.max,
          message: `Daily limit reached (${q?.used}/${q?.max}). Connect your own AI key in Settings → AI Providers for unlimited assists.`,
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