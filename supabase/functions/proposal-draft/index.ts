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
    const { job_description, tone, focus } = await req.json();

    if (!job_description || job_description.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Job description must be at least 10 characters." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
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

    // Check tier
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("subscription_tier, display_name, bio, email")
      .eq("user_id", userId)
      .single();

    if (!profile || !["pro", "elite", "infinity"].includes(profile.subscription_tier)) {
      return new Response(JSON.stringify({ error: "This feature requires Pro, Elite, or Infinity subscription." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toneLabel = tone || "Professional";
    const focusLabel = focus || "ROI and results";
    const userName = profile.display_name || "Freelancer";
    const userBio = profile.bio || "Experienced freelancer";

    const systemPrompt = `You are an expert freelance proposal writer. You help freelancers write winning proposals that get hired. 

Write a personalized, compelling proposal based on:
- Freelancer name: ${userName}
- Freelancer bio/skills: ${userBio}
- Tone: ${toneLabel}
- Focus area: ${focusLabel}

Rules:
1. Write exactly 3 paragraphs
2. First paragraph: Hook — show you understand their problem and reference specifics from the job description
3. Second paragraph: Solution — explain your approach, relevant experience, and how you'll deliver results
4. Third paragraph: Close — provide a clear call-to-action and availability
5. Keep it concise (200-300 words total)
6. Be specific, not generic. Reference actual details from the job description
7. Focus on ${focusLabel}
8. Use a ${toneLabel.toLowerCase()} tone throughout
9. Do NOT use placeholder brackets like [Your Name] — use the actual freelancer info provided`;

    const { callAIWithFallback } = await import("../_shared/ai-fallback.ts");
    const { content } = await callAIWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the job description I want to apply to:\n\n${job_description.slice(0, 3000)}` },
      ],
    });
    if (!content) throw new Error("No response from AI");

    return new Response(JSON.stringify({ proposal: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("proposal-draft error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
