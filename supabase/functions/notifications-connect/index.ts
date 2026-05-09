// Generates a one-time connect token for a user to link a notification provider.
// V1: Telegram only. Returns deep link to bot.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBotInfo } from "../_shared/notifications/telegram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TIERS = new Set(["pro","elite","infinity"]);

function genToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    const token = auth?.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const provider = body?.provider || "telegram";
    if (provider !== "telegram") throw new Error(`Provider '${provider}' not yet supported`);

    // Tier gate
    const { data: profile } = await sb.from("profiles").select("subscription_tier").eq("user_id", user.id).maybeSingle();
    if (!ALLOWED_TIERS.has((profile?.subscription_tier || "free").toLowerCase())) {
      return new Response(JSON.stringify({ error: "upgrade_required", message: "Real-time notifications are available on Pro, Elite, and Infinity." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newToken = genToken();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Upsert pending integration with fresh token
    await sb.from("notification_integrations").upsert({
      user_id: user.id,
      provider,
      status: "pending",
      connect_token: newToken,
      connect_token_expires_at: expires,
      provider_chat_id: null,
      last_error: null,
    }, { onConflict: "user_id,provider" });

    const bot = await getBotInfo();
    const deepLink = bot ? `https://t.me/${bot.username}?start=${newToken}` : null;

    return new Response(JSON.stringify({
      ok: true,
      provider,
      connect_token: newToken,
      expires_at: expires,
      bot_username: bot?.username || null,
      deep_link: deepLink,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});