import express, { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { env, ADMIN_CHAT_IDS } from "./env.js";
import { sendTelegram, getBotInfo, formatAlert, type BotId } from "./telegram.js";
import { supabaseAdmin } from "./supabase.js";
import { dedupeKey, isDuplicate } from "./dedupe.js";
import { startPoller } from "./ops/poller.js";
import { startCron } from "./ops/cron.js";
import { startSweeper, startHeartbeat } from "./ops/sweeper.js";

const app = express();
app.use(express.json({ limit: "256kb" }));

// --- Auth middleware ---
function requireWorkerSecret(req: Request, res: Response, next: NextFunction) {
  const provided = req.header("x-worker-secret") || "";
  if (provided !== env.WORKER_SHARED_SECRET) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  next();
}

// --- Health ---
app.get("/health", async (_req, res) => {
  const bot = await getBotInfo();
  res.json({
    ok: true,
    service: "hustlai-telegram-worker",
    uptime_s: Math.round(process.uptime()),
    bot_reachable: !!bot,
    bot_username: bot?.username || null,
    admin_chats: ADMIN_CHAT_IDS.length,
    env: env.NODE_ENV,
    ts: new Date().toISOString(),
  });
});

// --- Send alert ---
const AlertSchema = z.object({
  // Simple payload mode: { bot, message, chatId } — used by the Lovable Cloud
  // edge-function fan-out. Either `message` (simple) or `kind`+`message` (full)
  // is accepted.
  bot: z.enum(["hustleai", "skymedia"]).optional(),
  chatId: z.string().max(60).nullable().optional(),
  kind: z.string().min(1).max(120).optional(),
  severity: z.enum(["info", "warning", "error", "critical"]).default("warning"),
  source: z.string().max(120).default("worker"),
  user_id: z.string().uuid().nullable().optional(),
  feature: z.string().max(120).nullable().optional(),
  message: z.string().min(1).max(2000),
  meta: z.record(z.any()).nullable().optional(),
  // If true, forces telegram delivery regardless of severity (used for digests)
  force_telegram: z.boolean().optional(),
  // Optional explicit dedupe override
  dedupe_key: z.string().max(240).nullable().optional(),
  // Legacy alias for chatId
  chat_id: z.string().max(60).nullable().optional(),
});

app.post("/send-alert", requireWorkerSecret, async (req, res) => {
  const parsed = AlertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "invalid payload", details: parsed.error.flatten() });
  }
  const a = parsed.data;
  const effectiveBot: BotId = a.bot ?? "hustleai";
  const effectiveChat = a.chatId ?? a.chat_id ?? null;
  // In simple mode (no `kind`), default to forced telegram + a synthetic kind
  // so we still record the alert and always deliver.
  const isSimpleMode = !a.kind;
  const kind = a.kind ?? `worker.${a.source || "msg"}`;
  const forceSend = a.force_telegram === true || isSimpleMode;

  const key = a.dedupe_key || dedupeKey([kind, effectiveBot, a.user_id, a.message.slice(0, 80)]);
  if (isDuplicate(key)) {
    return res.json({ ok: true, deduped: true });
  }

  // 1. Record in admin_alerts (best-effort; never blocks telegram)
  let alertId: string | null = null;
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_alerts")
      .insert({
        kind,
        severity: a.severity,
        source: a.source,
        user_id: a.user_id ?? null,
        feature: a.feature ?? null,
        message: a.message.slice(0, 500),
        meta: { ...(a.meta ?? {}), bot: effectiveBot },
      })
      .select("id")
      .single();
    if (!error) alertId = data?.id ?? null;
    else console.warn("[admin_alerts] insert failed:", error.message);
  } catch (e: any) {
    console.warn("[admin_alerts] insert threw:", e?.message || e);
  }

  // 2. Telegram fan-out
  const shouldSend =
    forceSend ||
    a.severity === "error" ||
    a.severity === "critical";

  const results: Array<{ chat: string; ok: boolean; error?: string; message_id?: string }> = [];

  if (shouldSend) {
    const text = isSimpleMode
      ? a.message
      : formatAlert({
          kind,
          severity: a.severity,
          message: a.message,
          feature: a.feature ?? null,
          user_id: a.user_id ?? null,
          meta: a.meta ?? null,
        });
    const targets = effectiveChat ? [effectiveChat] : ADMIN_CHAT_IDS;
    for (const chat of targets) {
      const r = await sendTelegram(chat, text, effectiveBot);
      results.push({ chat, ...r } as any);
    }
    const anyOk = results.some((r) => r.ok);
    if (anyOk && alertId) {
      await supabaseAdmin
        .from("admin_alerts")
        .update({ telegram_sent: true })
        .eq("id", alertId)
        .then(() => {}, () => {});
    }
  }

  return res.json({
    ok: true,
    alert_id: alertId,
    telegram_attempted: shouldSend,
    results,
  });
});

// --- 404 + error handlers ---
app.use((_req, res) => res.status(404).json({ ok: false, error: "not_found" }));
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[unhandled]", err);
  res.status(500).json({ ok: false, error: "internal_error" });
});

app.listen(env.PORT, () => {
  console.log(`[telegram-worker] listening on :${env.PORT} (chats=${ADMIN_CHAT_IDS.length})`);

  // --- ops loops (opt-in via OPS_WORKER_ENABLED=true) ---
  if (String(process.env.OPS_WORKER_ENABLED ?? "false").toLowerCase() === "true") {
    const workerId = process.env.OPS_WORKER_ID || `ops-${process.pid}-${Math.random().toString(36).slice(2, 6)}`;
    const queues: Array<"telegram" | "cleanup" | "cron"> = ["telegram", "cleanup", "cron"];
    const ctl = new AbortController();
    process.on("SIGTERM", () => ctl.abort());
    process.on("SIGINT", () => ctl.abort());
    for (const q of queues) startPoller(q, workerId, ctl.signal);
    startCron(ctl.signal);
    startSweeper(workerId, queues, ctl.signal);
    startHeartbeat(workerId, queues, ctl.signal);
    console.log(`[ops-worker] enabled — id=${workerId} queues=${queues.join(",")}`);
  } else {
    console.log(`[ops-worker] disabled (set OPS_WORKER_ENABLED=true to enable)`);
  }
});

process.on("unhandledRejection", (r) => console.error("[unhandledRejection]", r));
process.on("uncaughtException", (e) => console.error("[uncaughtException]", e));