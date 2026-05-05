// Workspace AI helper: infers client niche/budget/vibe from a URL or text,
// and drafts personalized follow-up emails. Uses the shared AI fallback chain.
import { callAIWithFallback } from "../_shared/ai-fallback.ts";

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
  try {
    const { action, url, text, client } = await req.json();

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

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});