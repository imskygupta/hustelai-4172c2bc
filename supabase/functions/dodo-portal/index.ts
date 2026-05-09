// User-facing: cancel / reactivate subscription, or change plan (upgrade/downgrade).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dodo, DODO_MODE, corsHeaders } from "../_shared/dodo.ts";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (!userId) throw new Error("Unauthorized");

    const { action, subscription_id, internal_key, proration } = await req.json();
    if (!subscription_id) throw new Error("subscription_id required");

    // Confirm sub belongs to user
    const { data: sub } = await supabase.from("dodo_subscriptions")
      .select("*").eq("dodo_subscription_id", subscription_id).maybeSingle();
    if (!sub || sub.user_id !== userId) throw new Error("Subscription not found");

    if (action === "cancel") {
      await dodo(`/subscriptions/${subscription_id}`, {
        method: "PATCH",
        body: JSON.stringify({ cancel_at_next_billing_date: true }),
      });
      await supabase.from("dodo_subscriptions").update({
        cancel_at_period_end: true,
      }).eq("dodo_subscription_id", subscription_id);
      return ok({ cancelled_at_period_end: true });
    }

    if (action === "resume") {
      await dodo(`/subscriptions/${subscription_id}`, {
        method: "PATCH",
        body: JSON.stringify({ cancel_at_next_billing_date: false }),
      });
      await supabase.from("dodo_subscriptions").update({
        cancel_at_period_end: false,
      }).eq("dodo_subscription_id", subscription_id);
      return ok({ resumed: true });
    }

    if (action === "change_plan") {
      if (!internal_key) throw new Error("internal_key required");
      const { data: product } = await supabase.from("dodo_products")
        .select("dodo_product_id").eq("mode", DODO_MODE).eq("internal_key", internal_key).maybeSingle();
      if (!product) throw new Error(`Product ${internal_key} not found`);

      await dodo(`/subscriptions/${subscription_id}/change-plan`, {
        method: "POST",
        body: JSON.stringify({
          product_id: product.dodo_product_id,
          quantity: 1,
          proration_billing_mode: proration || "prorated_immediately",
        }),
      });
      return ok({ changed_to: internal_key });
    }

    throw new Error("Unknown action");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function ok(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}