import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generate a short follow-up / reminder / negotiation reply.
 * Uses the user's BYO API key first, falls back to platform LOVABLE_API_KEY.
 * Returns: { text: string, provider: string }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const { kind, client_name, context } = body || {};
    if (!kind) return json({ error: "kind required" }, 400);

    const prompts: Record<string, string> = {
      followup: `Write a short, warm 3-4 line follow-up email to ${client_name || "the client"}. Context: ${context || ""}. Be professional and friendly.`,
      payment_reminder: `Write a short, polite 3-line payment reminder to ${client_name || "the client"}. Context: ${context || ""}. Firm but respectful.`,
      negotiation: `Write a short 3-4 line negotiation reply for ${client_name || "the client"}. Context: ${context || ""}. Confident but flexible.`,
      proposal_nudge: `Write a 2-line nudge asking ${client_name || "the client"} if they had a chance to review the proposal. Context: ${context || ""}.`,
    };
    const userPrompt = prompts[kind] || prompts.followup;

    // Try user's key
    const { data: keyRow } = await supabase
      .from("user_ai_keys").select("provider, api_key").eq("user_id", user.id).eq("is_active", true).maybeSingle();

    let text = "";
    let providerUsed = "platform";

    if (keyRow?.api_key && keyRow.provider === "gemini") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyRow.api_key}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: userPrompt }] }] }),
      });
      const j = await r.json();
      text = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      providerUsed = "user_gemini";
    }

    if (!text) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You write short, professional freelancer messages. Reply with the message text only — no preamble." },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      const j = await r.json();
      text = j?.choices?.[0]?.message?.content || "";
    }

    await supabase.from("ai_usage_log").insert({
      user_id: user.id, feature: "workspace_followup", provider_used: providerUsed, ok: !!text,
    });

    return json({ text: text.trim(), provider: providerUsed });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(d: any, status = 200) {
  return new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}