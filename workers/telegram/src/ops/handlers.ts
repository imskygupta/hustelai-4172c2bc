// Job handlers per (queue, kind). Each handler receives the JobRow and must
// either resolve (success) or throw (will be retried with backoff or DLQ'd).
import type { JobRow } from "./queue.js";
import { sendTelegram, formatAlert, type BotId } from "../telegram.js";
import { supabaseAdmin } from "../supabase.js";
import { ADMIN_CHAT_IDS } from "../env.js";
import { emitEvent } from "./queue.js";

type Handler = (job: JobRow) => Promise<Record<string, unknown>>;

const handlers: Record<string, Handler> = {
  // ------------------------------------------------------------------
  // telegram.* — outbound delivery routed via the queue (vs direct HTTP)
  // ------------------------------------------------------------------
  "telegram.alert": async (job) => {
    const p: any = job.payload ?? {};
    const bot: BotId = (p.bot as BotId) ?? "hustleai";
    const targets: string[] = Array.isArray(p.chatIds) && p.chatIds.length
      ? p.chatIds
      : (p.chatId ? [String(p.chatId)] : ADMIN_CHAT_IDS);
    const text: string = p.text || formatAlert({
      kind: p.kind ?? "queue.alert",
      severity: p.severity ?? "info",
      message: p.message ?? "",
      feature: p.feature ?? null,
      user_id: p.user_id ?? null,
      meta: p.meta ?? null,
    });
    const results: any[] = [];
    let anyOk = false;
    for (const chat of targets) {
      const r = await sendTelegram(chat, text, bot);
      results.push({ chat, ...r });
      if (r.ok) anyOk = true;
    }
    if (!anyOk) throw new Error(`telegram delivery failed: ${JSON.stringify(results)}`);
    await emitEvent("TELEGRAM_ALERT_SENT", { bot, targets: targets.length }, { traceId: job.trace_id, source: "worker.telegram" });
    return { results, sent: targets.length };
  },

  // ------------------------------------------------------------------
  // cleanup.* — pruning jobs that previously ran as edge functions
  // ------------------------------------------------------------------
  "cleanup.expired_exports": async () => {
    const { data, error } = await supabaseAdmin.rpc("mark_expired_exports" as any, {});
    if (error) throw new Error(error.message);
    return { marked: Number(data ?? 0) };
  },

  "cleanup.queue_purge": async () => {
    const { data, error } = await supabaseAdmin.rpc("queue_purge_expired" as any, {});
    if (error) throw new Error(error.message);
    return { result: data ?? {} };
  },

  "cleanup.ops_events_prune": async () => {
    // Keep 30d of events, 14d of job_events
    const e = await supabaseAdmin.from("events").delete().lt("created_at", new Date(Date.now() - 30 * 86400_000).toISOString());
    const j = await supabaseAdmin.from("job_events").delete().lt("created_at", new Date(Date.now() - 14 * 86400_000).toISOString());
    return { events_err: e.error?.message ?? null, job_events_err: j.error?.message ?? null };
  },
};

export function getHandler(kind: string): Handler | null {
  return handlers[kind] ?? null;
}

export const SUPPORTED_KINDS = Object.keys(handlers);