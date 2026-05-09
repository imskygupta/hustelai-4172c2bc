// Public endpoint: receives Dodo webhook events.
// Verifies the signature using DODO_WEBHOOK_SECRET (Standard Webhooks / Svix-compatible),
// stores every event in dodo_events, and reconciles app state:
//   subscription.* -> updates profiles.subscription_tier + dodo_subscriptions
//   payment.succeeded (one_time wallet) -> tops up user_wallets.balance
//   refund.* -> logs only (manual admin reversal)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DODO_MODE, DODO_WEBHOOK_SECRET, corsHeaders } from "../_shared/dodo.ts";

async function verifyStandardWebhook(rawBody: string, headers: Headers): Promise<boolean> {
  if (!DODO_WEBHOOK_SECRET) return false;
  const id = headers.get("webhook-id") || "";
  const timestamp = headers.get("webhook-timestamp") || "";
  const sigHeader = headers.get("webhook-signature") || "";
  if (!id || !timestamp || !sigHeader) return false;

  const secretRaw = DODO_WEBHOOK_SECRET.replace(/^whsec_/, "");
  const keyBytes = Uint8Array.from(atob(secretRaw), (c) => c.charCodeAt(0));
  const enc = new TextEncoder();
  const signedPayload = `${id}.${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey("raw", keyBytes,
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  // Header format: "v1,xxxx v1,yyyy"
  return sigHeader.split(" ").some((s) => s.split(",")[1] === expected);
}

const TIER_KEYS = new Set(["pro", "elite", "infinity"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rawBody = await req.text();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify
  const valid = await verifyStandardWebhook(rawBody, req.headers).catch(() => false);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: any;
  try { event = JSON.parse(rawBody); } catch {
    return new Response("bad json", { status: 400, headers: corsHeaders });
  }

  const eventId = event.id || event.event_id || req.headers.get("webhook-id") || crypto.randomUUID();
  const eventType: string = event.type || event.event_type || "unknown";
  const data = event.data || event.object || event;

  // Idempotency
  const { data: existing } = await supabase.from("dodo_events")
    .select("id").eq("event_id", eventId).maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const metadata = data.metadata || {};
  const userId: string | null = metadata.user_id || null;

  // Insert event log first
  const { data: logged } = await supabase.from("dodo_events").insert({
    event_id: eventId,
    event_type: eventType,
    mode: DODO_MODE,
    user_id: userId,
    status: "received",
    payload: event,
  }).select().single();

  let processedError: string | null = null;

  try {
    // ===== SUBSCRIPTION EVENTS =====
    if (eventType.startsWith("subscription.")) {
      const dodoSubId = data.subscription_id || data.id;
      const internalKey = metadata.internal_key || data.product?.internal_key;
      const status = data.status || (eventType.endsWith(".cancelled") ? "cancelled"
        : eventType.endsWith(".expired") ? "expired"
        : eventType.endsWith(".failed") ? "failed"
        : eventType.endsWith(".on_hold") ? "on_hold"
        : "active");

      const upsertRow: any = {
        user_id: userId,
        mode: DODO_MODE,
        dodo_subscription_id: dodoSubId,
        dodo_customer_id: data.customer?.customer_id || data.customer_id,
        dodo_product_id: data.product_id,
        internal_key: internalKey,
        status,
        currency: data.currency || "INR",
        amount: (data.recurring_pre_tax_amount ?? data.amount ?? 0) / 100,
        current_period_start: data.previous_billing_date || data.current_period_start || null,
        current_period_end: data.next_billing_date || data.current_period_end || null,
        cancel_at_period_end: !!data.cancel_at_next_billing_date,
        cancelled_at: data.cancelled_at || null,
        raw: data,
      };

      await supabase.from("dodo_subscriptions").upsert(upsertRow, {
        onConflict: "dodo_subscription_id",
      });

      // Reconcile profile tier
      if (userId && internalKey && TIER_KEYS.has(internalKey)) {
        if (["active"].includes(status)) {
          await supabase.from("profiles").update({
            subscription_tier: internalKey,
            dodo_subscription_id: dodoSubId,
          } as any).eq("user_id", userId);
        } else if (["cancelled", "expired", "failed"].includes(status)) {
          // Only downgrade if the active sub is gone
          await supabase.from("profiles").update({
            subscription_tier: "free",
          } as any).eq("user_id", userId).eq("dodo_subscription_id", dodoSubId);
        }
      }
    }

    // ===== PAYMENT EVENTS =====
    if (eventType === "payment.succeeded") {
      const isSubscription = !!data.subscription_id || metadata.kind === "subscription";
      const credits = parseInt(metadata.credits || "0", 10);

      // Always log a payment record
      await supabase.from("payments").insert({
        user_id: userId,
        order_id: data.payment_id || data.id || `dodo_${eventId}`,
        amount: (data.total_amount ?? data.amount ?? 0) / 100,
        currency: data.currency || "INR",
        plan: metadata.internal_key || "unknown",
        status: "paid",
        cf_payment_id: data.payment_id || null,
      }).then(() => {}).catch(() => {});

      // Wallet top-up: only for one_time
      if (!isSubscription && userId && credits > 0) {
        const { data: wallet } = await supabase.from("user_wallets")
          .select("balance").eq("user_id", userId).maybeSingle();
        if (wallet) {
          await supabase.from("user_wallets")
            .update({ balance: (wallet.balance || 0) + credits } as any)
            .eq("user_id", userId);
        } else {
          await supabase.from("user_wallets").insert({
            user_id: userId, balance: credits,
          } as any);
        }
      }
    }

    // ===== REFUND =====
    if (eventType === "refund.succeeded") {
      // Just log — admins handle reversal manually for now
    }

    if (logged) {
      await supabase.from("dodo_events").update({ status: "processed" }).eq("id", logged.id);
    }
  } catch (err: any) {
    processedError = err.message;
    if (logged) {
      await supabase.from("dodo_events").update({
        status: "failed", error: processedError,
      }).eq("id", logged.id);
    }
  }

  return new Response(JSON.stringify({ ok: true, error: processedError }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});