import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES: Record<string, number> = { pro: 450, elite: 900, infinity: 2250 };
const WALLET_PACKS: Record<string, { credits: number; price: number }> = {
  pack_10: { credits: 10, price: 100 },
  pack_20: { credits: 20, price: 200 },
  pack_50: { credits: 50, price: 500 },
  pack_100: { credits: 100, price: 1000 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = token
      ? await supabase.auth.getUser(token)
      : { data: { user: null } };

    const body = await req.json();
    const { action } = body;

    // ===== USER: SUBMIT PAYMENT =====
    if (action === "submit") {
      if (!user) throw new Error("Unauthorized");
      const { payment_type, plan, wallet_pack, utr_number, screenshot_url, upi_id_used, user_note } = body;
      if (!utr_number) throw new Error("UTR number is required");

      let amount = 0;
      if (payment_type === "plan") {
        if (!plan || !(plan in PLAN_PRICES)) throw new Error("Invalid plan");
        amount = PLAN_PRICES[plan];
      } else if (payment_type === "wallet") {
        if (!wallet_pack || !(wallet_pack in WALLET_PACKS)) throw new Error("Invalid wallet pack");
        amount = WALLET_PACKS[wallet_pack].price;
      } else throw new Error("Invalid payment_type");

      const { data, error } = await supabase.from("manual_payment_submissions").insert({
        user_id: user.id,
        payment_type,
        plan: payment_type === "plan" ? plan : null,
        wallet_pack: payment_type === "wallet" ? wallet_pack : null,
        amount,
        upi_id_used,
        utr_number,
        screenshot_url,
        user_note,
        status: "pending",
      }).select().single();
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, submission: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ADMIN: APPROVE / REJECT =====
    if (action === "review") {
      if (!user) throw new Error("Unauthorized");
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) throw new Error("Not admin");

      const { submission_id, decision, admin_note } = body;
      if (!submission_id || !["approved", "rejected"].includes(decision)) throw new Error("Invalid review");

      const { data: sub, error: fetchErr } = await supabase
        .from("manual_payment_submissions").select("*").eq("id", submission_id).single();
      if (fetchErr || !sub) throw new Error("Submission not found");
      if (sub.status !== "pending") throw new Error(`Already ${sub.status}`);

      // Update submission
      await supabase.from("manual_payment_submissions").update({
        status: decision,
        admin_note,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", submission_id);

      if (decision === "approved") {
        // Get user profile
        const { data: profile } = await supabase.from("profiles")
          .select("email, display_name").eq("user_id", sub.user_id).single();

        if (sub.payment_type === "plan" && sub.plan) {
          await supabase.from("profiles").update({ subscription_tier: sub.plan }).eq("user_id", sub.user_id);
          // Discord role sync (fire-and-forget)
          try {
            const projectRef = (Deno.env.get("SUPABASE_URL") || "").match(/https:\/\/([^.]+)\./)?.[1];
            if (projectRef) {
              fetch(`https://${projectRef}.supabase.co/functions/v1/discord-sync-role/internal`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ user_id: sub.user_id, tier: sub.plan }),
              }).catch(() => {});
            }
          } catch (_) { /* ignore */ }
        } else if (sub.payment_type === "wallet" && sub.wallet_pack) {
          const credits = WALLET_PACKS[sub.wallet_pack]?.credits || 0;
          // Try to upsert wallet
          const { data: wallet } = await supabase.from("user_wallets" as any)
            .select("balance").eq("user_id", sub.user_id).maybeSingle();
          if (wallet) {
            await supabase.from("user_wallets" as any).update({
              balance: (wallet.balance || 0) + credits,
            }).eq("user_id", sub.user_id);
          } else {
            await supabase.from("user_wallets" as any).insert({
              user_id: sub.user_id, balance: credits,
            });
          }
        }

        // Log payment record
        await supabase.from("payments").insert({
          user_id: sub.user_id,
          order_id: `UPI-${sub.id.slice(0, 8)}`,
          amount: sub.amount,
          currency: sub.currency,
          plan: sub.plan || sub.wallet_pack || "wallet",
          status: "paid",
          cf_payment_id: sub.utr_number,
        });

        // Trigger invoice email
        if (profile?.email) {
          const itemLabel = sub.payment_type === "plan"
            ? `${sub.plan?.toUpperCase()} Plan`
            : `${WALLET_PACKS[sub.wallet_pack as string]?.credits || 0} Wallet Credits`;
          await supabase.functions.invoke("send-invoice", {
            body: {
              user_id: sub.user_id,
              user_email: profile.email,
              user_name: profile.display_name,
              amount: Number(sub.amount),
              payment_method: "UPI Manual Transfer",
              payment_reference: sub.utr_number,
              item_type: sub.payment_type,
              item_label: itemLabel,
              metadata: { upi_id: sub.upi_id_used, submission_id: sub.id },
            },
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});