// User-facing: creates a Dodo checkout session for a subscription plan or
// one-time wallet pack. Returns the checkout URL to redirect the browser to.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dodo, DODO_MODE, corsHeaders } from "../_shared/dodo.ts";
import { flagGuard } from "../_shared/flags/resolve.ts";
import { enforceRateLimit, ipKey } from "../_shared/rate-limit.ts";
import { recordAnomaly } from "../_shared/anomaly.ts";

const RETURN_URL = "https://hustlaiapp.in/payment-status";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    const email = claims?.claims?.email;
    if (!userId) throw new Error("Unauthorized");

    // Flag-gated entry: master Dodo checkout switch (kept alongside legacy api_runtime_config locks)
    const blockedDodo = await flagGuard(userId, "payments.dodo_checkout", corsHeaders, { endpoint: "dodo-checkout" });
    if (blockedDodo) return blockedDodo;

    // DB-backed rate limit (durable across isolates): 10 checkouts/user/5min + IP backstop.
    const userLimit = await enforceRateLimit(supabase, {
      key: `dodo-checkout:user:${userId}`, windowSec: 300, max: 10,
    });
    if (!userLimit.ok) {
      void recordAnomaly(supabase, {
        eventType: "rate_limit.exceeded", severity: "warn",
        userId, email, req, metadata: { surface: "dodo-checkout", scope: "user" },
      });
      return userLimit.response;
    }
    const ipLimit = await enforceRateLimit(supabase, {
      key: `dodo-checkout:ip:${ipKey(req)}`, windowSec: 300, max: 30,
    });
    if (!ipLimit.ok) {
      void recordAnomaly(supabase, {
        eventType: "rate_limit.exceeded", severity: "warn",
        userId, email, req, metadata: { surface: "dodo-checkout", scope: "ip" },
      });
      return ipLimit.response;
    }

    const body = await req.json();
    let { internal_key, coupon_code, billing_interval } = body || {};
    if (!internal_key) throw new Error("internal_key required");

    // ===== Admin payment lock checks (fail fast, before any Dodo call) =====
    const { data: lockRows } = await supabase
      .from("api_runtime_config")
      .select("key, value")
      .in("key", [
        "payments_locked",
        "subscription_checkout_locked",
        "wallet_topup_locked",
        "payment_maintenance_message",
      ]);
    const locks: Record<string, any> = {};
    for (const r of lockRows || []) locks[(r as any).key] = (r as any).value;
    const maintenanceMsg = typeof locks.payment_maintenance_message === "string"
      ? locks.payment_maintenance_message
      : "";
    if (locks.payments_locked === true) {
      return new Response(JSON.stringify({
        error: maintenanceMsg || "Payments are temporarily disabled. Please try again shortly.",
        locked: true, lock_scope: "global",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // If user picks yearly, auto-resolve to *_yearly variant
    if (billing_interval === "year" && !internal_key.endsWith("_yearly")) {
      const yearlyKey = `${internal_key}_yearly`;
      const { data: y } = await supabase.from("dodo_products")
        .select("internal_key").eq("mode", DODO_MODE).eq("internal_key", yearlyKey).maybeSingle();
      if (y) internal_key = yearlyKey;
    }

    // Look up Dodo product
    const { data: product, error: pErr } = await supabase.from("dodo_products")
      .select("*").eq("mode", DODO_MODE).eq("internal_key", internal_key)
      .eq("is_active", true).maybeSingle();
    if (pErr || !product) throw new Error(`Product '${internal_key}' not found in ${DODO_MODE} mode. Run bootstrap first.`);

    // Scope-specific lock checks (post product lookup so we know kind)
    if (product.kind === "subscription" && locks.subscription_checkout_locked === true) {
      return new Response(JSON.stringify({
        error: maintenanceMsg || "Subscription checkout is paused. Please try again shortly.",
        locked: true, lock_scope: "subscription",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (product.kind === "one_time" && locks.wallet_topup_locked === true) {
      return new Response(JSON.stringify({
        error: maintenanceMsg || "Wallet top-ups are paused. Please try again shortly.",
        locked: true, lock_scope: "wallet",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate coupon (server-side authoritative)
    let coupon: any = null;
    if (coupon_code) {
      const code = String(coupon_code).trim().toUpperCase();
      const { data: c } = await supabase.from("dodo_coupons")
        .select("*").eq("code", code).eq("is_active", true).maybeSingle();
      const now = new Date();
      const valid =
        c &&
        (!c.valid_from || new Date(c.valid_from) <= now) &&
        (!c.valid_until || new Date(c.valid_until) >= now) &&
        (!c.max_redemptions || c.times_redeemed < c.max_redemptions) &&
        (c.applies_to === "all" ||
          (c.applies_to === "plans" && product.kind === "subscription") ||
          (c.applies_to === "wallets" && product.kind === "one_time"));
      if (!valid) throw new Error("Invalid or expired coupon");
      coupon = c;
    }

    const { data: profile } = await supabase.from("profiles")
      .select("display_name, dodo_customer_id, email").eq("user_id", userId).maybeSingle();

    const customerPayload = profile?.dodo_customer_id
      ? { customer_id: profile.dodo_customer_id }
      : { email: profile?.email || email, name: profile?.display_name || (email?.split("@")[0] ?? "Customer") };

    const metadata = {
      user_id: userId,
      internal_key,
      kind: product.kind,
      credits: String(product.credits ?? ""),
      coupon_code: coupon?.code ?? "",
      billing_interval: product.billing_interval ?? "",
    };

    // Apply discount in minor units. For percent, compute on product amount.
    const discountMinor = !coupon ? 0
      : coupon.discount_type === "percent"
        ? Math.round(product.amount_inr * 100 * (Number(coupon.value) / 100))
        : Math.round(Number(coupon.value) * 100);

    let checkoutUrl: string | undefined;
    let session: any;

    if (product.kind === "subscription") {
      const subPayload: any = {
        product_id: product.dodo_product_id,
        quantity: 1,
        payment_link: true,
        return_url: RETURN_URL,
        customer: customerPayload,
        billing: { country: "IN", state: "Delhi", city: "New Delhi", street: "N/A", zipcode: "110001" },
        metadata,
      };
      if (product.trial_days && product.trial_days > 0) {
        subPayload.trial_period_days = product.trial_days;
      }
      if (discountMinor > 0) subPayload.discount_amount = discountMinor;
      session = await dodo("/subscriptions", {
        method: "POST",
        body: JSON.stringify(subPayload),
      });
      checkoutUrl = session.payment_link || session.url;
    } else {
      const oneTimePayload: any = {
        product_cart: [{ product_id: product.dodo_product_id, quantity: 1 }],
        payment_link: true,
        return_url: RETURN_URL,
        customer: customerPayload,
        billing: { country: "IN", state: "Delhi", city: "New Delhi", street: "N/A", zipcode: "110001" },
        metadata,
      };
      if (discountMinor > 0) oneTimePayload.discount_amount = discountMinor;
      session = await dodo("/payments", {
        method: "POST",
        body: JSON.stringify(oneTimePayload),
      });
      checkoutUrl = session.payment_link || session.url;
    }

    if (!checkoutUrl) throw new Error("Dodo did not return a checkout URL");

    // TEMP: live verification log (no secrets)
    console.log(JSON.stringify({
      tag: "[dodo-checkout:created]",
      mode: DODO_MODE,
      user_id: userId,
      internal_key,
      kind: product.kind,
      session_id: session.subscription_id || session.payment_id || session.id || null,
    }));

    // Cache the dodo_customer_id if Dodo returned one
    const newCustomerId = session.customer?.customer_id || session.customer_id;
    if (newCustomerId && newCustomerId !== profile?.dodo_customer_id) {
      await supabase.from("profiles")
        .update({ dodo_customer_id: newCustomerId } as any)
        .eq("user_id", userId);
    }

    // Track checkout session for abandoned-cart recovery (best-effort)
    try {
      const recipientEmail = profile?.email || email;
      if (recipientEmail) {
        await supabase.from("checkout_sessions").insert({
          user_id: userId,
          email: recipientEmail,
          plan_id: internal_key,
          plan_label: product.name || internal_key,
          tier: product.kind === "subscription" ? (internal_key.replace("_yearly", "")) : "wallet",
          amount_cents: Math.round((product.amount_inr || 0) * 100) - discountMinor,
          currency: "INR",
          billing_interval: product.billing_interval || (internal_key.endsWith("_yearly") ? "year" : "month"),
          dodo_session_id: session.subscription_id || session.payment_id || session.id || null,
          resume_url: checkoutUrl,
          status: "opened",
          metadata: { coupon: coupon?.code || null },
        });
      }
    } catch (e) {
      console.error("checkout_session log failed", e);
    }

    return new Response(JSON.stringify({
      checkout_url: checkoutUrl,
      mode: DODO_MODE,
      internal_key,
      coupon_applied: coupon?.code ?? null,
      discount_minor: discountMinor,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});