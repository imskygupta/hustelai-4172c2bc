import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/ai-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Tier check - Pro/Elite/Infinity only
    const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
    if (!profile || profile.subscription_tier === "free") {
      return new Response(JSON.stringify({ error: "This tool requires Pro tier or above" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { category, skills } = await req.json();
    if (!category) return new Response(JSON.stringify({ error: "category is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const prompt = `You are a Gig Arbitrage Analyst. Analyze the "${category}" freelance market and find price arbitrage opportunities.

User's skills: ${skills || "General"}

Find and present:
1. **Arbitrage Opportunities** (5-8 opportunities):
   For each one provide:
   - Service: What the client needs
   - Client Platform: Where clients post (X/Twitter, Reddit, LinkedIn, local forums)
   - Typical Client Budget: What clients pay ($)
   - Fulfillment Cost: How much it costs to fulfill using AI tools or outsourcing
   - Profit Margin: Estimated profit per gig
   - Difficulty: Easy/Medium/Hard
   - AI Tools to Use: Specific tools that can help deliver

2. **Market Insights**:
   - Current demand level (High/Medium/Low)
   - Best platforms to find clients
   - Trending requests in this category
   - Seasonal patterns

3. **Quick Start Strategy**:
   - How to position as an "agency"
   - Pricing strategy recommendations
   - First 3 steps to start earning

Format as clean markdown with tables where appropriate.`;

    const { content: analysis } = await callAIWithFallback({
      messages: [
        { role: "system", content: "You are a savvy freelance market analyst who specializes in finding price arbitrage opportunities across platforms. Be specific with numbers and actionable advice." },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 3500,
    });

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Gig arbitrage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
