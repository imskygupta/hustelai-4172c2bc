// usage-record — append-only writer for the analytics usage_ledger.
// Called fire-and-forget by the client `consumeUsage()` helper after the
// primary `consume_usage` RPC has already enforced the cap. Never throws.
//
// Heavy/append data lives ONLY on the analytics DB. Primary stays lean.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { safeAnalyticsInsert } from "../_shared/clients.ts";
import { emitServer } from "../_shared/events/emit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const meter = String(body.meter ?? "");
    const feature = String(body.feature ?? "*");
    const units = Number(body.units ?? 1);
    const result = body.result ?? {};
    if (!meter) {
      return new Response(JSON.stringify({ error: "meter required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string | null = null;
    const auth = req.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: auth } } },
        );
        const { data } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
        userId = (data?.claims?.sub as string) ?? null;
      } catch { /* anon allowed */ }
    }

    const period_key = new Date().toISOString().slice(0, 10);
    await safeAnalyticsInsert("usage_ledger", {
      user_id: userId,
      meter, feature,
      units,
      period_key,
      metadata: { result },
    });

    // Mirror into primary-DB append-only usage_events (Phase U0).
    // Lean fields for /dashboard/usages, admin governance, and audit.
    try {
      const primary = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
      const decision = result?.allowed === false
        ? "blocked"
        : result?.bypass ? "bypass" : "allowed";
      await primary.from("usage_events").insert({
        user_id: userId,
        meter,
        feature,
        capability_key: body.capability_key ?? null,
        execution_id: body.execution_id ?? null,
        tier_snapshot: result?.tier ?? null,
        units_used: units,
        remaining_before: result?.remaining_before ?? null,
        remaining_after: typeof result?.max === "number" && typeof result?.used === "number"
          ? Math.max(0, result.max - result.used) : null,
        max_at_time: result?.max ?? null,
        decision,
        blocked_reason: result?.reason && decision !== "allowed" ? String(result.reason) : null,
        provider: body.provider ?? null,
        provider_cost_micro: body.provider_cost_micro ?? null,
        input_tokens: body.input_tokens ?? null,
        output_tokens: body.output_tokens ?? null,
        metadata: { ...(body.metadata ?? {}), result },
      });
    } catch (e) {
      console.warn("[usage-record] usage_events insert failed:", (e as Error).message);
    }

    // Surface as a typed event for ops/audit/automations
    await emitServer({
      name: "ai.consumed",
      category: "ai",
      severity: "info",
      source: "usage-record",
      user_id: userId ?? undefined,
      payload: { feature, meter, units, ...result },
    }, { dispatch: meter === "ai" }); // only fan-out AI for now

    return new Response(JSON.stringify({ ok: true }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
