// Workspace Intake — structured client-project extraction
// Returns STRICT JSON only. Uses BYO key first if user has one, else platform fallback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/ai-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are an AI Project Intake Assistant for a freelancer.
Extract a clean structured project brief from the freelancer's raw notes / chat input.
You output ONLY valid JSON. No prose. No markdown fences. No explanation.`;

const SCHEMA_HINT = `Return JSON exactly matching:
{
  "client_name": string,
  "client_company": string|null,
  "client_contact": string|null,
  "project_scope": string,                 // 1-3 sentences, crisp
  "deliverables": string[],                // bullet list, concrete
  "timeline": [ { "milestone": string, "due": string } ],
  "pricing": { "model": "fixed"|"hourly"|"retainer"|"unknown", "amount": number|null, "currency": string },
  "payment_structure": string,             // e.g. "50% upfront, 50% on delivery"
  "risks": string[],                       // potential project risks
  "next_actions": string[],                // 3-5 concrete next steps for the freelancer
  "summary": string                        // 1 sentence cinematic recap
}`;

async function callUserKey(provider: string, apiKey: string, model: string | null, messages: any[]) {
  if (provider === "gemini") {
    const m = model || "gemini-2.5-flash";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
    });
    if (!r.ok) throw new Error(`gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  // openrouter / openai-compatible
  const endpoint = provider === "openrouter"
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const m = model || (provider === "openrouter" ? "google/gemini-2.5-flash-lite" : "gpt-4o-mini");
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: m, messages, temperature: 0.3, response_format: { type: "json_object" } }),
  });
  if (!r.ok) throw new Error(`${provider} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { input, action = "extract" } = await req.json();
    if (!input || typeof input !== "string" || input.length < 5) {
      return new Response(JSON.stringify({ error: "Provide at least 5 chars of project notes" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userMsg = action === "extract"
      ? `${SCHEMA_HINT}\n\nFreelancer notes about the new client/project:\n"""${input.slice(0, 4000)}"""`
      : input;

    const messages = [
      { role: "system", content: SYSTEM },
      { role: "user", content: userMsg },
    ];

    // BYO key path
    const { data: keyRow } = await supabase
      .from("user_ai_keys")
      .select("provider, api_key, model, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    let content = "";
    let used = "platform";
    let ok = true;
    let err: string | null = null;

    try {
      if (keyRow?.api_key) {
        content = await callUserKey(keyRow.provider, keyRow.api_key, keyRow.model, messages);
        used = `user:${keyRow.provider}`;
      } else {
        const r = await callAIWithFallback({ messages, temperature: 0.3, max_tokens: 1200 });
        content = r.content;
        used = `platform:${r.usedProvider}`;
      }
    } catch (e) {
      ok = false;
      err = e instanceof Error ? e.message : String(e);
    }

    // log usage
    await supabase.from("ai_usage_log").insert({
      user_id: user.id,
      provider_used: used,
      feature: "workspace_intake",
      ok,
      error: err,
    });

    if (!ok) {
      return new Response(JSON.stringify({ error: err || "AI failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = content.match(/\{[\s\S]*\}/)?.[0] || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(json); } catch { parsed = { raw: content }; }

    return new Response(JSON.stringify({ ok: true, used_provider: used, brief: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});