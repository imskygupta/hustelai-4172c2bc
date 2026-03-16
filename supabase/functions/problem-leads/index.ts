import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Source Fetchers ──

async function fetchRedditPosts(subreddits: string[], limit = 25): Promise<any[]> {
  const allPosts: any[] = [];
  for (const sub of subreddits) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=${limit}`, {
        headers: { "User-Agent": "HustleAI/1.0" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const p of (data?.data?.children || [])) {
        const d = p.data;
        allPosts.push({
          source: "reddit",
          title: d.title,
          body: (d.selftext || "").slice(0, 500),
          subreddit: d.subreddit,
          url: `https://reddit.com${d.permalink}`,
          author: d.author,
          score: d.score,
          comments: d.num_comments,
        });
      }
    } catch (e) { console.error(`Reddit r/${sub}:`, e); }
  }
  return allPosts;
}

async function fetchStackOverflow(query: string): Promise<any[]> {
  try {
    const tags = query ? `&tagged=${encodeURIComponent(query)}` : "";
    const res = await fetch(
      `https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&site=stackoverflow&filter=withbody&pagesize=30&noAnswers=true${tags}`,
      { headers: { "Accept-Encoding": "gzip" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((q: any) => ({
      source: "stackoverflow",
      title: q.title,
      body: (q.body || "").replace(/<[^>]*>/g, "").slice(0, 500),
      url: q.link,
      author: q.owner?.display_name || "anonymous",
      score: q.score,
      comments: q.answer_count,
      tags: q.tags,
      views: q.view_count,
    }));
  } catch (e) { console.error("StackOverflow:", e); return []; }
}

async function fetchHackerNews(query: string): Promise<any[]> {
  try {
    const q = query || "freelance help needed";
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=ask_hn,show_hn,story&hitsPerPage=30`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || []).map((h: any) => ({
      source: "hackernews",
      title: h.title || h.story_title || "",
      body: (h.story_text || h.comment_text || "").replace(/<[^>]*>/g, "").slice(0, 500),
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      author: h.author,
      score: h.points || 0,
      comments: h.num_comments || 0,
    }));
  } catch (e) { console.error("HackerNews:", e); return []; }
}

async function fetchAdzunaJobs(query: string): Promise<any[]> {
  const appId = Deno.env.get("ADZUNA_APP_ID");
  const apiKey = Deno.env.get("ADZUNA_API_KEY");
  if (!appId || !apiKey) { console.log("Adzuna keys not configured"); return []; }
  try {
    const q = query || "freelancer needed";
    const res = await fetch(
      `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${apiKey}&results_per_page=20&what=${encodeURIComponent(q)}&sort_by=date`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((j: any) => ({
      source: "adzuna",
      title: j.title,
      body: (j.description || "").replace(/<[^>]*>/g, "").slice(0, 500),
      url: j.redirect_url,
      author: j.company?.display_name || "Unknown",
      score: 0,
      comments: 0,
      salary_min: j.salary_min,
      salary_max: j.salary_max,
      location: j.location?.display_name,
      category: j.category?.label,
    }));
  } catch (e) { console.error("Adzuna:", e); return []; }
}

// ── AI Analysis ──

async function analyzeWithAI(posts: any[], query: string, mode: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const systemPrompts: Record<string, string> = {
    leads: `You are an expert at identifying high-intent freelance leads from social media and job posts.
Analyze the posts and identify where someone is expressing frustration or needs help that a freelancer could solve.
${query ? `Focus especially on: ${query}` : ""}

For each lead provide:
- The specific pain point
- What freelance service could address it
- An intent_score from 1-10 (10 = actively looking for help/willing to pay)
- intent_level: High (8-10), Medium (5-7), Low (1-4)
- A personalized outreach message that references their specific problem (not generic)
- service_category from: Automation, Design, Writing, Marketing, Development, Data Entry, Consulting, Video, Social Media, Other

Only return genuine leads. Skip jokes, memes, venting without solvable problems.`,

    trends: `You are a market analyst for freelance services.
Analyze these ${posts.length} posts and identify:
1. Top 5 trending service demands (what people need most right now)
2. Emerging pain points (new problems appearing)
3. Service categories with highest growth potential
4. Recommended service packages based on demand patterns
${query ? `Focus on: ${query}` : ""}
Return actionable insights a freelancer can use to position their services.`,
  };

  const tools: Record<string, any[]> = {
    leads: [{
      type: "function",
      function: {
        name: "return_problem_leads",
        description: "Return analyzed problem leads",
        parameters: {
          type: "object",
          properties: {
            leads: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  source: { type: "string" },
                  source_identifier: { type: "string", description: "subreddit, tag, or category" },
                  pain_point: { type: "string" },
                  opportunity: { type: "string" },
                  service_category: { type: "string", enum: ["Automation", "Design", "Writing", "Marketing", "Development", "Data Entry", "Consulting", "Video", "Social Media", "Other"] },
                  intent_score: { type: "number", description: "1-10 score" },
                  intent_level: { type: "string", enum: ["High", "Medium", "Low"] },
                  suggested_pitch: { type: "string" },
                  personalized_outreach: { type: "string", description: "Tailored outreach message referencing their specific problem" },
                  url: { type: "string" },
                  author: { type: "string" },
                  upvotes: { type: "number" },
                },
                required: ["title", "source", "pain_point", "opportunity", "service_category", "intent_score", "intent_level", "suggested_pitch", "personalized_outreach"],
                additionalProperties: false,
              },
            },
          },
          required: ["leads"],
          additionalProperties: false,
        },
      },
    }],
    trends: [{
      type: "function",
      function: {
        name: "return_trends",
        description: "Return trend analysis",
        parameters: {
          type: "object",
          properties: {
            trending_services: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  service: { type: "string" },
                  demand_score: { type: "number", description: "1-10" },
                  growth_direction: { type: "string", enum: ["rising", "stable", "declining"] },
                  post_count: { type: "number" },
                  example_problems: { type: "array", items: { type: "string" } },
                },
                required: ["service", "demand_score", "growth_direction", "post_count", "example_problems"],
                additionalProperties: false,
              },
            },
            emerging_pain_points: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pain_point: { type: "string" },
                  frequency: { type: "number" },
                  potential_service: { type: "string" },
                },
                required: ["pain_point", "frequency", "potential_service"],
                additionalProperties: false,
              },
            },
            recommended_packages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  package_name: { type: "string" },
                  description: { type: "string" },
                  target_audience: { type: "string" },
                  estimated_demand: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["package_name", "description", "target_audience", "estimated_demand"],
                additionalProperties: false,
              },
            },
            summary: { type: "string" },
          },
          required: ["trending_services", "emerging_pain_points", "recommended_packages", "summary"],
          additionalProperties: false,
        },
      },
    }],
  };

  const toolNames: Record<string, string> = {
    leads: "return_problem_leads",
    trends: "return_trends",
  };

  const postsText = JSON.stringify(posts.slice(0, 60));
  const messages = [
    { role: "system", content: systemPrompts[mode] },
    { role: "user", content: `Analyze these posts:\n\n${postsText}` },
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      tools: tools[mode],
      tool_choice: { type: "function", function: { name: toolNames[mode] } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 429) throw new Error("Rate limited. Please try again in a moment.");
    if (response.status === 402) throw new Error("AI credits exhausted. Please add funds.");
    throw new Error(`AI error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call returned from AI");
  return JSON.parse(toolCall.function.arguments);
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, subreddits, sources, mode } = await req.json();

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
    if (!profile || !["elite", "infinity"].includes(profile.subscription_tier)) {
      return new Response(JSON.stringify({ error: "Elite or Infinity subscription required." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine sources to scan
    const activeSources = sources || ["reddit"];
    const subs = subreddits?.length ? subreddits : ["smallbusiness", "Entrepreneur", "freelance", "startups", "SideProject", "marketing", "webdev", "graphic_design"];
    const searchQuery = query || "";

    console.log(`Scanning sources: ${activeSources.join(", ")}, mode: ${mode || "leads"}`);

    // Fetch from all sources in parallel
    const fetchPromises: Promise<any[]>[] = [];
    if (activeSources.includes("reddit")) fetchPromises.push(fetchRedditPosts(subs));
    if (activeSources.includes("stackoverflow")) fetchPromises.push(fetchStackOverflow(searchQuery));
    if (activeSources.includes("hackernews")) fetchPromises.push(fetchHackerNews(searchQuery));
    if (activeSources.includes("adzuna")) fetchPromises.push(fetchAdzunaJobs(searchQuery));

    const results = await Promise.all(fetchPromises);
    const allPosts = results.flat();

    console.log(`Total posts fetched: ${allPosts.length}`);

    if (allPosts.length === 0) {
      return new Response(JSON.stringify({ leads: [], trends: null, message: "No posts found from selected sources." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI analysis
    const analysisMode = mode || "leads";
    const result = await analyzeWithAI(allPosts, searchQuery, analysisMode);

    console.log(`AI analysis complete. Mode: ${analysisMode}`);

    return new Response(JSON.stringify({
      ...result,
      sources_scanned: activeSources,
      total_posts_analyzed: allPosts.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("problem-leads error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
