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

    const userId = claimsData.claims.sub as string;
    // === END AUTH CHECK ===

    const { current_skills, goals } = await req.json();

    // Fetch user profile for context
    let profileContext = "";
    try {
      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("display_name, bio, subscription_tier")
        .eq("user_id", userId)
        .single();

      if (profile) {
        profileContext = `User: ${profile.display_name || "Freelancer"}, Bio: ${profile.bio || "Not set"}, Tier: ${profile.subscription_tier}`;
      }
    } catch (e) {
      console.error("Profile fetch error:", e);
    }

    const skillsList = current_skills?.length ? current_skills.join(", ") : "Not specified";
    const goalsText = goals || "Increase freelance income";

    const { callAIWithFallback } = await import("../_shared/ai-fallback.ts");
    const aiResult = await callAIWithFallback({
      messages: [
          {
            role: "system",
            content: `You are an expert career consultant for freelancers. Analyze the user's current skills and suggest a personalized learning roadmap.

${profileContext}

Return a JSON response with this exact structure (no markdown, just raw JSON):
{
  "skill_assessment": "Brief assessment of current skill level and market position",
  "gaps": [
    {
      "skill": "Skill name",
      "reason": "Why this skill is valuable",
      "earning_boost": "Estimated hourly rate increase (in INR)",
      "difficulty": "easy|medium|hard",
      "time_to_learn": "Estimated learning time"
    }
  ],
  "roadmap": [
    {
      "phase": 1,
      "title": "Phase title",
      "duration": "e.g., 2-4 weeks",
      "skills": ["skill1", "skill2"],
      "resources": ["Free resource or course name"],
      "milestone": "What you can do after this phase"
    }
  ],
  "earning_projection": {
    "current_range": "₹X - ₹Y/hr",
    "projected_range": "₹X - ₹Y/hr after completing roadmap",
    "timeline": "Expected time to reach projected earnings"
  },
  "trending_combinations": ["Skill combo 1", "Skill combo 2"]
}`
          },
          {
            role: "user",
            content: `My current skills: ${skillsList}\nMy goals: ${goalsText}\n\nAnalyze my skill gaps and create a learning roadmap with trending high-paying skills I should learn next. Focus on the Indian freelancing market and give earnings in INR.`
          }
        ],
    });
    let content = aiResult.content;
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
    console.error("skill-gap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
