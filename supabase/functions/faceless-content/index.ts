import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireVerifiedUser as __requireVerifiedUser } from "../_shared/require-verified.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const __gate = await __requireVerifiedUser(req, { denialEvent: "verification_blocked_ai", fn: "faceless-content" });
  if (!__gate.ok) return __gate.response;

  try {
    const { topic, niche, tone } = await req.json();
    if (!topic || topic.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Topic must be at least 5 characters." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await serviceClient
      .from("profiles").select("subscription_tier").eq("user_id", userId).single();
    const tier = profile?.subscription_tier || "free";

    if (tier === "free") {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { count } = await serviceClient
        .from("payment_status_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "ai_tool_use:faceless")
        .gte("created_at", since.toISOString());
      if ((count ?? 0) >= 5) {
        return new Response(JSON.stringify({ error: "Free tier limit reached (5 uses / 30 days). Upgrade to Pro for unlimited access." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const systemPrompt = `You are a viral faceless content strategist. Return STRICT JSON ONLY (no markdown fences).

Schema:
{
  "title": <string>,
  "hook": <string>,
  "scenes": [
    { "scene_number": 1, "visual": <string>, "voiceover": <string>, "text_overlay": <string>, "duration_seconds": <number> },
    ... exactly 6 scenes total
  ],
  "cta": <string>,
  "hashtags": [<string>, ... 6-10 items]
}

Rules:
- Exactly 6 scenes (storyboard format).
- Visuals must be specific & describable for stock footage / AI video generators (Runway, Pika).
- Voiceover lines under 18 words each.
- Total runtime under 60 seconds.`;

    const userPrompt = `Topic: ${topic}\nNiche: ${niche || "general"}\nTone: ${tone || "engaging"}`;

    const { callAIWithFallback } = await import("../_shared/ai-fallback.ts");
    const { content: rawContent } = await callAIWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    let content = rawContent;
    content = content.replace(/```json|```/g, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { throw new Error("AI returned invalid JSON"); }

    if (tier === "free") {
      await serviceClient.from("payment_status_logs").insert({
        user_id: userId, status: "ai_tool_use:faceless", message: "Faceless content storyboard",
      });
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("faceless-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});