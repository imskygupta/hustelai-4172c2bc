// Phase 7F — sink for client-side primary-guard violations.
// Writes to Admin DB (rqqiujmiagauzohdqjmi). Public (no JWT) so beacons work
// from any auth state; the only payload is regression telemetry.
import { getAdmin } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405, headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const row = {
      table_name: String(body.table ?? "unknown").slice(0, 128),
      path: String(body.path ?? "").slice(0, 256),
      stack: String(body.stack ?? "").slice(0, 4000),
      ua: String(body.ua ?? "").slice(0, 512),
      reported_at: body.at ?? new Date().toISOString(),
    };
    const admin = getAdmin();
    await admin.from("runtime_direct_write_violations").insert(row);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.warn("violation-log error:", (e as Error).message);
    // Always 200 so the beacon doesn't get retried; we don't want a noisy loop.
    return new Response(JSON.stringify({ ok: false }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});