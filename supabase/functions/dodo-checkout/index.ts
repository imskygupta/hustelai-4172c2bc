// User-facing: creates a Dodo checkout session for a subscription plan or
// one-time wallet pack. Returns the checkout URL to redirect the browser to.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dodo, DODO_MODE, corsHeaders } from "../_shared/dodo.ts";

const RETURN_URL = "https://hustlaiapp.in/payment-status";

// Simple in-memory rate limit (best-effort within a single isolate)
const RATE_LIMIT: Map<string, { count: number; ts: number }> = new Map();
function rateLimit(key: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = RATE_LIMIT.get(key);
  if (!cur || now - cur.ts > windowMs) {
    RATE_LIMIT.set(key, { count: 1, ts: now });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count++;
  return true;
}

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

    if (!rateLimit(`co:${userId}`, 10, 60_000)) {
      return new Response(JSON.stringify({ error: "Too many requests, slow down." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    let { internal_key, coupon_code, billing_interval } = body || {};
    if (!internal_key) throw new Error("internal_key required");

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

    // Cache the dodo_customer_id if Dodo returned one
    const newCustomerId = session.customer?.customer_id || session.customer_id;
    if (newCustomerId && newCustomerId !== profile?.dodo_customer_id) {
      await supabase.from("profiles")
        .update({ dodo_customer_id: newCustomerId } as any)
        .eq("user_id", userId);
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