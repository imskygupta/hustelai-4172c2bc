// High-level emit helpers — keep edge function code free of message wording.
// All helpers are fire-and-forget; never await before responding to the user.
import { dispatchNotification } from "./dispatcher.ts";

export interface BillingEvent {
  user_id: string;
  event: "payment_succeeded" | "payment_failed" | "upi_submitted" | "upi_approved" | "upi_rejected"
       | "subscription_upgraded" | "subscription_downgraded" | "subscription_cancelled"
       | "wallet_topup" | "wallet_low_balance";
  amount?: number;
  currency?: string;
  plan?: string;
  reason?: string;
  link?: string;
  email_fallback?: string;
}

const COPY: Record<string, (e: BillingEvent) => { title: string; body: string }> = {
  payment_succeeded: (e) => ({
    title: "✅ Payment received",
    body: `Your ${e.currency || "₹"}${e.amount ?? ""} ${e.plan ? `${e.plan} ` : ""}payment was successful. Welcome aboard.`,
  }),
  payment_failed: (e) => ({
    title: "⚠️ Payment failed",
    body: `We couldn't complete your payment${e.reason ? ` (${e.reason})` : ""}. No money was charged. Tap to retry.`,
  }),
  upi_submitted: () => ({
    title: "🧾 UPI payment received",
    body: "We've received your UPI submission. Our team typically verifies in under a minute.",
  }),
  upi_approved: (e) => ({
    title: "✅ UPI payment approved",
    body: `Your ${e.plan || "plan"} is now active. Welcome — let's go.`,
  }),
  upi_rejected: (e) => ({
    title: "❌ UPI payment couldn't be verified",
    body: e.reason || "We couldn't match your UPI payment. Tap to resubmit with a clearer screenshot.",
  }),
  subscription_upgraded: (e) => ({
    title: "🚀 Plan upgraded",
    body: `You're now on ${e.plan || "a higher plan"}. New limits unlocked.`,
  }),
  subscription_downgraded: (e) => ({
    title: "Plan changed",
    body: `You're now on ${e.plan || "a different plan"}.`,
  }),
  subscription_cancelled: () => ({
    title: "Subscription cancelled",
    body: "Your subscription is cancelled. You'll keep access until the period ends.",
  }),
  wallet_topup: (e) => ({
    title: "💰 Wallet topped up",
    body: `${e.currency || "₹"}${e.amount ?? ""} added to your wallet.`,
  }),
  wallet_low_balance: (e) => ({
    title: "Wallet running low",
    body: `Your wallet balance is ${e.currency || "₹"}${e.amount ?? "low"}. Top up to keep AI tools running.`,
  }),
};

export function emitBillingEvent(e: BillingEvent): void {
  const c = (COPY[e.event] || (() => ({ title: e.event, body: "" })))(e);
  dispatchNotification({
    user_id: e.user_id,
    event_key: e.event,
    category: "billing",
    source: "billing",
    link: e.link,
    email_fallback: e.email_fallback,
    message: { title: c.title, body: c.body, url: e.link, payload: { amount: e.amount, plan: e.plan } },
  });
}

export function emitSecurityEvent(opts: {
  user_id: string; event: string; title: string; body: string; link?: string; email_fallback?: string;
}): void {
  dispatchNotification({
    user_id: opts.user_id,
    event_key: opts.event,
    category: "security",
    source: "security",
    link: opts.link,
    email_fallback: opts.email_fallback,
    message: { title: opts.title, body: opts.body, url: opts.link },
  });
}

export function emitNotificationEvent(opts: {
  user_id: string; event_key: string; category?: string; title: string; body: string; link?: string;
  payload?: Record<string, any>; channels?: any[];
}): void {
  dispatchNotification({
    user_id: opts.user_id,
    event_key: opts.event_key,
    category: opts.category || "general",
    source: opts.category || "app",
    link: opts.link,
    channels: opts.channels,
    message: { title: opts.title, body: opts.body, url: opts.link, payload: opts.payload },
  });
}

export function emitAITaskComplete(user_id: string, opts: { tool: string; link?: string }): void {
  emitNotificationEvent({
    user_id, event_key: "ai_task_complete", category: "ai",
    title: "✨ AI task ready",
    body: `Your ${opts.tool} run finished. Tap to view the result.`,
    link: opts.link,
  });
}

export function emitAffiliateCommission(user_id: string, amount: number, currency = "₹"): void {
  emitNotificationEvent({
    user_id, event_key: "affiliate_commission", category: "affiliate",
    title: "🤝 Commission earned",
    body: `You just earned ${currency}${amount} from a referral. Nice.`,
    link: "/affiliates",
  });
}