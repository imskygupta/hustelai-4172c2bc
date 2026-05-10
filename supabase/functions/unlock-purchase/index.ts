// Initiates a Cashfree checkout for an unlock pack purchase.
// On webhook completion (`cashfree-webhook`), credit is granted via `grant_unlocks`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) return json({ error: "auth_required" }, 401);
    const { data: who } = await sb.auth.getUser(jwt);
    const user = who?.user;
    if (!user) return json({ error: "auth_required" }, 401);

    const body = await req.json().catch(() => ({}));
    const packKey = String(body?.pack_key || "");
    if (!packKey) return json({ error: "pack_key_required" }, 400);

    const { data: pack, error } = await sb
      .from("unlock_packs")
      .select("*")
      .eq("key", packKey).eq("active", true)
      .maybeSingle();
    if (error || !pack) return json({ error: "pack_not_found" }, 404);

    // Defer to existing Cashfree checkout edge function. Pass unlock metadata
    // so the webhook can call `grant_unlocks` after settlement.
    const { data: order, error: orderErr } = await sb.functions.invoke("cashfree-create-order", {
      body: {
        amount: pack.price_inr,
        currency: "INR",
        kind: "unlock",
        unlock_pack_key: pack.key,
        unlock_meter: pack.meter,
        unlock_feature: pack.feature,
        unlock_units: pack.units,
        unlock_validity_hours: pack.validity_hours,
        return_url: `${req.headers.get("origin") || "https://hustlaiapp.in"}/settings/wallet`,
      },
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (orderErr) return json({ error: orderErr.message || "checkout_failed" }, 500);
    return json(order, 200);
  } catch (e) {
    return json({ error: (e as Error).message || "server_error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}