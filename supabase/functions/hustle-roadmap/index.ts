import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, category, description, earnings, startup_cost, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert business advisor. Provide detailed, practical, and actionable advice. Always use markdown formatting." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const roadmap = data.choices?.[0]?.message?.content || "Failed to generate roadmap.";

    return new Response(JSON.stringify({ roadmap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hustle-roadmap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
