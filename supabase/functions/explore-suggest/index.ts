// Explore Suggestion Orchestrator.
//
// Lightweight adapter (not a worker, not a queue) that:
//   1. Gathers workspace context (recent workflow_runs, generated_exports,
//      latest workspace_roadmap, workspace_automations)
//   2. Computes a context hash and checks explore_suggestions_cache
//   3. On miss, calls Lovable AI Gateway (tool-calling for structured output)
//      to synthesize ONE of three sections:
//        - "continue"     → operational continuations of unfinished systems
//        - "suggestions"  → AI suggestions inferred from workspace state
//        - "packs"        → operational packs (Freelancer OS, Agency Ops, etc.)
//   4. Caches the structured payload per (user, section) for 30 minutes
//
// NO new infra: no new tables beyond the cache, no worker, no queue.
// Generation always originates from real workspace state — never static arrays.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const CACHE_TTL_MS = 30 * 60 * 1000;

type Section = "continue" | "suggestions" | "packs";
const SECTIONS: Section[] = ["continue", "suggestions", "packs"];

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Context {
  recent_workflows: { name: string; status: string; trigger: string; finished_at: string | null }[];
  recent_exports: { title: string; export_type: string; created_at: string }[];
  roadmap: { classification: any; phases_count: number; next_actions: any[] } | null;
  automations_count: number;
  niche_hint: string | null;
}

async function gatherContext(sb: any, user_id: string): Promise<Context> {
  const [runs, exports_, roadmap, autos] = await Promise.all([
    sb.from("workflow_runs")
      .select("trigger_event, status, finished_at, workflow_id")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(8),
    sb.from("generated_exports")
      .select("title, export_type, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(8),
    sb.from("workspace_roadmaps")
      .select("classification, phases, next_actions, source_input")
      .eq("owner_id", user_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb.from("workspace_automations")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user_id),
  ]);

  const runList = (runs.data || []).map((r: any) => ({
    name: r.trigger_event || "workflow",
    status: r.status,
    trigger: r.trigger_event,
    finished_at: r.finished_at,
  }));

  const rm = roadmap?.data
    ? {
        classification: roadmap.data.classification || {},
        phases_count: Array.isArray(roadmap.data.phases) ? roadmap.data.phases.length : 0,
        next_actions: Array.isArray(roadmap.data.next_actions) ? roadmap.data.next_actions.slice(0, 5) : [],
      }
    : null;

  const niche =
    rm?.classification?.niche ||
    rm?.classification?.category ||
    roadmap?.data?.source_input?.slice(0, 80) ||
    null;

  return {
    recent_workflows: runList,
    recent_exports: (exports_.data || []),
    roadmap: rm,
    automations_count: autos?.count ?? 0,
    niche_hint: niche,
  };
}

function systemFor(section: Section): string {
  const common =
    "You are the HustleAI operational inference engine. You generate CONTEXTUAL, OPERATIONAL suggestions for a freelancer/agency operator's workspace. " +
    "Never return generic templates or marketing fluff. Every item must reference the user's actual workspace state (workflows, exports, roadmap, niche). " +
    "If state is sparse, infer the most likely next operational step from what little is present. " +
    "Tone: confident, operator-grade, actionable. No emojis. No platitudes.";

  switch (section) {
    case "continue":
      return common + " For this call, propose CONTINUATIONS of unfinished systems: paused workflows, expandable automations, exports that imply a larger pipeline, half-finished roadmap phases.";
    case "suggestions":
      return common + " For this call, propose AI SUGGESTIONS — operational gaps the operator could close next, inferred from workspace state, niche, and prior generations. Each suggestion is a concrete next action, not a course or template.";
    case "packs":
      return common + " For this call, generate OPERATIONAL PACKS — bundled operational systems (e.g. 'Freelancer Client Ops', 'Agency CRM Stack', 'Creator Monetization Pipeline'). Pack the user already has should be marked as already_active. Tailor pack names to the operator's niche when possible.";
  }
}

function toolFor(section: Section) {
  const itemProps: Record<string, any> = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", description: "Short, operator-grade title (max 60 chars)." },
      description: { type: "string", description: "One concise sentence describing the operational action or system." },
      cta: { type: "string", description: "Short verb-led button label, e.g. 'Continue', 'Generate', 'Build'." },
      reason: { type: "string", description: "Why this is contextually relevant to THIS workspace state (1 sentence)." },
      tags: { type: "array", items: { type: "string" }, description: "1-3 short tags." },
      target_route: { type: "string", description: "Optional internal route to deep-link to (e.g. '/work', '/dashboard', '/explore?q=...')." },
    },
    required: ["title", "description", "cta", "reason"],
  };
  if (section === "packs") {
    itemProps.properties.already_active = { type: "boolean" };
    itemProps.properties.modules = { type: "array", items: { type: "string" }, description: "3-5 component modules in this pack." };
  }
  return {
    type: "function",
    function: {
      name: "emit_suggestions",
      description: "Emit structured suggestions for the Explore page.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          items: { type: "array", minItems: 3, maxItems: section === "packs" ? 5 : 6, items: itemProps },
        },
        required: ["items"],
      },
    },
  };
}

async function generate(section: Section, ctx: Context, userPrompt: string | null): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

  const userMsg =
    `WORKSPACE STATE (JSON):\n${JSON.stringify(ctx, null, 2)}\n\n` +
    (userPrompt ? `OPERATOR PROMPT: ${userPrompt}\n\n` : "") +
    `SECTION: ${section}\n\nReturn structured suggestions via the emit_suggestions tool.`;

  const tool = toolFor(section);
  const r = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemFor(section) },
        { role: "user", content: userMsg },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "emit_suggestions" } },
    }),
  });

  if (r.status === 429) throw new Error("rate_limited");
  if (r.status === 402) throw new Error("payment_required");
  if (!r.ok) throw new Error(`gateway_${r.status}`);

  const data = await r.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("no_tool_call");
  const parsed = JSON.parse(call.function.arguments);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const section = (body?.section as Section) || "suggestions";
    if (!SECTIONS.includes(section)) return json({ error: "invalid_section" }, 400);
    const userPrompt = typeof body?.prompt === "string" ? body.prompt.slice(0, 500) : null;
    const force = !!body?.force;

    const ctx = await gatherContext(sb, u.user.id);
    const context_hash = await sha256Hex(JSON.stringify({ ctx, p: userPrompt, section }));

    // Cache lookup
    if (!force) {
      const { data: cached } = await sb.from("explore_suggestions_cache")
        .select("payload, expires_at, context_hash")
        .eq("user_id", u.user.id).eq("section", section).maybeSingle();
      if (cached && cached.context_hash === context_hash && new Date(cached.expires_at) > new Date()) {
        return json({ ok: true, section, items: cached.payload, cached: true });
      }
    }

    let items: any[] = [];
    try {
      items = await generate(section, ctx, userPrompt);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg === "rate_limited") return json({ error: "Rate limited. Try again in a moment." }, 429);
      if (msg === "payment_required") return json({ error: "AI credits exhausted." }, 402);
      // Soft-fail: return empty so UI can degrade gracefully without static spam.
      return json({ ok: true, section, items: [], error: msg });
    }

    // Upsert cache
    await sb.from("explore_suggestions_cache").upsert({
      user_id: u.user.id,
      section,
      context_hash,
      payload: items,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    }, { onConflict: "user_id,section" });

    return json({ ok: true, section, items, cached: false });
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
});