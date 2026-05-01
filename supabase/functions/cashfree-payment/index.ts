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

const WALLET_PACKS: Record<string, { amount: number; credits: number }> = {
  pack_10: { amount: 100, credits: 10 },
  pack_20: { amount: 200, credits: 20 },
  pack_50: { amount: 500, credits: 50 },
  pack_100: { amount: 1000, credits: 100 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID");
    const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY");
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      throw new Error("Cashfree credentials not configured");
    }

    const { action, ...body } = await req.json();

    // Helper: authenticate user from JWT (required for most actions)
    const authenticateUser = async (): Promise<string> => {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) throw new Error("Missing authorization header");
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authUser }, error: authError } = await anonClient.auth.getUser(token);
      if (authError || !authUser) throw new Error("Unauthorized");
      return authUser.id;
    };

    // Helper to log payment status
    const logPaymentStatus = async (paymentId: string | null, userId: string, status: string, message: string, metadata: Record<string, unknown> = {}) => {
      await supabase.from("payment_status_logs").insert({
        payment_id: paymentId,
        user_id: userId,
        status,
        message,
        metadata,
      });
    };

    // ========== VERIFY PAYMENT (no auth required - called after redirect) ==========
    if (action === "verify_payment") {
      const { order_id } = body;
      if (!order_id) throw new Error("Missing order_id");

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

      // Get payment record
      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", order_id)
        .single();

      if (payment) {
        await logPaymentStatus(payment.id, payment.user_id, isPaid ? "confirmed" : "failed", isPaid ? "Payment confirmed by Cashfree" : `Payment ${cfData.order_status}`, { cf_status: cfData.order_status });
      }

      if (isPaid && payment) {
        const isWallet = payment.plan?.startsWith("wallet_");

        if (isWallet) {
          const packKey = payment.plan.replace("wallet_", "");
          const packInfo = WALLET_PACKS[packKey];
          if (packInfo) {
            const { data: existingWallet } = await supabase.from("user_wallets").select("*").eq("user_id", payment.user_id).single();
            if (existingWallet) {
              await supabase.from("user_wallets").update({
                balance: (existingWallet as Record<string, unknown>).balance as number + packInfo.credits,
                updated_at: new Date().toISOString(),
              }).eq("user_id", payment.user_id);
            } else {
              await supabase.from("user_wallets").insert({
                user_id: payment.user_id,
                balance: packInfo.credits,
              });
            }

            await supabase.from("wallet_transactions").insert({
              user_id: payment.user_id,
              amount: packInfo.credits,
              type: "topup",
              description: `Added ${packInfo.credits} search credits (₹${packInfo.amount})`,
              payment_order_id: order_id,
            });

            await logPaymentStatus(payment.id, payment.user_id, "completed", `Wallet credited with ${packInfo.credits} search credits`);
          }
        } else {
          await supabase
            .from("profiles")
            .update({ subscription_tier: payment.plan })
            .eq("user_id", payment.user_id);

          const xpGain = payment.plan === "infinity" ? 500 : payment.plan === "elite" ? 200 : 100;
          const { data: profileData } = await supabase.from("profiles").select("xp_points").eq("user_id", payment.user_id).single();
          await supabase.from("profiles").update({ xp_points: ((profileData as Record<string, unknown>)?.xp_points as number || 0) + xpGain }).eq("user_id", payment.user_id);

          await logPaymentStatus(payment.id, payment.user_id, "subscription_activated", `${payment.plan} plan activated, +${xpGain} XP awarded`);
        }

        // Send invoice email (fire and forget — don't block redirect)
        try {
          const { data: profile } = await supabase.from("profiles")
            .select("email, display_name").eq("user_id", payment.user_id).maybeSingle();
          const userEmail = (profile as Record<string, unknown>)?.email as string;
          const userName = (profile as Record<string, unknown>)?.display_name as string;

          let itemLabel = "";
          let itemType = "plan";
          if (isWallet) {
            const packKey = payment.plan.replace("wallet_", "");
            const pack = WALLET_PACKS[packKey];
            itemLabel = `${pack?.credits || 0} Search Credits`;
            itemType = "wallet";
          } else {
            itemLabel = `${String(payment.plan).charAt(0).toUpperCase() + String(payment.plan).slice(1)} Plan (Monthly)`;
          }

          if (userEmail) {
            await supabase.functions.invoke("send-invoice", {
              body: {
                user_id: payment.user_id,
                user_email: userEmail,
                user_name: userName,
                amount: Number(payment.amount),
                payment_method: "Cashfree",
                payment_reference: order_id,
                item_type: itemType,
                item_label: itemLabel,
                metadata: { cf_order_id: payment.cf_order_id },
              },
            });
          }
        } catch (invErr) {
          console.error("Invoice send failed:", invErr);
        }
      }

      return new Response(JSON.stringify({
        status: cfData.order_status,
        paid: isPaid,
        plan: payment?.plan,
        is_wallet: payment?.plan?.startsWith("wallet_"),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== ALL OTHER ACTIONS REQUIRE AUTH ==========
    const user_id = await authenticateUser();

    if (action === "create_order") {
      const { plan, user_email, user_name } = body;
      const planInfo = PLAN_PRICES[plan];
      if (!planInfo) throw new Error("Invalid plan");

      const orderId = `hustle_${plan}_${Date.now()}`;

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
            customer_email: user_email || "user@example.com",
            customer_name: user_name || "User",
            customer_phone: "9999999999",
          },
          order_meta: {
            return_url: `https://hustlaiapp.in/payment-status?order_id=${orderId}&type=subscription`,
          },
        }),
      });

      const cfData = await cfRes.json();
      if (!cfRes.ok) throw new Error(`Cashfree error: ${JSON.stringify(cfData)}`);

      const { data: paymentRecord } = await supabase.from("payments").insert({
        user_id,
        order_id: orderId,
        cf_order_id: cfData.cf_order_id,
        amount: planInfo.amount,
        plan,
        payment_session_id: cfData.payment_session_id,
      }).select("id").single();

      await logPaymentStatus(paymentRecord?.id || null, user_id, "initiated", `Payment initiated for ${planInfo.name} - ₹${planInfo.amount}`, { plan, order_id: orderId });

      return new Response(JSON.stringify({
        order_id: orderId,
        payment_session_id: cfData.payment_session_id,
        cf_order_id: cfData.cf_order_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create_wallet_order") {
      const { pack } = body;
      const packInfo = WALLET_PACKS[pack];
      if (!packInfo) throw new Error("Invalid wallet pack");

      const orderId = `wallet_${pack}_${Date.now()}`;

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
          order_amount: packInfo.amount,
          order_currency: "INR",
          customer_details: {
            customer_id: user_id,
            customer_email: "user@example.com",
            customer_name: "User",
            customer_phone: "9999999999",
          },
          order_meta: {
            return_url: `https://hustlaiapp.in/payment-status?order_id=${orderId}&type=wallet`,
          },
        }),
      });

      const cfData = await cfRes.json();
      if (!cfRes.ok) throw new Error(`Cashfree error: ${JSON.stringify(cfData)}`);

      const { data: paymentRecord } = await supabase.from("payments").insert({
        user_id,
        order_id: orderId,
        cf_order_id: cfData.cf_order_id,
        amount: packInfo.amount,
        plan: `wallet_${pack}`,
        payment_session_id: cfData.payment_session_id,
      }).select("id").single();

      await logPaymentStatus(paymentRecord?.id || null, user_id, "initiated", `Wallet top-up initiated - ₹${packInfo.amount} for ${packInfo.credits} credits`, { pack, order_id: orderId });

      return new Response(JSON.stringify({
        order_id: orderId,
        payment_session_id: cfData.payment_session_id,
        cf_order_id: cfData.cf_order_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "use_credit") {
      const { data: wallet } = await supabase.from("user_wallets").select("*").eq("user_id", user_id).single();
      if (!wallet || (wallet as Record<string, unknown>).balance as number < 1) {
        return new Response(JSON.stringify({ error: "Insufficient credits", balance: ((wallet as Record<string, unknown>)?.balance as number) || 0 }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("user_wallets").update({
        balance: (wallet as Record<string, unknown>).balance as number - 1,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user_id);

      await supabase.from("wallet_transactions").insert({
        user_id,
        amount: -1,
        type: "usage",
        description: "Pay-as-you-go search credit used",
      });

      return new Response(JSON.stringify({ success: true, remaining: (wallet as Record<string, unknown>).balance as number - 1 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_wallet") {
      const { data: wallet } = await supabase.from("user_wallets").select("*").eq("user_id", user_id).single();
      const { data: transactions } = await supabase.from("wallet_transactions").select("*").eq("user_id", user_id).order("created_at", { ascending: false }).limit(20);

      return new Response(JSON.stringify({
        balance: ((wallet as Record<string, unknown>)?.balance as number) || 0,
        transactions: transactions || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_payment_logs") {
      const { data: isAdminCheck } = await supabase.rpc("has_role", { _user_id: user_id, _role: "admin" });
      
      let query = supabase.from("payment_status_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (!isAdminCheck) {
        query = query.eq("user_id", user_id);
      }

      const { data: logs } = await query;

      return new Response(JSON.stringify({ logs: logs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Cashfree error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
