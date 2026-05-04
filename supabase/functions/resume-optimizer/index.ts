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
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { resume_text, target_category, target_role } = await req.json();
    if (!resume_text || !target_category) return new Response(JSON.stringify({ error: "resume_text and target_category are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const prompt = `You are an expert freelance resume optimizer. Re-skin this resume for the "${target_category}" freelance category${target_role ? ` targeting "${target_role}" roles` : ""}.

CURRENT RESUME:
${resume_text}

Generate:
1. **Optimized Resume**
2. **Key Skills to Highlight**
3. **Mock Portfolio Piece**
4. **Profile Summary**
5. **Improvement Tips**

Format in clean markdown.`;

    const { content, usedProvider } = await callAIWithFallback({
      messages: [
        { role: "system", content: "You are an expert resume writer specializing in freelance optimization." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return new Response(JSON.stringify({ optimized_resume: content, _provider: usedProvider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Resume optimizer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
