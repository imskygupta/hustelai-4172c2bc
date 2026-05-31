// U1.5 — Read-only user usage API.
// GET  /me-usages              → plan, limits, usage, remaining, resets, boosters
// GET  /me-usages/:tool        → used, remaining, limit, last_used, execution_history
// Cache-Control: 15 seconds. No writes, no enforcement.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
      "cache-control": "private, max-age=15",
      ...extra,
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const url = new URL(req.url);
  // path like /me-usages or /me-usages/<tool>
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("me-usages");
  const toolKey = idx >= 0 ? parts[idx + 1] : undefined;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "unauthorized" }, 401);
  const userId = userRes.user.id;

  const admin = createClient(supabaseUrl, serviceKey);

  // Resets — same payload for both endpoints
  const { data: resets } = await admin.from("v_usage_reset_preview").select("*");

  if (toolKey) {
    // Per-tool view
    const { data: events } = await admin
      .from("usage_events")
      .select("decision, units_used, created_at, blocked_stage, execution_id, meter, feature")
      .eq("user_id", userId)
      .eq("capability_key", toolKey)
      .order("created_at", { ascending: false })
      .limit(20);

    const todayStart = todayISTStart();
    const todays = (events ?? []).filter((e) => e.created_at >= todayStart && e.decision === "allowed");
    const used = todays.reduce((s, e) => s + Number(e.units_used ?? 0), 0);

    // Try to find a limit via meter from the most recent event
    const meter = events?.[0]?.meter ?? null;
    const feature = events?.[0]?.feature ?? "*";
    let limit_value: number | null = null;
    if (meter) {
      const { data: ent } = await admin.rpc("get_user_entitlements", { _user: userId });
      const key = `${meter}:${feature}`;
      limit_value = ent?.limits?.[key]?.max ?? null;
    }

    return json({
      tool: toolKey,
      used,
      limit: limit_value,
      remaining: limit_value == null ? null : Math.max(limit_value - used, 0),
      last_used: events?.[0]?.created_at ?? null,
      execution_history: events ?? [],
      resets: resets ?? [],
    });
  }

  // Aggregate view
  const [{ data: ent }, { data: live }] = await Promise.all([
    admin.rpc("get_user_entitlements", { _user: userId }),
    admin
      .from("v_usage_live_today")
      .select("meter, feature, allowed, shadow_hits, blocked, units_used, last_execution")
      .eq("user_id", userId),
  ]);

  const usage: Record<string, number> = {};
  const remaining: Record<string, number | null> = {};
  for (const row of live ?? []) {
    const key = `${row.meter}:${row.feature}`;
    usage[key] = Number(row.units_used ?? 0);
    const limit = ent?.limits?.[key]?.max ?? null;
    remaining[key] = limit == null ? null : Math.max(limit - usage[key], 0);
  }
  for (const key of Object.keys(ent?.limits ?? {})) {
    if (!(key in usage)) {
      usage[key] = 0;
      remaining[key] = ent.limits[key].max ?? null;
    }
  }

  return json({
    plan: ent?.tier ?? "free",
    limits: ent?.limits ?? {},
    features: ent?.features ?? {},
    usage,
    remaining,
    resets: resets ?? [],
    boosters: ent?.boosters ?? [],
    overrides: ent?.overrides ?? [],
    resolved_at: new Date().toISOString(),
  });
});

function todayISTStart(): string {
  // IST = UTC+5:30
  const now = new Date();
  const istMs = now.getTime() + (5.5 * 3600_000);
  const istDate = new Date(istMs);
  istDate.setUTCHours(0, 0, 0, 0);
  return new Date(istDate.getTime() - 5.5 * 3600_000).toISOString();
}