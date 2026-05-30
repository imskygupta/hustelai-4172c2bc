import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireVerifiedUser as __requireVerifiedUser } from "../_shared/require-verified.ts";
import { enforceAIQuota } from "../_shared/tier/enforce-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const __gate = await __requireVerifiedUser(req, { denialEvent: "verification_blocked_ai", fn: "hustle-roadmap" });
  if (!__gate.ok) return __gate.response;

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

    const userId = (claimsData.claims as any).sub as string;
    // Sprint F — server-side AI quota gate.
    const quotaGate = await enforceAIQuota(userId, "roadmap", corsHeaders);
    if (quotaGate) return quotaGate;

    const { title, category, description, earnings, startup_cost, type } = await req.json();

    const prompt = `You are an expert business advisor and career coach. Generate a comprehensive, actionable roadmap for starting this side hustle / freelancing opportunity:

**Title:** ${title}
**Category:** ${category}
**Description:** ${description}
**Expected Earnings:** ${earnings}
**Startup Cost:** ${startup_cost || "$0"}
**Type:** ${type}

Create a detailed roadmap with the following sections using markdown formatting:

## 📋 Overview
Brief summary of the opportunity and why it's worth pursuing.

## 🎯 Prerequisites
- Skills needed
- Tools/resources required
- Time investment expected

## 🗺️ Step-by-Step Roadmap

### Phase 1: Getting Started (Week 1-2)
Detailed actionable steps...

### Phase 2: Building Foundation (Week 3-4)
Detailed actionable steps...

### Phase 3: Growing & Scaling (Month 2-3)
Detailed actionable steps...

### Phase 4: Optimization & Automation (Month 3+)
Detailed actionable steps...

## 💰 Revenue Strategy
- How to price your services
- Income milestones
- Scaling strategies

## 🔧 Recommended Tools & Platforms
List of specific tools, websites, and platforms to use.

## ⚠️ Common Pitfalls to Avoid
Key mistakes beginners make and how to avoid them.

## 📈 Success Tips
Pro tips from experienced practitioners.

## 🔗 Free Resources to Learn
List real websites, YouTube channels, and free courses.

Make it practical, specific, and actionable. Use real platform names and specific strategies. Be thorough — this should be a complete guide someone can follow.`;

    const { callAIWithFallback } = await import("../_shared/ai-fallback.ts");
    const { content: roadmap } = await callAIWithFallback({
      messages: [
        { role: "system", content: "You are an expert business advisor. Provide detailed, practical, and actionable advice. Always use markdown formatting." },
        { role: "user", content: prompt },
      ],
    });

    return new Response(JSON.stringify({ roadmap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hustle-roadmap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
