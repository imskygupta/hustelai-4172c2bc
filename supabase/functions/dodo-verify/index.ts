// Webhook-confirmed payment verification.
// Reads the most recent paid `payments` row for the authed user (or matches a
// `dodo_session_id` if provided) and returns paid/plan/is_wallet/credits.
// All entitlement granting happens in `dodo-webhook`; this function only reads.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    const userId = claims?.claims?.sub;
    if (!userId) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const sessionId: string | undefined = body?.dodo_session_id || body?.order_id;

    // 1) If we have a session id, try to match a payment to it (loose match)
    let payment: any = null;
    if (sessionId) {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .or(`order_id.eq.${sessionId},cf_payment_id.eq.${sessionId}`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      payment = data;
    }

    // 2) Fallback: latest paid payment for this user in last 15 minutes
    if (!payment) {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "paid")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      payment = data;
    }

    if (!payment) {
      return new Response(
        JSON.stringify({ paid: false, status: "pending" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isPaid = payment.status === "paid";
    const planRaw: string = payment.plan || "";
    const isWallet = planRaw.startsWith("wallet_") || planRaw.includes("pack_");

    // For wallet purchases, surface the credit count from the matching dodo_event
    let credits: number | undefined;
    if (isWallet && payment.cf_payment_id) {
      const { data: ev } = await supabase
        .from("dodo_events")
        .select("payload")
        .eq("event_type", "payment.succeeded")
        .order("created_at", { ascending: false })
        .limit(20);
      const match = (ev || []).find((e: any) => {
        const d = e?.payload?.data || e?.payload?.object || e?.payload || {};
        return d?.payment_id === payment.cf_payment_id ||
          d?.id === payment.cf_payment_id;
      });
      const md = (match as any)?.payload?.data?.metadata
        || (match as any)?.payload?.metadata;
      if (md?.credits) credits = parseInt(md.credits, 10);
    }

    return new Response(
      JSON.stringify({
        paid: isPaid,
        status: payment.status,
        plan: planRaw.replace(/_yearly$/, ""),
        is_wallet: isWallet,
        credits,
        amount: payment.amount,
        order_id: payment.order_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, paid: false }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});