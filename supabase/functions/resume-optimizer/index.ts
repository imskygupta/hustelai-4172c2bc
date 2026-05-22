import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback } from "../_shared/ai-fallback.ts";
import { requireVerifiedUser as __requireVerifiedUser } from "../_shared/require-verified.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const __gate = await __requireVerifiedUser(req, { denialEvent: "verification_blocked_ai", fn: "resume-optimizer" });
  if (!__gate.ok) return __gate.response;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const action = body.action || "optimize";

    // ==== ACTION: score (ATS analysis of uploaded resume) ====
    if (action === "score") {
      const { resume_text, target_role } = body;
      if (!resume_text) return new Response(JSON.stringify({ error: "resume_text required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const prompt = `You are an ATS (Applicant Tracking System) analyzer. Analyze this resume${target_role ? ` for a "${target_role}" role` : ""} and respond ONLY in valid JSON with shape:
{
  "ats_score": <0-100>,
  "keyword_match": <0-100>,
  "format_score": <0-100>,
  "readability": <0-100>,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missing_keywords": ["..."],
  "improvements": ["..."]
}

RESUME:
${resume_text}`;
      const { content } = await callAIWithFallback({
        messages: [
          { role: "system", content: "You are a strict ATS analyzer. Output ONLY valid JSON, no markdown fences." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      });
      let parsed: any = {};
      try {
        const cleaned = content.replace(/```json\s*|\s*```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { ats_score: 70, keyword_match: 65, format_score: 72, readability: 80, strengths: [], weaknesses: [], missing_keywords: [], improvements: [content.slice(0, 200)] };
      }
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==== ACTION: autofill (single section like summary, experience bullet) ====
    if (action === "autofill") {
      const { field, context } = body;
      const prompts: Record<string, string> = {
        summary: `Write a powerful 3-4 sentence professional summary for this candidate. Be specific, results-oriented, and confident. Context:\n${JSON.stringify(context)}`,
        experience: `Write 3-4 strong bullet points (start with action verbs, include metrics where plausible) for this experience. Context:\n${JSON.stringify(context)}`,
        skills: `List 8-12 most relevant skills (comma-separated, no extra text) for:\n${JSON.stringify(context)}`,
        achievements: `Write 3 quantifiable achievement bullets for:\n${JSON.stringify(context)}`,
      };
      const prompt = prompts[field] || `Generate professional content for the "${field}" section.\nContext: ${JSON.stringify(context)}`;
      const { content } = await callAIWithFallback({
        messages: [
          { role: "system", content: "You write concise, ATS-friendly resume content. No markdown, no preamble." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      });
      return new Response(JSON.stringify({ content: content.trim() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==== ACTION: optimize (legacy / full re-skin) ====
    const { resume_text, target_category, target_role } = body;
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
