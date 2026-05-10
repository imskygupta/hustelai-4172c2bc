// event-dispatcher — central fan-out for the platform event spine.
//
// Reads an in-code subscription map (will move to `event_subscriptions` table
// once the analytics DB migration is provisioned) and forwards events to the
// appropriate channel: Telegram ops alerts, email, webhooks, automation queue.
//
// Called from:
//   - server emitters via `emitServer()` in _shared/events/emit.ts
//   - log-event edge function (after storing the row) for client-emitted events
//
// Never throws — failures are logged into `event_failures` (best-effort).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { notifyOps, OpsEvent } from "../_shared/notify-ops.ts";
import { safeAnalyticsInsert } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Channel = "telegram" | "email" | "webhook" | "automation";
type Subscription = {
  match: { category?: string; action?: string; severity_min?: "info" | "warn" | "error" | "critical" };
  channel: Channel;
  config?: Record<string, unknown>;
};

const SEVERITY_RANK = { info: 0, warn: 1, error: 2, critical: 3 } as const;

// Default subscriptions — admins can later override via DB.
const SUBSCRIPTIONS: Subscription[] = [
  // Telegram ops alerts for anything warn+ in payments/security/system
  { match: { category: "payment", severity_min: "warn" }, channel: "telegram" },
  { match: { category: "security", severity_min: "warn" }, channel: "telegram" },
  { match: { category: "system", severity_min: "critical" }, channel: "telegram" },
  { match: { action: "payment.succeeded" }, channel: "telegram" },
  { match: { action: "export.failed" }, channel: "telegram" },
];

function matches(sub: Subscription, evt: { category: string; action: string; severity: string }) {
  if (sub.match.category && sub.match.category !== evt.category) return false;
  if (sub.match.action && sub.match.action !== evt.action) return false;
  if (sub.match.severity_min) {
    const min = SEVERITY_RANK[sub.match.severity_min];
    const cur = SEVERITY_RANK[(evt.severity as keyof typeof SEVERITY_RANK) ?? "info"];
    if (cur < min) return false;
  }
  return true;
}

function toOpsEvent(action: string): OpsEvent {
  if (action === "payment.succeeded") return "dodo_payment_succeeded";
  if (action === "payment.failed") return "dodo_payment_failed";
  if (action === "payment.webhook_failed") return "webhook_failed";
  return "generic";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Service-role only.
    const auth = req.headers.get("Authorization") ?? "";
    const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!expected || !auth.endsWith(expected)) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evt = await req.json();
    const category = String(evt.category || "");
    const action = String(evt.action || "");
    const severity = String(evt.severity || "info");
    const payload = (evt.payload && typeof evt.payload === "object") ? evt.payload : {};

    const dispatched: { channel: Channel; ok: boolean; error?: string }[] = [];

    for (const sub of SUBSCRIPTIONS) {
      if (!matches(sub, { category, action, severity })) continue;
      try {
        if (sub.channel === "telegram") {
          await notifyOps(toOpsEvent(action), {
            ...payload,
            note: payload.note ?? `${action} (${severity})`,
          });
          dispatched.push({ channel: "telegram", ok: true });
        }
        // email / webhook / automation channels: scaffolded for Phase 6.
      } catch (err) {
        const msg = (err as Error).message;
        dispatched.push({ channel: sub.channel, ok: false, error: msg });
        await safeAnalyticsInsert("event_failures", {
          action, category, severity, channel: sub.channel,
          error: msg, payload,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, dispatched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
