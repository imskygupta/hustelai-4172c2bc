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
    const { user_id, current_skills, goals } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch user profile for context
    let profileContext = "";
    if (user_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, bio, subscription_tier")
        .eq("user_id", user_id)
        .single();

      if (profile) {
        profileContext = `User: ${profile.display_name || "Freelancer"}, Bio: ${profile.bio || "Not set"}, Tier: ${profile.subscription_tier}`;
      }
    }

    const skillsList = current_skills?.length ? current_skills.join(", ") : "Not specified";
    const goalsText = goals || "Increase freelance income";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact admin." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Clean markdown code blocks if present
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
