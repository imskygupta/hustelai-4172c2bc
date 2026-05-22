// Quick ping to verify a user-supplied AI key works.
import { requireVerifiedUser as __requireVerifiedUser } from "../_shared/require-verified.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Provider endpoint map. Groq, DeepSeek, Together — all OpenAI-compatible.
const OPENAI_COMPATIBLE: Record<string, { endpoint: string; defaultModel: string }> = {
  openai:     { endpoint: "https://api.openai.com/v1/chat/completions",       defaultModel: "gpt-4o-mini" },
  openrouter: { endpoint: "https://openrouter.ai/api/v1/chat/completions",    defaultModel: "google/gemini-2.5-flash-lite" },
  groq:       { endpoint: "https://api.groq.com/openai/v1/chat/completions",  defaultModel: "llama-3.1-8b-instant" },
  deepseek:   { endpoint: "https://api.deepseek.com/v1/chat/completions",     defaultModel: "deepseek-chat" },
};

function classifyError(status: number, body: string): string {
  if (status === 401 || status === 403) return "Invalid API key — check it was copied in full.";
  if (status === 429) return "Rate limit hit. Provider says: slow down or upgrade your plan.";
  if (status === 402) return "Payment required — your provider account has no credits.";
  if (status === 404) return "Model not found on this provider. Try a different model.";
  if (status >= 500) return `Provider is having issues (${status}). Try again in a moment.`;
  return `${status}: ${body.slice(0, 180)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const __gate = await __requireVerifiedUser(req, { denialEvent: "verification_blocked_ai", fn: "ai-key-test" });
  if (!__gate.ok) return __gate.response;
  try {
    const { provider, api_key, model } = await req.json();
    if (!provider || !api_key) {
      return new Response(JSON.stringify({ ok: false, error: "Missing provider or api_key" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ping = "Reply with the single word: OK";
    let reply = "";
    let usedModel = model || "";

    if (provider === "gemini") {
      usedModel = model || "gemini-2.5-flash";
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${usedModel}:generateContent?key=${api_key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: ping }] }] }),
      });
      if (!r.ok) throw new Error(classifyError(r.status, await r.text()));
      const d = await r.json();
      reply = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (provider === "anthropic") {
      usedModel = model || "claude-3-5-sonnet-20241022";
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": api_key,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: usedModel,
          max_tokens: 16,
          messages: [{ role: "user", content: ping }],
        }),
      });
      if (!r.ok) throw new Error(classifyError(r.status, await r.text()));
      const d = await r.json();
      reply = d.content?.[0]?.text || "";
    } else {
      const cfg = OPENAI_COMPATIBLE[provider];
      if (!cfg) throw new Error(`Unsupported provider: ${provider}`);
      usedModel = model || cfg.defaultModel;
      const r = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: usedModel, messages: [{ role: "user", content: ping }], max_tokens: 10 }),
      });
      if (!r.ok) throw new Error(classifyError(r.status, await r.text()));
      const d = await r.json();
      reply = d.choices?.[0]?.message?.content || "";
    }
    return new Response(JSON.stringify({ ok: true, reply: reply.trim().slice(0, 80), model: usedModel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});