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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { hustle_title, hustle_description, user_skills } = await req.json();
    if (!hustle_title) return new Response(JSON.stringify({ error: "hustle_title is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const prompt = `You are HustleAI Blueprint Generator. Create a detailed 7-day action plan to help someone start "${hustle_title}".

Description: ${hustle_description || "N/A"}
User Skills: ${user_skills || "General skills"}

Generate a comprehensive blueprint with:
1. **Day 1-7 Checklist**: Specific daily tasks with time estimates
2. **Target List**: 5-10 potential clients/targets they can reach out to (with examples of where to find them)
3. **Outreach Script**: A customizable cold outreach message template
4. **Tools Needed**: Free/cheap tools to get started
5. **Expected Timeline**: When they can expect first income
6. **Pro Tips**: 3-5 insider tips for this specific hustle

Format with clear markdown headers and bullet points. Be specific and actionable, not generic.`;

    const { content: blueprint } = await callAIWithFallback({
      messages: [
        { role: "system", content: "You are an expert freelance consultant who creates actionable 7-day blueprints. Be specific, practical, and motivating." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return new Response(JSON.stringify({ blueprint }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Blueprint error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
