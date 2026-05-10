// Toast wrapper around humanizeError. Use everywhere instead of raw
// `toast({ description: e.message })` patterns. Quietly reports to admin
// for infra-class errors so operators see what users can't.
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { humanizeError, type HumanError } from "./sanitize";

export interface NotifyOptions {
  context?: string;
  feature?: string;
  /** Force suppression of admin alert even for infra errors */
  silentAdmin?: boolean;
  /** Override action label */
  actionLabel?: string;
  /** Override action handler */
  onAction?: () => void;
}

const RECENT = new Map<string, number>();
const DEDUPE_MS = 4000;

function dedupeKey(h: HumanError, ctx?: string) {
  return `${ctx || ""}::${h.code}`;
}

export function notifyError(e: unknown, opts: NotifyOptions = {}): HumanError {
  const h = humanizeError(e, opts.context);
  const key = dedupeKey(h, opts.context);
  const now = Date.now();
  const last = RECENT.get(key) || 0;
  if (now - last < DEDUPE_MS) return h;
  RECENT.set(key, now);

  const tOpts: any = { description: h.message };
  if (opts.actionLabel && opts.onAction) {
    tOpts.action = { label: opts.actionLabel, onClick: opts.onAction };
  } else if (h.action === "upgrade") {
    tOpts.action = { label: "Upgrade", onClick: () => (window.location.href = "/pricing") };
  } else if (h.action === "reconnect") {
    tOpts.action = { label: "Reconnect", onClick: () => (window.location.href = "/settings/telegram") };
  } else if (h.action === "auth") {
    tOpts.action = { label: "Sign in", onClick: () => (window.location.href = "/login") };
  }

  toast.error(h.title, tOpts);

  if (h.reportToAdmin && !opts.silentAdmin) {
    void reportToAdmin(h, opts).catch(() => { /* swallow */ });
  }
  return h;
}

export function notifySuccess(title: string, description?: string) {
  toast.success(title, description ? { description } : undefined);
}

async function reportToAdmin(h: HumanError, opts: NotifyOptions) {
  try {
    await supabase.functions.invoke("admin-alert", {
      body: {
        kind: `client.${h.code}`,
        severity: h.code === "edge_failure" || h.code === "telegram_blocked" ? "error" : "warning",
        source: "client",
        feature: opts.feature || opts.context,
        message: h.title,
        meta: { context: opts.context, raw: h.rawHint, action: h.action },
      },
    });
  } catch { /* never bubble */ }
}
