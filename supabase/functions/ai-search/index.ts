import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `You are a freelancing and side hustle expert. Given a user query, generate 6-8 relevant freelancing opportunities, side hustles, or gig ideas. For each result provide practical, actionable information. Consider the user's constraints (budget, skills, time).`,
          },
          {
            role: "user",
            content: query,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_freelance_ideas",
              description: "Return freelancing ideas as structured data",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique ID" },
                        title: { type: "string", description: "Name of the freelancing role or side hustle" },
                        category: {
                          type: "string",
                          enum: ["Tech", "Creative", "Writing", "Marketing", "Teaching", "Services", "E-commerce", "Finance", "Other"],
                        },
                        description: { type: "string", description: "2-3 sentence actionable description" },
                        investment: {
                          type: "string",
                          enum: ["$0 - Free", "$1-50", "$50-200", "$200-500", "$500+"],
                        },
                        difficulty: {
                          type: "string",
                          enum: ["Beginner", "Intermediate", "Advanced"],
                        },
                        earning_potential: {
                          type: "string",
                          description: "e.g. $500-2000/month",
                        },
                        tags: {
                          type: "array",
                          items: { type: "string" },
                          description: "2-4 relevant tags",
                        },
                      },
                      required: ["id", "title", "category", "description", "investment", "difficulty", "earning_potential", "tags"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["results"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_freelance_ideas" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured response from AI");

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
