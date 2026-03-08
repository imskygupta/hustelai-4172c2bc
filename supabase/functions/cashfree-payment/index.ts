import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CASHFREE_BASE = "https://api.cashfree.com/pg";

const PLAN_PRICES: Record<string, { amount: number; name: string }> = {
  pro: { amount: 450, name: "Pro Plan" },
  elite: { amount: 900, name: "Elite Plan" },
  infinity: { amount: 2250, name: "Infinity Plan" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID");
    const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY");
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      throw new Error("Cashfree credentials not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...body } = await req.json();

    if (action === "create_order") {
      const { plan, user_id, user_email, user_name } = body;
      const planInfo = PLAN_PRICES[plan];
      if (!planInfo) throw new Error("Invalid plan");

      const orderId = `hustle_${plan}_${Date.now()}`;

      // Create Cashfree order
      const cfRes = await fetch(`${CASHFREE_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
          "x-api-version": "2023-08-01",
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: planInfo.amount,
          order_currency: "INR",
          customer_details: {
            customer_id: user_id,
            customer_email: user_email,
            customer_name: user_name || "User",
            customer_phone: "9999999999",
          },
          order_meta: {
            return_url: `${req.headers.get("origin") || "https://hustelai.eu.cc"}/dashboard?payment=success&order_id=${orderId}`,
          },
        }),
      });

      const cfData = await cfRes.json();
      if (!cfRes.ok) {
        throw new Error(`Cashfree error: ${JSON.stringify(cfData)}`);
      }

      // Save payment record
      await supabase.from("payments").insert({
        user_id,
        order_id: orderId,
        cf_order_id: cfData.cf_order_id,
        amount: planInfo.amount,
        plan,
        payment_session_id: cfData.payment_session_id,
      });

      return new Response(JSON.stringify({
        order_id: orderId,
        payment_session_id: cfData.payment_session_id,
        cf_order_id: cfData.cf_order_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "verify_payment") {
      const { order_id } = body;

      const cfRes = await fetch(`${CASHFREE_BASE}/orders/${order_id}`, {
        headers: {
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
          "x-api-version": "2023-08-01",
        },
      });

      const cfData = await cfRes.json();
      if (!cfRes.ok) throw new Error(`Cashfree verify error: ${JSON.stringify(cfData)}`);

      const isPaid = cfData.order_status === "PAID";

      // Update payment record
      await supabase.from("payments").update({
        status: isPaid ? "paid" : cfData.order_status?.toLowerCase() || "failed",
        updated_at: new Date().toISOString(),
      }).eq("order_id", order_id);

      if (isPaid) {
        // Get payment to find plan and user
        const { data: payment } = await supabase
          .from("payments")
          .select("*")
          .eq("order_id", order_id)
          .single();

        if (payment) {
          // Upgrade user tier
          await supabase
            .from("profiles")
            .update({ subscription_tier: payment.plan })
            .eq("user_id", payment.user_id);

          // Award XP
          const xpGain = payment.plan === "infinity" ? 500 : payment.plan === "elite" ? 200 : 100;
          const { data: profile } = await supabase.from("profiles").select("xp_points").eq("user_id", payment.user_id).single();
          await supabase.from("profiles").update({ xp_points: (profile?.xp_points || 0) + xpGain }).eq("user_id", payment.user_id);
        }
      }

      return new Response(JSON.stringify({ status: cfData.order_status, paid: isPaid }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("Cashfree error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
