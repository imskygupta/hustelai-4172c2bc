// log-event — fire-and-forget telemetry sink. Validates JWT (best-effort),
// writes to the ANALYTICS DB only. Never touches the primary DB.
//
// Public-ish: accepts anonymous events too (they get user_id=null) so
// pre-auth funnel events can land. Heavy validation by category enum.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { getAnalytics } from "../_shared/clients.ts";

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
      const analytics = getAnalytics();
      await analytics.from("event_log").insert({
        user_id: userId,
        category,
        action,
        payload,
        ip: req.headers.get("x-forwarded-for") ?? null,
        user_agent: req.headers.get("user-agent") ?? null,
      });
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
