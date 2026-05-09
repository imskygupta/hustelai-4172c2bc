// User-facing: creates a Dodo checkout session for a subscription plan or
// one-time wallet pack. Returns the checkout URL to redirect the browser to.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dodo, DODO_MODE, corsHeaders } from "../_shared/dodo.ts";

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

    const { internal_key } = await req.json();
    if (!internal_key) throw new Error("internal_key required");

    // Look up Dodo product
    const { data: product, error: pErr } = await supabase.from("dodo_products")
      .select("*").eq("mode", DODO_MODE).eq("internal_key", internal_key)
      .eq("is_active", true).maybeSingle();
    if (pErr || !product) throw new Error(`Product '${internal_key}' not found in ${DODO_MODE} mode. Run bootstrap first.`);

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
    };

    let checkoutUrl: string | undefined;
    let session: any;

    if (product.kind === "subscription") {
      // POST /subscriptions returns a payment_link for hosted checkout
      session = await dodo("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          product_id: product.dodo_product_id,
          quantity: 1,
          payment_link: true,
          return_url: RETURN_URL,
          customer: customerPayload,
          billing: {
            country: "IN",
            state: "Delhi",
            city: "New Delhi",
            street: "N/A",
            zipcode: "110001",
          },
          metadata,
        }),
      });
      checkoutUrl = session.payment_link || session.url;
    } else {
      // One-time payment
      session = await dodo("/payments", {
        method: "POST",
        body: JSON.stringify({
          product_cart: [{ product_id: product.dodo_product_id, quantity: 1 }],
          payment_link: true,
          return_url: RETURN_URL,
          customer: customerPayload,
          billing: {
            country: "IN",
            state: "Delhi",
            city: "New Delhi",
            street: "N/A",
            zipcode: "110001",
          },
          metadata,
        }),
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

    return new Response(JSON.stringify({ checkout_url: checkoutUrl, mode: DODO_MODE }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});