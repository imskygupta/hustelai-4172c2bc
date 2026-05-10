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
