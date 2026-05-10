// Public Telegram webhook. Handles two flows:
// 1) /start <token> — links the chat_id to the user's pending integration
// 2) Any other message — currently echoed/ignored (future: command surface)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTelegram, answerCallbackQuery } from "../_shared/notifications/telegram.ts";
import { randomToken } from "../_shared/exports/createExport.ts";
import { isFeatureEnabledServer } from "../_shared/flags/resolve.ts";
import { emitWorkflowEvent } from "../_shared/workflows/emit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-telegram-bot-api-secret-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const update = await req.json();
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Handle inline keyboard callbacks (Download / Revoke buttons)
    if (update?.callback_query) {
      const cb = update.callback_query;
      const cbId = cb.id;
      const data = String(cb.data || "");
      const chatId = String(cb.message?.chat?.id || "");

      // Admin payment approvals (chat must be the admin chat)
      if (data.startsWith("pay_ok:") || data.startsWith("pay_no:")) {
        const adminChat = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "";
        if (chatId !== adminChat) { await answerCallbackQuery(cbId, "Admin only"); return ok(); }
        const approve = data.startsWith("pay_ok:");
        const paymentId = data.split(":")[1];
        const newStatus = approve ? "approved" : "rejected";
        await sb.from("payments").update({ status: newStatus, reviewed_at: new Date().toISOString() } as any).eq("id", paymentId).catch(() => {});
        await answerCallbackQuery(cbId, approve ? "Approved" : "Rejected");
        await sendTelegram(chatId, { body: `Payment <code>${paymentId}</code> → <b>${newStatus.toUpperCase()}</b>` });
        return ok();
      }

      const [action, exportId] = data.split(":");
      const { data: exp } = await sb.from("generated_exports").select("*").eq("id", exportId).maybeSingle();
      if (!exp) { await answerCallbackQuery(cbId, "Not found"); return ok(); }
      // Verify chat owns this export
      const { data: integ } = await sb.from("notification_integrations")
        .select("user_id").eq("provider", "telegram").eq("provider_chat_id", chatId).maybeSingle();
      if (!integ || integ.user_id !== exp.user_id) { await answerCallbackQuery(cbId, "Forbidden"); return ok(); }

      if (action === "dl") {
        const tok = randomToken(24);
        await sb.from("export_download_tokens").insert({
          export_id: exp.id, token: tok, user_id: exp.user_id,
          expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
          max_uses: 1, requires_otp: false,
        });
        const origin = Deno.env.get("PUBLIC_SITE_URL") || "https://hustlaiapp.in";
        await sendTelegram(chatId, { title: `🔐 Download link`, body: `Single-use, expires in 30 min.`, url: `${origin}/d/${tok}` });
        await answerCallbackQuery(cbId, "Link sent");
      } else if (action === "rev") {
        await sb.from("export_download_tokens").update({ revoked_at: new Date().toISOString() }).eq("export_id", exp.id);
        await sb.from("generated_exports").update({ status: "revoked" }).eq("id", exp.id);
        await answerCallbackQuery(cbId, "Revoked");
        await sendTelegram(chatId, { body: `🔒 <b>${escape(exp.title)}</b> revoked.` });
      } else {
        await answerCallbackQuery(cbId);
      }
      return ok();
    }

    const msg = update?.message || update?.edited_message;
    const chatId = String(msg?.chat?.id || "");
    const text = String(msg?.text || "").trim();
    const fromUsername = msg?.from?.username || null;
    if (!chatId) return ok();

    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const token = parts[1];
      // /start without token is the public auth handshake — gated by telegram.auth
      if (!(await isFeatureEnabledServer(null, "telegram.auth"))) {
        await sendTelegram(chatId, {
          title: "🛠 Account linking paused",
          body: "Telegram linking is temporarily under maintenance. Please try again in a few minutes.",
        });
        return ok();
      }
      if (!token) {
        await sendTelegram(chatId, { title: "Hello 👋", body: "To link your HustleAI account, open Settings → Integrations and tap Connect Telegram." });
        return ok();
      }

      // Deep-link export delivery: /start dl_<token>
      if (token.startsWith("dl_")) {
        const dlTok = token.slice(3);
        const { data: tok } = await sb.from("export_download_tokens").select("*").eq("token", dlTok).maybeSingle();
        if (!tok || tok.revoked_at || (tok.expires_at && new Date(tok.expires_at) < new Date()) || (tok.max_uses && tok.uses_count >= tok.max_uses)) {
          await sendTelegram(chatId, { title: "🔒 Link unavailable", body: "This download link is invalid, expired, or already used." });
          return ok();
        }
        // Verify chat owns the export
        const { data: integ } = await sb.from("notification_integrations")
          .select("user_id").eq("provider", "telegram").eq("provider_chat_id", chatId).maybeSingle();
        if (!integ || integ.user_id !== tok.user_id) {
          await sendTelegram(chatId, { title: "🚫 Forbidden", body: "This download isn't bound to your account. Connect from HustleAI → Settings → Integrations first." });
          return ok();
        }
        await sb.from("export_download_tokens").update({
          uses_count: (tok.uses_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        }).eq("id", tok.id);
        // Trigger telegram delivery (uses cached file_id if available)
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/export-deliver-telegram`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ export_id: tok.export_id }),
        }).catch(() => {});
        await sb.rpc("consume_export_download" as any, { _export_id: tok.export_id, _user_id: tok.user_id }).catch(() => {});
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
      // Enforce one-Telegram-account-per-user (and one-user-per-chat).
      const { data: existing } = await sb.from("notification_integrations")
        .select("id,user_id").eq("provider", "telegram").eq("provider_chat_id", chatId).neq("user_id", integ.user_id).maybeSingle();
      if (existing) {
        await sendTelegram(chatId, { title: "🚫 Already linked", body: "This Telegram account is connected to a different HustleAI user. Disconnect there first via /disconnect." });
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
      void emitWorkflowEvent(sb, "telegram.connected", {
        user_id: integ.user_id, chat_id: chatId, username: fromUsername,
        provider_user_id: String(msg?.from?.id || ""),
      }, { user_id: integ.user_id, dedupe_key: `tg_connect:${integ.user_id}:${chatId}`, source: "telegram-webhook" });
      return ok();
    }

    if (text === "/stop" || text === "/disconnect") {
      const { data: existingLink } = await sb.from("notification_integrations")
        .select("user_id").eq("provider", "telegram").eq("provider_chat_id", chatId).maybeSingle();
      await sb.from("notification_integrations").update({
        status: "revoked", provider_chat_id: null,
      }).eq("provider", "telegram").eq("provider_chat_id", chatId);
      await sendTelegram(chatId, { title: "Disconnected", body: "You will no longer receive HustleAI notifications here." });
      if (existingLink?.user_id) {
        void emitWorkflowEvent(sb, "telegram.disconnected", {
          user_id: existingLink.user_id, chat_id: chatId, source: "user_command",
        }, { user_id: existingLink.user_id, dedupe_key: `tg_disc:${existingLink.user_id}:${Date.now()}`, source: "telegram-webhook" });
      }
      return ok();
    }

    // Resolve user from chat
    const { data: integ } = await sb.from("notification_integrations")
      .select("user_id").eq("provider", "telegram").eq("provider_chat_id", chatId).eq("status", "connected").maybeSingle();
    // Free-form bot commands gated by telegram.commands
    if (integ?.user_id && !(await isFeatureEnabledServer(integ.user_id, "telegram.commands"))) {
      await sendTelegram(chatId, {
        title: "💤 Bot commands paused",
        body: "Bot commands are temporarily disabled by the operations team. We'll be back shortly.",
      });
      return ok();
    }
    const userId = integ?.user_id || null;

    const cmd = text.split(/\s+/)[0].toLowerCase();

    if (cmd === "/help" || cmd === "/ping") {
      await sendTelegram(chatId, {
        title: "HustleAI bot — commands",
        body: [
          "/files — recent exports",
          "/latest — most recent export",
          "/exports — alias of /files",
          "/resume — most recent resume",
          "/history — last 10 exports",
          "/storage — your storage usage",
          "/verify — show your linked chat info",
          "/security — recent security events",
          "/plan — your plan & usage",
          "/disconnect — unlink this chat",
        ].join("\n"),
      });
      return ok();
    }

    if (!userId) {
      await sendTelegram(chatId, { body: "This chat isn't linked. Open HustleAI → Settings → Integrations to connect." });
      return ok();
    }

    if (cmd === "/files" || cmd === "/exports" || cmd === "/latest" || cmd === "/history") {
      const limit = cmd === "/latest" ? 1 : (cmd === "/history" ? 10 : 5);
      const { data: exps } = await sb.from("generated_exports")
        .select("id, title, export_type, status, created_at, size_bytes")
        .eq("user_id", userId)
        .neq("status", "revoked")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!exps?.length) { await sendTelegram(chatId, { body: "No exports yet." }); return ok(); }
      for (const e of exps) {
        await sendTelegram(chatId, {
          title: `📄 ${e.title}`,
          body: `${e.export_type} · ${humanBytes(e.size_bytes)} · ${e.status}\n${new Date(e.created_at).toLocaleString()}`,
          // @ts-ignore – telegram inline keyboard
          reply_markup: { inline_keyboard: [[
            { text: "⬇️ Download", callback_data: `dl:${e.id}` },
            { text: "🔒 Revoke", callback_data: `rev:${e.id}` },
          ]] },
        } as any);
      }
      return ok();
    }

    if (cmd === "/resume") {
      const { data: exps } = await sb.from("generated_exports")
        .select("id, title, export_type, status, created_at, size_bytes")
        .eq("user_id", userId)
        .ilike("export_type", "%resume%")
        .neq("status", "revoked")
        .order("created_at", { ascending: false })
        .limit(1);
      if (!exps?.length) { await sendTelegram(chatId, { body: "No resume exports yet. Build one in HustleAI → Resume Optimizer." }); return ok(); }
      const e = exps[0];
      await sendTelegram(chatId, {
        title: `📄 ${e.title}`,
        body: `${e.export_type} · ${humanBytes(e.size_bytes)}\n${new Date(e.created_at).toLocaleString()}`,
        // @ts-ignore
        reply_markup: { inline_keyboard: [[{ text: "⬇️ Download", callback_data: `dl:${e.id}` }]] },
      } as any);
      return ok();
    }

    if (cmd === "/storage") {
      const { data: rows } = await sb.from("generated_exports")
        .select("size_bytes,status").eq("user_id", userId).neq("status", "revoked");
      const count = rows?.length || 0;
      const bytes = (rows || []).reduce((a, r: any) => a + (r.size_bytes || 0), 0);
      const { data: p } = await sb.from("profiles").select("subscription_tier").eq("user_id", userId).maybeSingle();
      const tier = (p?.subscription_tier || "free").toLowerCase();
      const cap = tier === "free" ? "7 days TTL" : "Persistent";
      await sendTelegram(chatId, {
        title: "💾 Storage",
        body: `Files: <b>${count}</b>\nUsed: <b>${humanBytes(bytes)}</b>\nTier: <b>${tier.toUpperCase()}</b>\nRetention: ${cap}`,
      });
      return ok();
    }

    if (cmd === "/verify") {
      await sendTelegram(chatId, {
        title: "🆔 Linked chat",
        body: `chat_id: <code>${chatId}</code>\nuser_id: <code>${userId}</code>\nShare this with support if needed.`,
      });
      return ok();
    }

    if (cmd === "/security") {
      const { data: evs } = await sb.from("notification_events")
        .select("title, message, created_at, category")
        .eq("user_id", userId).eq("category", "security")
        .order("created_at", { ascending: false }).limit(5);
      if (!evs?.length) { await sendTelegram(chatId, { body: "No recent security events. ✅" }); return ok(); }
      const body = evs.map(e => `• ${new Date(e.created_at).toLocaleString()} — ${e.title || e.message}`).join("\n");
      await sendTelegram(chatId, { title: "🛡️ Security events", body });
      return ok();
    }

    if (cmd === "/plan") {
      const { data: p } = await sb.from("profiles")
        .select("subscription_tier, subscription_expires_at").eq("user_id", userId).maybeSingle();
      await sendTelegram(chatId, {
        title: "📊 Your plan",
        body: `Tier: <b>${(p?.subscription_tier || "free").toUpperCase()}</b>${p?.subscription_expires_at ? `\nRenews: ${new Date(p.subscription_expires_at).toLocaleDateString()}` : ""}`,
        url: (Deno.env.get("PUBLIC_SITE_URL") || "https://hustlaiapp.in") + "/payment",
      });
      return ok();
    }

    await sendTelegram(chatId, { body: "Unknown command. Send /help." });
    return ok();
  } catch (e) {
    console.error("telegram-webhook error", e);
    return ok();
  }
});

function ok() {
  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function escape(s: string) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function humanBytes(n: number) {
  if (!n) return "0 B";
  const u = ["B","KB","MB","GB"]; let i=0; let v=n;
  while (v >= 1024 && i < u.length-1) { v/=1024; i++; }
  return `${v.toFixed(v<10?1:0)} ${u[i]}`;
}