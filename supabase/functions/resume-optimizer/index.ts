import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callLovableAI(messages: any[]) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, temperature: 0.7 }),
  });
  if (!r.ok) throw new Error(`Lovable AI ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

async function callLongCat(messages: any[]) {
  const key = Deno.env.get("LONGCAT_API_KEY");
  if (!key) throw new Error("LONGCAT_API_KEY missing");
  const r = await fetch("https://api.longcat.chat/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "LongCat-Flash-Chat", messages, temperature: 0.7, max_tokens: 3000 }),
  });
  if (!r.ok) throw new Error(`LongCat ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

async function callZhipu(messages: any[]) {
  const key = Deno.env.get("ZHIPU_API_KEY");
  if (!key) throw new Error("ZHIPU_API_KEY missing");
  const r = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "glm-4.5-air", messages, temperature: 0.7, max_tokens: 3000 }),
  });
  if (!r.ok) throw new Error(`Zhipu ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { resume_text, target_category, target_role } = await req.json();
    if (!resume_text || !target_category) return new Response(JSON.stringify({ error: "resume_text and target_category are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const prompt = `You are an expert freelance resume optimizer. Given the user's resume/CV text, re-skin it specifically for the "${target_category}" freelance category${target_role ? ` targeting "${target_role}" roles` : ""}.

CURRENT RESUME:
${resume_text}

Generate:
1. **Optimized Resume** - Restructured and rewritten to highlight relevant skills for ${target_category}.
2. **Key Skills to Highlight** - Top 5-8 skills most relevant for this category.
3. **Mock Portfolio Piece** - A hypothetical project (name, description, tech, outcome).
4. **Profile Summary** - 2-3 sentence professional bio for ${target_category} freelancing.
5. **Improvement Tips** - 3-5 specific suggestions.

Format everything in clean markdown.`;

    const messages = [
      { role: "system", content: "You are an expert resume writer specializing in freelance and side hustle optimization." },
      { role: "user", content: prompt },
    ];

    // Provider chain: Lovable AI -> LongCat -> Zhipu
    const providers = [
      { name: "lovable", fn: callLovableAI },
      { name: "longcat", fn: callLongCat },
      { name: "zhipu", fn: callZhipu },
    ];

    let result = "";
    let lastErr: any = null;
    for (const p of providers) {
      try {
        result = await p.fn(messages);
        if (result) { console.log(`Resume optimizer: used ${p.name}`); break; }
      } catch (e) {
        console.error(`${p.name} failed:`, e);
        lastErr = e;
      }
    }
    if (!result) throw lastErr || new Error("All AI providers failed");

    return new Response(JSON.stringify({ optimized_resume: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Resume optimizer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
