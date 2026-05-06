// Quick ping to verify a user-supplied AI key works.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { provider, api_key, model } = await req.json();
    if (!provider || !api_key) {
      return new Response(JSON.stringify({ ok: false, error: "Missing provider or api_key" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ping = "Reply with the single word: OK";
    let reply = "";
    if (provider === "gemini") {
      const m = model || "gemini-2.5-flash";
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${api_key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: ping }] }] }),
      });
      if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0, 200)}`);
      const d = await r.json();
      reply = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      const endpoint = provider === "openrouter"
        ? "https://openrouter.ai/api/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
      const m = model || (provider === "openrouter" ? "google/gemini-2.5-flash-lite" : "gpt-4o-mini");
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: m, messages: [{ role: "user", content: ping }], max_tokens: 10 }),
      });
      if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0, 200)}`);
      const d = await r.json();
      reply = d.choices?.[0]?.message?.content || "";
    }
    return new Response(JSON.stringify({ ok: true, reply: reply.trim().slice(0, 80) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});