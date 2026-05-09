// Public Telegram webhook. Handles two flows:
// 1) /start <token> — links the chat_id to the user's pending integration
// 2) Any other message — currently echoed/ignored (future: command surface)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTelegram } from "../_shared/notifications/telegram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-telegram-bot-api-secret-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const update = await req.json();
    const msg = update?.message || update?.edited_message;
    const chatId = String(msg?.chat?.id || "");
    const text = String(msg?.text || "").trim();
    const fromUsername = msg?.from?.username || null;
    if (!chatId) return ok();

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const token = parts[1];
      if (!token) {
        await sendTelegram(chatId, { title: "Hello 👋", body: "To link your HustleAI account, open Settings → Integrations and tap Connect Telegram." });
        return ok();
      }
      // Look up pending integration
      const { data: integ } = await sb.from("notification_integrations")
        .select("*").eq("connect_token", token).maybeSingle();
      if (!integ) {
        await sendTelegram(chatId, { title: "❌ Invalid token", body: "This link token is unknown. Please generate a fresh one from HustleAI." });
        return ok();
      }
      if (integ.connect_token_expires_at && new Date(integ.connect_token_expires_at) < new Date()) {
        await sendTelegram(chatId, { title: "⏰ Token expired", body: "Generate a new connect link from HustleAI Settings → Integrations." });
        return ok();
      }
      await sb.from("notification_integrations").update({
        status: "connected",
        provider_chat_id: chatId,
        provider_username: fromUsername,
        provider_user_id: String(msg?.from?.id || ""),
        connect_token: null,
        connect_token_expires_at: null,
        last_active_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", integ.id);
      await sendTelegram(chatId, {
        title: "✅ Connected!",
        body: "Your HustleAI account is now linked. You'll receive real-time alerts here for payments, AI tasks, security events, and more. Manage preferences in Settings → Integrations.",
      });
      return ok();
    }

    if (text === "/stop" || text === "/disconnect") {
      await sb.from("notification_integrations").update({
        status: "revoked", provider_chat_id: null,
      }).eq("provider", "telegram").eq("provider_chat_id", chatId);
      await sendTelegram(chatId, { title: "Disconnected", body: "You will no longer receive HustleAI notifications here." });
      return ok();
    }

    // Default — gentle ack
    if (text === "/help" || text === "/start@" || text === "/ping") {
      await sendTelegram(chatId, { body: "I'm the HustleAI notification bot. Use HustleAI Settings → Integrations to manage your alerts." });
    }
    return ok();
  } catch (e) {
    console.error("telegram-webhook error", e);
    return ok();
  }
});

function ok() {
  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}