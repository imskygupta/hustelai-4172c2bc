// telegram-bot-health — admin-only ping of a registered bot's getMe endpoint.
// Updates telegram_bots.status + last_ping_at. Never exposes the token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { flagGuard } from "../_shared/flags/resolve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user } } = token ? await sb.auth.getUser(token) : { data: { user: null } };
    if (!user) throw new Error("Unauthorized");
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Not admin");

    const blocked = await flagGuard(user.id, "telegram.admin_ops", corsHeaders, { endpoint: "telegram-bot-health" });
    if (blocked) return blocked;

    const { bot_id } = await req.json();
    if (!bot_id) throw new Error("bot_id required");

    const { data: bot } = await sb.from("telegram_bots").select("*").eq("id", bot_id).maybeSingle();
    if (!bot) throw new Error("bot not found");
    const secretName = (bot as any).token_secret_name as string | null;
    const botToken = secretName ? Deno.env.get(secretName) : null;

    let status = "unknown";
    let result: any = null;
    if (!botToken) {
      status = "down";
      result = { error: `Secret ${secretName} not configured` };
    } else {
      try {
        const r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const j = await r.json();
        status = j?.ok ? "ok" : "degraded";
        result = j?.result || j;
      } catch (err) {
        status = "down";
        result = { error: (err as Error).message };
      }
    }

    await sb.from("telegram_bots").update({
      status, last_ping_at: new Date().toISOString(),
    } as any).eq("id", bot_id);

    return new Response(JSON.stringify({ ok: true, status, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
