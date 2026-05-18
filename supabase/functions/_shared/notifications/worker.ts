// Centralized dispatcher → Railway Telegram worker. Replaces all direct
// Telegram bot calls from edge functions. Fire-and-forget by default; never
// throws into caller.
//
// Required env:
//   TELEGRAM_WORKER_URL     e.g. https://hustleai-tg.up.railway.app
//   TELEGRAM_WORKER_SECRET  same value as WORKER_SHARED_SECRET on Railway

export type WorkerBot = "hustleai" | "skymedia";

export interface WorkerDispatchInput {
  bot?: WorkerBot;            // default "hustleai"
  message: string;            // pre-formatted text (HTML allowed)
  chatId?: string | null;     // optional override; omit = fan-out to admin chats
  // Optional richer fields (still accepted by worker; recorded in admin_alerts)
  kind?: string;
  severity?: "info" | "warning" | "error" | "critical";
  source?: string;
  user_id?: string | null;
  feature?: string | null;
  meta?: Record<string, any> | null;
  force_telegram?: boolean;
  dedupe_key?: string | null;
}

const WORKER_URL = (Deno.env.get("TELEGRAM_WORKER_URL") || "").replace(/\/+$/, "");
const WORKER_SECRET = Deno.env.get("TELEGRAM_WORKER_SECRET") || "";

export function workerConfigured(): boolean {
  return !!(WORKER_URL && WORKER_SECRET);
}

/**
 * Dispatch to the Telegram worker. Awaits the HTTP call but never throws —
 * always resolves to a result object. Safe for fire-and-forget via `void`.
 */
export async function dispatchToWorker(
  input: WorkerDispatchInput,
): Promise<{ ok: boolean; status?: number; error?: string; body?: any }> {
  if (!workerConfigured()) {
    return { ok: false, error: "telegram worker not configured" };
  }
  try {
    const r = await fetch(`${WORKER_URL}/send-alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": WORKER_SECRET,
      },
      body: JSON.stringify({
        bot: input.bot ?? "hustleai",
        message: input.message,
        chatId: input.chatId ?? undefined,
        kind: input.kind,
        severity: input.severity,
        source: input.source,
        user_id: input.user_id ?? undefined,
        feature: input.feature ?? undefined,
        meta: input.meta ?? undefined,
        force_telegram: input.force_telegram,
        dedupe_key: input.dedupe_key ?? undefined,
      }),
    });
    const body = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, body };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}