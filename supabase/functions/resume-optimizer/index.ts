import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { resume_text, target_category, target_role } = await req.json();
    if (!resume_text || !target_category) return new Response(JSON.stringify({ error: "resume_text and target_category are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ZHIPU_API_KEY = Deno.env.get("ZHIPU_API_KEY");
    if (!ZHIPU_API_KEY) throw new Error("ZHIPU_API_KEY not configured");

    const prompt = `You are an expert freelance resume optimizer. Given the user's resume/CV text, re-skin it specifically for the "${target_category}" freelance category${target_role ? ` targeting "${target_role}" roles` : ""}.

CURRENT RESUME:
${resume_text}

Generate:
1. **Optimized Resume** - Restructured and rewritten to highlight relevant skills for ${target_category}. Use action verbs, quantify achievements, and remove irrelevant info.
2. **Key Skills to Highlight** - Top 5-8 skills most relevant for this category
3. **Mock Portfolio Piece** - Create a hypothetical project description that demonstrates capability in ${target_category}. Include project name, description, technologies used, and outcome.
4. **Profile Summary** - A 2-3 sentence professional bio optimized for ${target_category} freelancing
5. **Improvement Tips** - 3-5 specific suggestions to strengthen the profile

Format everything in clean markdown.`;

    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ZHIPU_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "glm-4.7-flash",
        messages: [
          { role: "system", content: "You are an expert resume writer specializing in freelance and side hustle optimization. Create compelling, specific, and professional content." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Zhipu API error:", response.status, errText);
      throw new Error(`Zhipu API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "Failed to optimize resume.";

    return new Response(JSON.stringify({ optimized_resume: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Resume optimizer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
