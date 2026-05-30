import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { flagGuard } from "../_shared/flags/resolve.ts";
import { getApi } from "../_shared/clients.ts";
import { requireVerifiedUser as __requireVerifiedUser } from "../_shared/require-verified.ts";
import { enforceAIQuota } from "../_shared/tier/enforce-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const __gate = await __requireVerifiedUser(req, { denialEvent: "verification_blocked_ai", fn: "ai-chatbot" });
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

    const userId = claimsData.claims.sub as string;
    // === END AUTH CHECK ===

    const blocked = await flagGuard(userId, "ai_tools.chatbot", corsHeaders, { endpoint: "ai-chatbot" });
    if (blocked) return blocked;

    // Sprint F — server-side AI quota gate. BYOK bypasses; mirrors into ai_daily_usage.
    const quotaGate = await enforceAIQuota(userId, "hustlebot", corsHeaders);
    if (quotaGate) return quotaGate;

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch user profile for personalization
    let profileContext = "";
    try {
      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("display_name, email, bio, subscription_tier, search_count, phone, address")
        .eq("user_id", userId)
        .single();

      if (profile) {
        profileContext = `\n\nUser Profile:
- Name: ${profile.display_name || "Unknown"}
- Email: ${profile.email || "N/A"}
- Tier: ${profile.subscription_tier}
- Bio: ${profile.bio || "Not set"}
- Searches: ${profile.search_count}
- Location: ${profile.address || "Not set"}`;
      }

      // Phase 7D.3: chat_messages now lives on the AI/API DB (no fallback).
      const aiDb = getApi();
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg?.role === "user") {
        await aiDb.from("chat_messages").insert({
          user_id: userId, role: "user", content: lastUserMsg.content,
        });
      }
    } catch (e) {
      console.error("Profile fetch error:", e);
    }

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
            content: `You are HustleBot 🤖 — the personal AI mentor for HustleAI platform. You're friendly, encouraging, and practical.

ALWAYS greet the user by their name with a warm emoji. Be conversational and supportive.
${profileContext}

You provide:
- Personalized freelancing advice based on user's skills and goals
- Actionable strategies for finding clients and growing income
- Pricing guidance and negotiation tips in INR (₹)
- Portfolio and personal branding advice
- Tools and workflow optimization
- Resume tips if the user has uploaded one
- Motivation and mindset coaching

Format responses with markdown. Keep responses concise but valuable. Use emojis sparingly but warmly.`,
          },
          ...messages,
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact admin." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again!";

    // Save assistant reply on AI/API DB
    try {
      const aiDb = getApi();
      await aiDb.from("chat_messages").insert({
        user_id: userId, role: "assistant", content: reply,
      });
    } catch (e) {
      console.error("Save reply error:", e);
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chatbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
