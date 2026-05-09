// Admin-only: creates Dodo products for HustleAI plans + wallet packs and
// stores the Dodo product IDs in public.dodo_products.
// Re-running is safe — it upserts existing rows (skips Dodo create if found).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dodo, DODO_MODE, corsHeaders } from "../_shared/dodo.ts";

type PlanDef = {
  internal_key: string;
  kind: "subscription" | "one_time";
  name: string;
  description: string;
  amount_inr: number;
  credits?: number;
  interval?: "Month" | "Year";
};

const PLANS: PlanDef[] = [
  { internal_key: "pro",      kind: "subscription", name: "HustleAI Pro",      description: "5 AI searches/day, all AI tools, Pro forums.", amount_inr: 450,  interval: "Month" },
  { internal_key: "elite",    kind: "subscription", name: "HustleAI Elite",    description: "10 AI searches/day, HustleBot mentor, lead discovery.", amount_inr: 900,  interval: "Month" },
  { internal_key: "infinity", kind: "subscription", name: "HustleAI Infinity", description: "20 AI searches/day, sell courses, API access, priority coaching.", amount_inr: 2250, interval: "Month" },
  { internal_key: "pack_10",  kind: "one_time", name: "Wallet · 10 Credits",  description: "10 AI search credits, no expiry.",  amount_inr: 100,  credits: 10  },
  { internal_key: "pack_20",  kind: "one_time", name: "Wallet · 20 Credits",  description: "20 AI search credits, no expiry.",  amount_inr: 200,  credits: 20  },
  { internal_key: "pack_50",  kind: "one_time", name: "Wallet · 50 Credits",  description: "50 AI search credits, no expiry.",  amount_inr: 500,  credits: 50  },
  { internal_key: "pack_100", kind: "one_time", name: "Wallet · 100 Credits", description: "100 AI search credits, no expiry.", amount_inr: 1000, credits: 100 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (!userId) throw new Error("Unauthorized");
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Not admin");

    const body = await req.json().catch(() => ({}));
    const action = body.action || "bootstrap";

    if (action === "list") {
      const { data } = await supabase.from("dodo_products").select("*")
        .eq("mode", DODO_MODE).order("amount_inr", { ascending: true });
      return ok({ mode: DODO_MODE, products: data || [] });
    }

    if (action !== "bootstrap") throw new Error("Unknown action");

    const results: any[] = [];
    for (const p of PLANS) {
      // Skip if we already have it for this mode
      const { data: existing } = await supabase.from("dodo_products")
        .select("*").eq("mode", DODO_MODE).eq("internal_key", p.internal_key).maybeSingle();
      if (existing) {
        results.push({ key: p.internal_key, status: "exists", dodo_product_id: existing.dodo_product_id });
        continue;
      }

      // Create on Dodo
      const payload: any = p.kind === "subscription"
        ? {
            name: p.name,
            description: p.description,
            tax_category: "saas",
            price: {
              type: "recurring_price",
              currency: "INR",
              price: p.amount_inr * 100, // Dodo expects minor units
              discount: 0,
              purchasing_power_parity: false,
              tax_inclusive: true,
              payment_frequency_count: 1,
              payment_frequency_interval: p.interval || "Month",
              subscription_period_count: 1,
              subscription_period_interval: p.interval || "Month",
              trial_period_days: 0,
            },
          }
        : {
            name: p.name,
            description: p.description,
            tax_category: "saas",
            price: {
              type: "one_time_price",
              currency: "INR",
              price: p.amount_inr * 100,
              discount: 0,
              purchasing_power_parity: false,
              tax_inclusive: true,
            },
          };

      try {
        const created: any = await dodo("/products", { method: "POST", body: JSON.stringify(payload) });
        const dodoId = created.product_id || created.id || created.product?.product_id;
        await supabase.from("dodo_products").insert({
          mode: DODO_MODE,
          internal_key: p.internal_key,
          kind: p.kind,
          dodo_product_id: dodoId,
          name: p.name,
          amount_inr: p.amount_inr,
          credits: p.credits ?? null,
          metadata: { description: p.description },
        });
        results.push({ key: p.internal_key, status: "created", dodo_product_id: dodoId });
      } catch (err: any) {
        results.push({ key: p.internal_key, status: "error", error: err.message });
      }
    }

    return ok({ mode: DODO_MODE, results });
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