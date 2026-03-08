import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You are a news and market data aggregator. Return current trending data.",
          },
          {
            role: "user",
            content: "Generate realistic current trending data for a freelancer dashboard. Include: 1) 8 breaking news headlines about tech/business/freelancing, 2) 6 stock ticker items with symbols and prices and change percentages, 3) 6 discover cards with trending topics freelancers should know about (title, short description, category). Make it feel current for March 2026.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_dashboard_feed",
              description: "Return dashboard feed data",
              parameters: {
                type: "object",
                properties: {
                  headlines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        source: { type: "string" },
                      },
                      required: ["text", "source"],
                    },
                  },
                  stocks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        symbol: { type: "string" },
                        price: { type: "string" },
                        change: { type: "string" },
                        up: { type: "boolean" },
                      },
                      required: ["symbol", "price", "change", "up"],
                    },
                  },
                  discover: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        category: { type: "string" },
                      },
                      required: ["title", "description", "category"],
                    },
                  },
                },
                required: ["headlines", "stocks", "discover"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_dashboard_feed" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured response");

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dashboard-feed error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
