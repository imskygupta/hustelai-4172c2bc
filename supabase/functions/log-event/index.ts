// log-event — fire-and-forget telemetry sink. Validates JWT (best-effort),
// writes to the ANALYTICS DB only. Never touches the primary DB.
//
// Public-ish: accepts anonymous events too (they get user_id=null) so
// pre-auth funnel events can land. Heavy validation by category enum.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { getApi } from "../_shared/clients.ts";
import { mirrorToOwned } from "../_shared/ops-routing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_CATEGORIES = new Set([
  "audit",
  "admin_action",
  "payment",
  "ai",
  "email",
  "automation",
  "export",
  "auth",
  "ui",
  "system",
  "provider",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const category = String(body.category ?? "");
    const action = String(body.action ?? "");
    const severity = String(body.severity ?? "info");
    const source = String(body.source ?? "client");
    const dedupe_key = body.dedupe_key ? String(body.dedupe_key) : null;
    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

    if (!ALLOWED_CATEGORIES.has(category) || !action || action.length > 120) {
      return new Response(JSON.stringify({ error: "invalid event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Best-effort identity capture — never fail the request on auth issues.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const primary = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data } = await primary.auth.getClaims(authHeader.replace("Bearer ", ""));
        userId = (data?.claims?.sub as string) ?? null;
      } catch {
        /* ignore */
      }
    }

    try {
      const analytics = getApi();
      const row = {
        user_id: userId,
        category,
        action,
        severity,
        source,
        dedupe_key,
        payload,
        ip: req.headers.get("x-forwarded-for") ?? null,
        user_agent: req.headers.get("user-agent") ?? null,
      };
      await analytics.from("event_log").insert(row);
      // Phase 2 Tier-1 mirror to owned project (inert unless
      // MIGRATE_OPS_DUAL_WRITE=1 and OWNED_SUPABASE_ENABLED=1).
      mirrorToOwned("event_log", row);

      // Fan-out to dispatcher (best-effort)
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (SUPABASE_URL && SERVICE_KEY) {
        void fetch(`${SUPABASE_URL}/functions/v1/event-dispatcher`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ user_id: userId, category, action, severity, source, payload }),
        }).catch(() => {});
      }
    } catch (err) {
      // Analytics DB not provisioned yet — accept silently so callers don't break.
      console.warn("log-event analytics write skipped:", (err as Error).message);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
