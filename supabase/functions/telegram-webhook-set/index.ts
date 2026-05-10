// Admin-only: set/clear the Telegram webhook URL for a registered bot.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = token ? await sb.auth.getUser(token) : { data: { user: null } };
    if (!user) throw new Error("Unauthorized");
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Not admin");

    const { bot_id, webhook_path, action = "set" } = await req.json();
    if (!bot_id) throw new Error("bot_id required");

    const { data: bot } = await sb.from("telegram_bots").select("*").eq("id", bot_id).maybeSingle();
    if (!bot) throw new Error("bot not found");
    const secretName = (bot as any).token_secret_name as string | null;
    const botToken = secretName ? Deno.env.get(secretName) : null;
    if (!botToken) throw new Error(`Secret ${secretName} not configured`);

    const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
    const target = action === "delete"
      ? null
      : `${base}/functions/v1/${webhook_path || ((bot as any).username === "theskymediabot" ? "skymedia-webhook" : "telegram-webhook")}`;

    let url: string; let body: any;
    if (action === "delete") {
      url = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
      body = { drop_pending_updates: false };
    } else {
      url = `https://api.telegram.org/bot${botToken}/setWebhook`;
      body = {
        url: target,
        allowed_updates: ["message", "edited_message", "callback_query"],
        drop_pending_updates: false,
      };
    }
    const r = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    await sb.from("telegram_bots").update({
      webhook_url: target, webhook_last_checked_at: new Date().toISOString(),
      last_response: { kind: "set_webhook", at: new Date().toISOString(), result: j } as any,
    } as any).eq("id", bot_id);
    return new Response(JSON.stringify({ ok: r.ok && j.ok, response: j, target }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});