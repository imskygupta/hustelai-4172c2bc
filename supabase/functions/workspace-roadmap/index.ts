// Workspace Roadmap — lightweight AI classification only.
// Heavy lifting (phase generation, tool recs, reminders) happens client-side
// via the deterministic rules engine. This function ONLY returns a structured
// Classification JSON. Falls back gracefully to heuristic on AI failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/ai-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You classify freelancer client briefs into structured tags.
Return ONLY valid JSON. No prose. No markdown.`;

const SCHEMA = `Return JSON exactly:
{
  "project_type": "website"|"ecommerce"|"branding"|"design"|"content"|"video"|"social_media"|"seo"|"app_mobile"|"app_web"|"automation"|"consulting"|"marketing"|"ads"|"writing"|"other",
  "workflow_type": "one_off"|"milestone"|"retainer"|"hourly",
  "client_category": "individual"|"smb"|"startup"|"agency"|"enterprise",
  "urgency": "low"|"normal"|"high"|"rush",
  "budget_tier": "micro"|"small"|"mid"|"large"|"enterprise",
  "deliverables": string[],
  "estimated_weeks": number,
  "signals": string[]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { input, brief } = await req.json();
    if (!input || typeof input !== "string" || input.length < 5) {
      return new Response(JSON.stringify({ error: "Provide project notes (min 5 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMsg = `${SCHEMA}\n\nFreelancer's project notes:\n"""${input.slice(0, 3000)}"""\n\nKnown brief context (may be empty):\n${JSON.stringify(brief || {}).slice(0, 1500)}`;

    let classification: any = null;
    let used = "heuristic";
    try {
      const r = await callAIWithFallback({
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userMsg }],
        temperature: 0.1,
        max_tokens: 500,
      });
      used = `platform:${r.usedProvider}`;
      const json = r.content.match(/\{[\s\S]*\}/)?.[0] || "{}";
      classification = JSON.parse(json);
    } catch (_e) {
      classification = null;
    }

    return new Response(JSON.stringify({ ok: true, used_provider: used, classification }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});