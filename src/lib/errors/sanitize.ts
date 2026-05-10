// Centralized user-safe error mapping. All toast/notification flows should run
// errors through `humanizeError` before showing them to users. Internal stack
// traces and edge function payloads should never reach the UI.

export type ErrorAction = "retry" | "reconnect" | "upgrade" | "wait" | "auth" | "none";

export interface HumanError {
  title: string;
  message: string;
  action: ErrorAction;
  code: string;
  reportToAdmin: boolean;
  rawHint?: string;
}

const RAW_LIMIT = 240;

function rawHint(e: unknown): string {
  let s = "";
  try {
    if (typeof e === "string") s = e;
    else if (e && typeof e === "object") {
      const anyE = e as any;
      s = anyE?.message || anyE?.error?.message || anyE?.error || JSON.stringify(anyE);
    } else s = String(e);
  } catch { s = "unknown"; }
  return String(s).slice(0, RAW_LIMIT);
}

const RULES: Array<{ test: (s: string) => boolean; build: () => Omit<HumanError, "rawHint"> }> = [
  { test: (s) => /quota_unlockable|unlockable/i.test(s),
    build: () => ({ title: "You've used today's free generations", message: "Come back tomorrow or unlock more instantly — unused unlocks roll over.", action: "upgrade", code: "quota_unlockable", reportToAdmin: false }) },
  { test: (s) => /quota|exceeded.*limit|tier_locked|max_value|consume_usage/i.test(s),
    build: () => ({ title: "You've hit your plan limit", message: "Upgrade your plan to keep generating, or wait for the next reset.", action: "upgrade", code: "quota", reportToAdmin: false }) },
  { test: (s) => /no_telegram|not connected.*telegram|telegram.*chat|provider_chat_id/i.test(s),
    build: () => ({ title: "Telegram isn't connected", message: "Reconnect Telegram from Integrations to continue.", action: "reconnect", code: "telegram_not_connected", reportToAdmin: false }) },
  { test: (s) => /telegram_(notifications|storage)_disabled/i.test(s),
    build: () => ({ title: "Telegram delivery unavailable", message: "This feature is paused right now. Try again later.", action: "wait", code: "telegram_disabled", reportToAdmin: false }) },
  { test: (s) => /bot.*blocked|chat not found|forbidden.*telegram|kicked/i.test(s),
    build: () => ({ title: "Telegram link broken", message: "Reconnect Telegram — the bot can no longer message you.", action: "reconnect", code: "telegram_blocked", reportToAdmin: true }) },
  { test: (s) => /\botp\b|one[- ]time password|verification code/i.test(s),
    build: () => ({ title: "Access code required", message: "Enter the 6-digit code shared with you.", action: "auth", code: "otp_required", reportToAdmin: false }) },
  { test: (s) => /\bexpired\b|past.*expiry/i.test(s),
    build: () => ({ title: "This link has expired", message: "Ask the sender for a fresh link.", action: "none", code: "expired", reportToAdmin: false }) },
  { test: (s) => /\brevoked\b|disabled by owner/i.test(s),
    build: () => ({ title: "This link was revoked", message: "The owner has disabled access.", action: "none", code: "revoked", reportToAdmin: false }) },
  { test: (s) => /link used|limit_reached|max_uses|used up/i.test(s),
    build: () => ({ title: "Link already used", message: "This share link has reached its download limit.", action: "none", code: "limit_reached", reportToAdmin: false }) },
  { test: (s) => /not[ _]found|404|file missing/i.test(s),
    build: () => ({ title: "Not found", message: "We couldn't locate that item — it may have been removed.", action: "none", code: "not_found", reportToAdmin: false }) },
  { test: (s) => /unauthor|forbidden|jwt|wrong user|sign in|not authenticated/i.test(s),
    build: () => ({ title: "Sign-in required", message: "Please sign in to continue.", action: "auth", code: "auth_required", reportToAdmin: false }) },
  { test: (s) => /still processing|^pending$|^queued$|in progress/i.test(s),
    build: () => ({ title: "Still processing", message: "We're working on it — refresh in a few seconds.", action: "wait", code: "processing", reportToAdmin: false }) },
  { test: (s) => /network|fetch failed|failed to fetch|timeout|aborted|disconnected|offline/i.test(s),
    build: () => ({ title: "Connection issue", message: "Check your internet and try again.", action: "retry", code: "network", reportToAdmin: false }) },
  { test: (s) => /edge function|FunctionsHttpError|FunctionsRelayError|non-?2xx|\b50\d\b|\b502\b|\b504\b/i.test(s),
    build: () => ({ title: "Something interrupted that request", message: "We've logged it. Try again in a moment.", action: "retry", code: "edge_failure", reportToAdmin: true }) },
];

const FALLBACK: Omit<HumanError, "rawHint"> = {
  title: "Something went wrong",
  message: "We've logged the issue. Try again in a moment.",
  action: "retry", code: "unknown", reportToAdmin: true,
};

export function humanizeError(e: unknown, _context?: string): HumanError {
  const raw = rawHint(e);
  for (const r of RULES) {
    if (r.test(raw)) return { ...r.build(), rawHint: raw };
  }
  return { ...FALLBACK, rawHint: raw };
}
