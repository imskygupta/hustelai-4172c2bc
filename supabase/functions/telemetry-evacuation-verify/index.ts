// Telemetry Evacuation Verification probe.
//
// POST /telemetry-evacuation-verify  → runs parity + lag + fallback checks
// across owned and primary DBs for blog_events, cta_events, tool_launch_events.
// Writes results to public.telemetry_evacuation_checks (admin-readable).
//
// Auth: requires admin JWT (verified via primary getPrimary(authHeader) + has_role).

import { getOwned, getPrimary, getPrimaryService, ownedReady } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STREAMS = ["blog_events", "cta_events", "tool_launch_events"];

async function countSince(client: any, table: string, since: string): Promise<{count: number|null; lagMs: number; err?: string}> {
  const t0 = Date.now();
  try {
    const { count, error } = await client.from(table).select("*", { count: "exact", head: true }).gte("created_at", since);
    if (error) throw error;
    return { count: count ?? 0, lagMs: Date.now() - t0 };
  } catch (e) {
    return { count: null, lagMs: Date.now() - t0, err: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  // Admin gate.
  try {
    const authed = getPrimary(req.headers.get("authorization"));
    const { data: { user } } = await authed.auth.getUser();
    if (!user) throw new Error("auth required");
    const svc = getPrimaryService();
    const { data: isAdmin } = await svc.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("admin only");
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 403, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const svc = getPrimaryService();
  const ownedAvail = ownedReady();
  const owned = ownedAvail ? getOwned() : null;
  const since = new Date(Date.now() - 60 * 60_000).toISOString(); // last 1h
  const results: any[] = [];

  for (const stream of STREAMS) {
    const primaryR = await countSince(svc, stream, since);
    const ownedR = owned ? await countSince(owned, stream, since) : { count: null, lagMs: 0, err: "owned_not_ready" };

    // Parity check
    let parityStatus: "ok"|"warn"|"fail" = "ok";
    let delta: number | null = null;
    if (primaryR.count !== null && ownedR.count !== null) {
      const total = (primaryR.count || 0) + (ownedR.count || 0);
      delta = total > 0 ? Math.round((Math.abs(primaryR.count - ownedR.count) / total) * 1000) / 10 : 0;
      parityStatus = delta > 30 ? "warn" : "ok";
    } else if (ownedR.err && ownedR.err !== "owned_not_ready") {
      parityStatus = "fail";
    }
    const parityRow = {
      stream, check_kind: "parity", status: parityStatus,
      primary_count: primaryR.count, owned_count: ownedR.count,
      delta_pct: delta, lag_ms: ownedR.lagMs,
      details: { since, primary_err: primaryR.err ?? null, owned_err: ownedR.err ?? null },
    };
    results.push(parityRow);

    // Lag check
    results.push({
      stream, check_kind: "lag",
      status: ownedR.lagMs > 1500 ? "warn" : "ok",
      lag_ms: ownedR.lagMs, details: { sink: ownedAvail ? "owned" : "primary" },
    });

    // Fallback / reachability
    results.push({
      stream, check_kind: "fallback",
      status: ownedAvail && !ownedR.err ? "ok" : (ownedAvail ? "fail" : "warn"),
      details: { owned_ready: ownedAvail, error: ownedR.err ?? null },
    });
  }

  try { await svc.from("telemetry_evacuation_checks").insert(results); } catch { /* tolerate */ }

  return new Response(JSON.stringify({ ok: true, results, owned_ready: ownedAvail }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});