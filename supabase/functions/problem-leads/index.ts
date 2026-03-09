import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AiProvider {
  provider_name: string;
  api_key: string;
  api_endpoint: string;
  default_model: string;
  priority: number;
}

async function getActiveProviders(supabase: any): Promise<AiProvider[]> {
  const { data, error } = await supabase
    .from("ai_provider_keys")
    .select("provider_name, api_key, api_endpoint, default_model, priority")
    .eq("is_active", true)
    .order("priority", { ascending: true });
  if (error || !data) return [];
  return data;
}

async function callAiProvider(provider: AiProvider, messages: any[]): Promise<any> {
  let apiKey = provider.api_key;
  
  // For lovable_ai, use the LOVABLE_API_KEY secret
  if (provider.provider_name === "lovable_ai") {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY not configured");
    apiKey = key;
  }

  const response = await fetch(provider.api_endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.default_model,
      messages,
      tools: [
        {
          type: "function",
          function: {
            name: "return_problem_leads",
            description: "Return analyzed problem leads from Reddit posts",
            parameters: {
              type: "object",
              properties: {
                leads: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Post title" },
                      subreddit: { type: "string" },
                      pain_point: { type: "string", description: "The specific pain point identified" },
                      opportunity: { type: "string", description: "How a freelancer could help" },
                      service_category: { type: "string", enum: ["Automation", "Design", "Writing", "Marketing", "Development", "Data Entry", "Consulting", "Video", "Social Media", "Other"] },
                      intent_level: { type: "string", enum: ["High", "Medium", "Low"] },
                      suggested_pitch: { type: "string", description: "A short outreach message template" },
                      url: { type: "string" },
                      author: { type: "string" },
                      upvotes: { type: "number" },
                    },
                    required: ["title", "subreddit", "pain_point", "opportunity", "service_category", "intent_level", "suggested_pitch"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["leads"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_problem_leads" } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${provider.provider_name} error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error(`No tool call from ${provider.provider_name}`);
  return JSON.parse(toolCall.function.arguments);
}

async function fetchRedditPosts(subreddits: string[], limit: number = 25): Promise<string> {
  const allPosts: any[] = [];

  for (const sub of subreddits) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=${limit}`, {
        headers: { "User-Agent": "HustleAI/1.0" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const posts = data?.data?.children || [];
      for (const p of posts) {
        const d = p.data;
        allPosts.push({
          title: d.title,
          selftext: (d.selftext || "").slice(0, 500),
          subreddit: d.subreddit,
          url: `https://reddit.com${d.permalink}`,
          author: d.author,
          score: d.score,
          num_comments: d.num_comments,
        });
      }
    } catch (e) {
      console.error(`Failed to fetch r/${sub}:`, e);
    }
  }

  return JSON.stringify(allPosts.slice(0, 50));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, subreddits } = await req.json();

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is elite/infinity
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
    if (!profile || !["elite", "infinity"].includes(profile.subscription_tier)) {
      return new Response(JSON.stringify({ error: "This feature requires Elite or Infinity subscription." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default subreddits
    const subs = subreddits?.length ? subreddits : [
      "smallbusiness", "Entrepreneur", "freelance", "startups",
      "SideProject", "marketing", "webdev", "graphic_design",
    ];

    console.log("Fetching Reddit posts from:", subs.join(", "));
    const redditData = await fetchRedditPosts(subs);

    const systemPrompt = `You are an expert at identifying high-intent freelance leads from social media posts. 
Analyze the following Reddit posts and identify posts where someone is expressing frustration about a problem that a freelancer could solve. 
Look for posts where people say things like "I'm struggling with...", "I need help with...", "Does anyone know how to...", "I'm losing my mind doing X manually", etc.

${query ? `Focus especially on: ${query}` : ""}

For each lead, provide:
- The specific pain point
- What freelance service could address it
- A suggested pitch/outreach message
- Intent level (High = actively looking for help, Medium = frustrated but not explicitly asking, Low = mentioning a problem casually)

Only return genuine leads where a freelancer could realistically offer their services. Skip joke posts, memes, and posts that are just venting without a solvable problem.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here are the latest Reddit posts:\n\n${redditData}\n\nAnalyze these and return the top problem-lead opportunities.` },
    ];

    // Get active providers and try them in order
    const providers = await getActiveProviders(supabase);
    if (providers.length === 0) {
      return new Response(JSON.stringify({ error: "No AI providers configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let lastError: Error | null = null;
    for (const provider of providers) {
      try {
        console.log(`Trying provider: ${provider.provider_name} (${provider.default_model})`);
        const result = await callAiProvider(provider, messages);
        console.log(`Success with ${provider.provider_name}, found ${result.leads?.length || 0} leads`);
        return new Response(JSON.stringify({ ...result, provider_used: provider.provider_name }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error(`Provider ${provider.provider_name} failed:`, e);
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }

    return new Response(JSON.stringify({ error: `All AI providers failed. Last error: ${lastError?.message}` }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("problem-leads error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
