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
    const { communication } = await req.json();
    if (!communication || communication.trim().length < 30) {
      return new Response(JSON.stringify({ error: "Paste at least 30 characters of the client message." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await serviceClient
      .from("profiles").select("subscription_tier").eq("user_id", userId).single();
    const tier = profile?.subscription_tier || "free";

    if (tier === "free") {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { count } = await serviceClient
        .from("payment_status_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "ai_tool_use:red-flag")
        .gte("created_at", since.toISOString());
      if ((count ?? 0) >= 5) {
        return new Response(JSON.stringify({ error: "Free tier limit reached (5 uses / 30 days). Upgrade to Pro for unlimited access." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const systemPrompt = `You are an experienced freelance contract advisor. Analyze a client communication and return STRICT JSON ONLY (no markdown fences).

Schema:
{
  "verdict": "GO" | "CAUTION" | "STOP",
  "verdict_reason": <string>,
  "risks": [
    { "severity": "high" | "medium" | "low", "title": <string>, "explanation": <string> },
    ... exactly 3 items
  ],
  "benefits": [
    { "title": <string>, "explanation": <string> },
    ... exactly 3 items
  ],
  "questions_to_ask": [<string>, <string>, <string>],
  "suggested_reply": <string>
}

Rules:
- "verdict": GO (green) when low overall risk; CAUTION (yellow) for moderate; STOP (red) for high risk (vague scope, scope creep, free-work asks, payment red flags, abusive tone).
- "suggested_reply": short professional reply that protects the freelancer.`;

    const userPrompt = `Client communication:\n"""\n${communication.slice(0, 4000)}\n"""`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again." }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI usage limit reached." }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const data = await aiResp.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json|```/g, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { throw new Error("AI returned invalid JSON"); }

    if (tier === "free") {
      await serviceClient.from("payment_status_logs").insert({
        user_id: userId, status: "ai_tool_use:red-flag", message: "Red flag scanner usage",
      });
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("red-flag-scanner error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});