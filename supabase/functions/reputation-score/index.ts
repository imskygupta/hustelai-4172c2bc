import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // === AUTH CHECK ===
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
      return new Response(JSON.stringify({ error: "Unauthorized - invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // === END AUTH CHECK ===

    const { reviews } = await req.json();

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return new Response(JSON.stringify({ error: "Reviews array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reviewTexts = reviews.map((r: any, i: number) =>
      `Review ${i + 1} (${r.rating}/5 stars): "${r.text}" — ${r.name}, ${r.role}`
    ).join("\n");

    const { callAIWithFallback } = await import("../_shared/ai-fallback.ts");
    let content = "";
    try {
      const r = await callAIWithFallback({
        messages: [
          {
            role: "system",
            content: `You are a sentiment analysis expert. Analyze freelancer reviews and generate a reputation profile.

Return JSON only (no markdown):
{
  "overall_score": 0-100,
  "sentiment": "very_positive|positive|neutral|negative|very_negative",
  "trust_tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"],
  "strengths": ["Strength 1", "Strength 2"],
  "areas_to_improve": ["Area 1"],
  "trust_summary": "2-3 sentence summary of this freelancer's reputation",
  "review_highlights": [
    { "quote": "Key quote from review", "sentiment": "positive|negative|neutral", "tag": "Associated trust tag" }
  ]
}`
          },
          { role: "user", content: `Analyze these reviews and generate a reputation score:\n\n${reviewTexts}` },
        ],
      });
      content = r.content;
    } catch (e) {
      throw e;
    }
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify({ result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ result: null, raw: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("reputation-score error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
