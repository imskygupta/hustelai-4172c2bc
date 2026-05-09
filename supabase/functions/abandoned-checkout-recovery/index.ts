import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendTemplated } from "../_shared/mailer.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const TIER_PITCH: Record<string, string> = {
  pro: "Pro unlocks 5x AI runs, unlimited saves, and deeper hustle insights — for less than a coffee a week.",
  elite: "Elite gives you priority lead alerts, premium templates, and the Elite Vault of paid software licenses.",
  infinity: "Infinity is everything: unlimited AI, exclusive courses, the Infinity hub, and white-glove support.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Find sessions opened ≥24h ago, still pending, no recovery sent
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const expiry = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // skip > 7d old

  const { data: sessions, error } = await sb
    .from("checkout_sessions")
    .select("*")
    .eq("status", "opened")
    .is("recovery_email_sent_at", null)
    .lt("opened_at", cutoff)
    .gt("opened_at", expiry)
    .limit(100);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

  let sent = 0, failed = 0;
  for (const s of sessions || []) {
    try {
      const tier = (s.tier || "pro").toLowerCase();
      let name = s.email.split("@")[0];
      if (s.user_id) {
        const { data: prof } = await sb.from("profiles").select("display_name").eq("user_id", s.user_id).maybeSingle();
        if (prof?.display_name) name = prof.display_name;
      }
      await sendTemplated({
        to: s.email,
        templateSlug: "abandoned-cart",
        data: {
          name,
          plan_label: s.plan_label || tier,
          tier_pitch: TIER_PITCH[tier] || TIER_PITCH.pro,
          resume_url: s.resume_url || `https://hustlaiapp.in/payment?plan=${s.plan_id}`,
        },
      });
      await sb.from("checkout_sessions").update({ recovery_email_sent_at: new Date().toISOString(), status: "abandoned" }).eq("id", s.id);
      sent++;
    } catch (e) {
      console.error("recovery failed", s.id, e);
      failed++;
    }
  }

  return new Response(JSON.stringify({ ok: true, scanned: sessions?.length || 0, sent, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});