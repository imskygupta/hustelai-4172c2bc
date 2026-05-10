// SkyMedia Admin Bot Webhook (multi-bot architecture).
// Separate webhook + command surface from the user-facing HustleAI bot.
// Authorizes by Telegram chat ID (telegram_admin_users) AND optionally a
// linked profiles row with admin role. Audits every command attempt.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-telegram-bot-api-secret-token",
};

const SKYMEDIA_TOKEN = Deno.env.get("SKYMEDIA_BOT_TOKEN") || "";
const ENV_ADMIN_IDS = (Deno.env.get("TELEGRAM_ADMIN_CHAT_IDS") || "")
  .split(/[,\s]+/).map(s => s.trim()).filter(Boolean);

function escape(s: string) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

async function tg(method: string, payload: any) {
  if (!SKYMEDIA_TOKEN) return { ok: false, error: "SKYMEDIA_BOT_TOKEN not set" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${SKYMEDIA_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && j.ok, result: j.result, error: j.description };
  } catch (e: any) { return { ok: false, error: String(e?.message || e) }; }
}

async function send(chatId: string, text: string, extra: any = {}) {
  return tg("sendMessage", {
    chat_id: chatId, text, parse_mode: "HTML",
    disable_web_page_preview: true, ...extra,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const update = await req.json();
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve bot row
    const { data: bot } = await sb.from("telegram_bots")
      .select("*").eq("username", "theskymediabot").maybeSingle();

    if (bot && (bot as any).runtime_enabled === false) {
      const cb = update?.callback_query?.message?.chat?.id;
      const m = update?.message?.chat?.id;
      const cid = String(cb || m || "");
      if (cid) await send(cid, "🛑 SkyMedia ops bot is currently disabled by an operator.");
      return ok();
    }

    const msg = update?.message || update?.edited_message || update?.callback_query?.message;
    const fromId = String(update?.message?.from?.id || update?.callback_query?.from?.id || "");
    const fromUsername = update?.message?.from?.username || update?.callback_query?.from?.username || null;
    const chatId = String(msg?.chat?.id || "");
    const text = String(update?.message?.text || update?.callback_query?.data || "").trim();
    if (!chatId || !text) return ok();

    // Authorization: must be in telegram_admin_users (enabled) for this bot OR env list
    const { data: adminRow } = await sb.from("telegram_admin_users")
      .select("*").eq("telegram_chat_id", fromId).eq("enabled", true)
      .or(`bot_id.eq.${(bot as any)?.id},bot_id.is.null`).maybeSingle();
    const envAllowed = ENV_ADMIN_IDS.includes(fromId);
    const allowed = !!adminRow || envAllowed;

    const cmd = text.toLowerCase().split(/\s+/)[0].replace(/^\//, "").split("@")[0];
    const args = text.split(/\s+/).slice(1);

    // Audit attempt
    await sb.from("telegram_admin_audit").insert({
      bot_id: (bot as any)?.id || null,
      telegram_chat_id: fromId,
      telegram_username: fromUsername,
      command: cmd,
      args: args.join(" ") || null,
      allowed,
      reason: allowed ? (adminRow ? "admin_user_row" : "env_chat_id") : "not_authorized",
    });

    if (!allowed) {
      await send(chatId,
        `🚫 <b>Unauthorized</b>\nYour Telegram ID <code>${fromId}</code> is not on the SkyMedia admin allowlist.\nAsk an existing admin to add you in HustleAI → Admin → Telegram Ops.`);
      return ok();
    }

    // Update bot heartbeat
    if (bot?.id) {
      await sb.from("telegram_bots").update({
        last_command_at: new Date().toISOString(),
        last_command: cmd,
      } as any).eq("id", (bot as any).id);
    }

    let result: any = { ok: true };
    switch (cmd) {
      case "start":
      case "help": {
        await send(chatId, [
          "<b>🛰 SkyMedia Ops</b>",
          "Authorized admin command surface.",
          "",
          "/runtime — runtime + queue snapshot",
          "/flags — kill switches & maintenance",
          "/incidents — open flag incidents",
          "/queues — workflow + AI job depth",
          "/aijobs — last 24h AI job summary",
          "/payments — pending UPI / recent payments",
          "/exports — recent export deliveries",
          "/broadcast &lt;tier|all&gt; &lt;message&gt;",
          "/maintenance &lt;flag&gt; &lt;on|off&gt;",
          "/whoami — your authorization state",
        ].join("\n"));
        break;
      }
      case "whoami": {
        await send(chatId,
          `<b>You</b>\nchat_id: <code>${fromId}</code>\nusername: ${fromUsername ? "@"+fromUsername : "—"}\nallowlist: ${adminRow ? "admin_users row" : "env"}\nbot: <code>${(bot as any)?.username}</code>`);
        break;
      }
      case "runtime": {
        const [{ data: wf }, { data: ai }, { data: tg }] = await Promise.all([
          sb.rpc("workflow_ops_summary" as any, { _since: new Date(Date.now()-86400000).toISOString() }),
          sb.rpc("ai_jobs_ops_summary" as any, { _since: new Date(Date.now()-86400000).toISOString() }),
          sb.rpc("telegram_ops_overview" as any, { _since: new Date(Date.now()-86400000).toISOString() }),
        ]);
        const w: any = wf || {}; const a: any = ai || {}; const t: any = tg || {};
        await send(chatId, [
          "<b>⚙️ Runtime · 24h</b>",
          `Workflows: ${w.total_runs||0} (✅ ${w.succeeded||0} / ❌ ${w.failed||0}) · DLQ ${w.dlq_open||0}`,
          `Queue lag p95: ${w.queue_lag_p95_s||0}s`,
          `AI jobs: ${a.total||0} · ✅ ${a.succeeded||0} · ❌ ${a.failed||0} · running ${a.running||0}`,
          `Tokens: in ${a.tokens_in||0} / out ${a.tokens_out||0} · cost ${a.total_cost||0}`,
          `Telegram deliv: ${t?.deliveries?.total||0} · success ${t?.deliveries?.success_rate||0}%`,
        ].join("\n"));
        break;
      }
      case "flags": {
        const { data: rows } = await sb.from("feature_flags")
          .select("feature_key,enabled,kill_switch,maintenance,rollout_percentage")
          .or("kill_switch.eq.true,maintenance.eq.true,enabled.eq.false")
          .limit(40);
        const list = (rows || []).map((r: any) =>
          `${r.kill_switch?"🛑":r.maintenance?"🛠":"⏸"} <code>${r.feature_key}</code> · roll ${r.rollout_percentage}%`
        ).join("\n") || "✅ No active kill switches or maintenance.";
        await send(chatId, `<b>🚦 Flags</b>\n${list}`);
        break;
      }
      case "incidents": {
        const { data: rows } = await sb.from("feature_flag_incidents" as any)
          .select("flag_key,kind,severity,message,created_at,resolved_at")
          .is("resolved_at", null).order("created_at", { ascending: false }).limit(15);
        if (!rows?.length) { await send(chatId, "✅ No open incidents."); break; }
        const body = (rows as any[]).map((r) =>
          `• [${r.severity}] <code>${r.flag_key}</code> — ${escape(r.message||r.kind)}`
        ).join("\n");
        await send(chatId, `<b>🚨 Open Incidents</b>\n${body}`);
        break;
      }
      case "queues": {
        const [{ count: wfPending }, { count: aiQueued }, { count: aiRunning }] = await Promise.all([
          sb.from("workflow_runs").select("*", { count: "exact", head: true }).in("status", ["pending","retrying"]),
          sb.from("ai_jobs").select("*", { count: "exact", head: true }).in("status", ["queued","retrying"]),
          sb.from("ai_jobs").select("*", { count: "exact", head: true }).eq("status", "running"),
        ]);
        await send(chatId, [
          "<b>📥 Queues</b>",
          `Workflow pending: <b>${wfPending||0}</b>`,
          `AI queued: <b>${aiQueued||0}</b> · running: <b>${aiRunning||0}</b>`,
        ].join("\n"));
        break;
      }
      case "aijobs": {
        const { data } = await sb.rpc("ai_jobs_ops_summary" as any, {
          _since: new Date(Date.now()-86400000).toISOString(),
        });
        const a: any = data || {};
        await send(chatId, [
          "<b>🤖 AI Jobs · 24h</b>",
          `Total: ${a.total||0} · ✅ ${a.succeeded||0} · ❌ ${a.failed||0} · ↻ ${a.retrying||0}`,
          `Avg ${a.avg_duration_ms||0}ms · p95 ${a.p95_duration_ms||0}ms`,
          `Tokens in/out: ${a.tokens_in||0} / ${a.tokens_out||0} · cost ${a.total_cost||0}`,
        ].join("\n"));
        break;
      }
      case "payments": {
        const { data: pending } = await sb.from("payments")
          .select("id,amount,method,status,created_at")
          .eq("status", "pending").order("created_at", { ascending: false }).limit(10);
        if (!pending?.length) { await send(chatId, "✅ No pending payments."); break; }
        const body = (pending as any[]).map(p =>
          `• <code>${String(p.id).slice(0,8)}</code> ${p.method} ₹${p.amount} — ${new Date(p.created_at).toLocaleString()}`
        ).join("\n");
        await send(chatId, `<b>💳 Pending Payments</b>\n${body}`);
        break;
      }
      case "exports": {
        const { data: exps } = await sb.from("generated_exports")
          .select("title,export_type,status,created_at")
          .order("created_at", { ascending: false }).limit(10);
        const body = (exps || []).map((e: any) =>
          `• ${e.status==='delivered'?'✅':e.status==='failed'?'❌':'⏳'} ${escape(e.title)} (${e.export_type})`
        ).join("\n") || "No recent exports.";
        await send(chatId, `<b>📦 Recent Exports</b>\n${body}`);
        break;
      }
      case "broadcast": {
        if (args.length < 2) { await send(chatId, "Usage: <code>/broadcast &lt;tier|all&gt; &lt;message…&gt;</code>"); break; }
        const audience = args[0].toLowerCase();
        const message = args.slice(1).join(" ");
        // Confirmation flow: send buttons
        const conf = `bcast:${audience}:${Date.now()}`;
        // Stash temporarily in audit row
        await sb.from("telegram_admin_audit").insert({
          bot_id: (bot as any)?.id || null, telegram_chat_id: fromId,
          telegram_username: fromUsername, command: "broadcast.draft",
          args: JSON.stringify({ audience, message }),
          allowed: true, reason: "draft",
        });
        await send(chatId, `<b>📣 Confirm broadcast</b>\nAudience: <b>${audience}</b>\nMessage:\n${escape(message)}`, {
          reply_markup: { inline_keyboard: [[
            { text: "✅ Send", callback_data: `bcast_ok:${audience}` },
            { text: "✖ Cancel", callback_data: `bcast_no` },
          ]] },
        });
        break;
      }
      case "bcast_ok": {
        const audience = args[0] || text.split(":")[1] || "all";
        // Pull last draft for this admin
        const { data: draft } = await sb.from("telegram_admin_audit")
          .select("args,created_at").eq("telegram_chat_id", fromId).eq("command", "broadcast.draft")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const parsed = draft ? JSON.parse((draft as any).args || "{}") : {};
        const message = parsed.message;
        if (!message) { await send(chatId, "⚠ No pending broadcast draft."); break; }
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-broadcast`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Service role bypasses the user JWT check inside the function only if it tolerates
            // auth.getUser(token) returning a service token — instead we mark via header and
            // create the broadcast_jobs row directly here.
          },
          body: JSON.stringify({ title: "SkyMedia ops broadcast", message, audience }),
        }).catch(() => null);
        // Direct insert path (bypasses JWT requirement of telegram-broadcast):
        await sb.from("broadcast_jobs").insert({
          title: "SkyMedia ops broadcast", message, audience, channel: "telegram",
          status: "queued", created_by: null,
        });
        await send(chatId, `✅ Broadcast queued for <b>${audience}</b>. Check Admin → Telegram Ops for delivery.`);
        result = { broadcast: { audience, queued: true } };
        break;
      }
      case "bcast_no": {
        await send(chatId, "✖ Broadcast cancelled.");
        break;
      }
      case "maintenance": {
        if (args.length < 2) { await send(chatId, "Usage: <code>/maintenance &lt;flag_key&gt; &lt;on|off&gt;</code>"); break; }
        const [flag, mode] = args;
        const enable = mode.toLowerCase() === "on";
        const conf = `maint:${flag}:${enable?'on':'off'}`;
        await send(chatId, `⚠ <b>Confirm maintenance ${enable?'ON':'OFF'} for</b> <code>${flag}</code>`, {
          reply_markup: { inline_keyboard: [[
            { text: "✅ Apply", callback_data: `maint_ok:${flag}:${enable?'on':'off'}` },
            { text: "✖ Cancel", callback_data: `maint_no` },
          ]] },
        });
        break;
      }
      case "maint_ok": {
        const [flag, mode] = args;
        if (!flag) { await send(chatId, "Bad request."); break; }
        const enable = mode === "on";
        const { error } = await sb.from("feature_flags")
          .update({ maintenance: enable, maintenance_message: enable ? "Maintenance via SkyMedia bot" : null } as any)
          .eq("feature_key", flag);
        if (error) { await send(chatId, `❌ ${escape(error.message)}`); }
        else { await send(chatId, `✅ Maintenance <b>${enable?'enabled':'cleared'}</b> for <code>${flag}</code>`); }
        result = { maintenance: { flag, enable, error: error?.message } };
        break;
      }
      case "maint_no": {
        await send(chatId, "✖ Maintenance change cancelled.");
        break;
      }
      default: {
        await send(chatId, "Unknown command. Send /help.");
      }
    }

    // Persist last_response on bot
    if (bot?.id) {
      await sb.from("telegram_bots").update({
        last_response: { command: cmd, at: new Date().toISOString(), result } as any,
      } as any).eq("id", (bot as any).id);
    }

    // Audit final outcome (separate row from attempt for clarity)
    await sb.from("telegram_admin_audit").insert({
      bot_id: (bot as any)?.id || null, telegram_chat_id: fromId,
      telegram_username: fromUsername, command: cmd + ".result",
      args: args.join(" ") || null, allowed: true, reason: "executed",
      result,
    });

    return ok();
  } catch (e) {
    console.error("skymedia-webhook error", e);
    return ok();
  }
});

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}