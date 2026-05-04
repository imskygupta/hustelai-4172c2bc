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
    const { service_description, experience_level, target_market } = await req.json();
    if (!service_description || service_description.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Describe your service in at least 10 characters." }), {
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
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", userId)
      .single();
    const tier = profile?.subscription_tier || "free";

    // Free tier: 3-uses limit (across new tools), tracked via simple insert log
    if (tier === "free") {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { count } = await serviceClient
        .from("payment_status_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "ai_tool_use:gig-price")
        .gte("created_at", since.toISOString());
      if ((count ?? 0) >= 5) {
        return new Response(JSON.stringify({ error: "Free tier limit reached (5 uses / 30 days). Upgrade to Pro for unlimited access." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const systemPrompt = `You are an expert pricing strategist for freelancers. Return STRICT JSON ONLY (no prose, no markdown fences).

Schema:
{
  "currency": "INR",
  "tiers": [
    { "name": "Basic", "price": <number>, "delivery_days": <number>, "what_you_get": [<string>, ...], "best_for": <string> },
    { "name": "Standard", "price": <number>, "delivery_days": <number>, "what_you_get": [<string>, ...], "best_for": <string> },
    { "name": "Premium", "price": <number>, "delivery_days": <number>, "what_you_get": [<string>, ...], "best_for": <string> }
  ],
  "rationale": <string>,
  "psych_tip": <string>
}

Rules:
- Prices in INR (Indian rupees). Realistic numbers based on Indian freelance market.
- Standard ~ 2.2x Basic. Premium ~ 4.5x Basic. Use anchor pricing psychology.
- Each tier 3-5 deliverables.`;

    const userPrompt = `Service: ${service_description}\nExperience level: ${experience_level || "intermediate"}\nTarget market: ${target_market || "Indian freelance market"}`;

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
        user_id: userId, status: "ai_tool_use:gig-price", message: "Gig price calculator usage",
      });
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gig-price-calculator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});