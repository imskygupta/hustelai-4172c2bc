// Phase 1 lockdown — direct feedback pipeline.
// Accepts authenticated user feedback, stores it in user_feedback,
// and fans out an admin alert (Telegram + DB feed via admin-alert).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_CATEGORIES = new Set([
  "bug", "idea", "ux", "billing", "automation", "ai", "other",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return j({ ok: false, error: "unauthorized" }, 401);
    const { data: ures, error: uerr } = await sb.auth.getUser(auth.slice(7));
    if (uerr || !ures.user) return j({ ok: false, error: "unauthorized" }, 401);
    const user = ures.user;

    const body = await req.json().catch(() => ({}));
    const category = String(body.category || "").toLowerCase().trim();
    const message = String(body.message || "").trim();
    const screenshot_url = body.screenshot_url ? String(body.screenshot_url).slice(0, 600) : null;
    const reply_requested = !!body.reply_requested;
    const route = body.route ? String(body.route).slice(0, 300) : null;
    const workspace_id = body.workspace_id ? String(body.workspace_id).slice(0, 80) : null;
    const project_id = body.project_id ? String(body.project_id).slice(0, 80) : null;

    if (!ALLOWED_CATEGORIES.has(category)) return j({ ok: false, error: "invalid_category" }, 400);
    if (message.length < 4 || message.length > 4000) return j({ ok: false, error: "invalid_message" }, 400);
    if (screenshot_url && !/^https?:\/\//i.test(screenshot_url)) return j({ ok: false, error: "invalid_screenshot" }, 400);

    // Best-effort tier lookup
    let tier: string | null = null;
    try {
      const { data: prof } = await sb.from("profiles").select("tier").eq("user_id", user.id).maybeSingle();
      tier = (prof as any)?.tier ?? null;
    } catch { /* ignore */ }

    const userAgent = req.headers.get("user-agent")?.slice(0, 400) ?? null;

    const { data: row, error } = await sb.from("user_feedback").insert({
      user_id: user.id,
      email: user.email ?? null,
      tier,
      category,
      message,
      screenshot_url,
      reply_requested,
      route,
      workspace_id,
      project_id,
      user_agent: userAgent,
      meta: body.meta && typeof body.meta === "object" ? body.meta : {},
    }).select("id").single();
    if (error) return j({ ok: false, error: error.message }, 500);

    // Fan out admin alert (Telegram + DB feed)
    try {
      await sb.functions.invoke("admin-alert", {
        body: {
          kind: "feedback.submitted",
          severity: reply_requested ? "warning" : "info",
          source: "user_feedback",
          user_id: user.id,
          feature: category,
          message: message.slice(0, 280),
          meta: {
            email: user.email,
            tier,
            route,
            workspace_id,
            project_id,
            screenshot_url,
            reply_requested,
            feedback_id: row?.id,
          },
        },
      });
    } catch { /* best-effort */ }

    return j({ ok: true, id: row?.id });
  } catch (e: any) {
    return j({ ok: false, error: String(e?.message || e) }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}