import { supabase } from "@/integrations/supabase/client";

export type UserSignals = {
  telegram_chat_id: string | null;
  telegram_username: string | null;
  telegram_last_active_at: string | null;
  wallet_balance: number;
  paid_orders: number;
  failed_orders: number;
  last_paid_at: string | null;
  total_paid: number;
  blocked_attempts: number;
  signup_source: string | null;
  is_admin: boolean;
  is_moderator: boolean;
};

export type UserSignalsMap = Record<string, UserSignals>;

/**
 * Build a derived-signals map keyed by user_id WITHOUT schema changes.
 * Lightweight joins only — five small selects, all RLS-safe for admins.
 */
export async function loadUserSignals(userIds: string[], emails: (string | null)[]): Promise<UserSignalsMap> {
  if (!userIds.length) return {};
  const map: UserSignalsMap = {};
  for (const id of userIds) {
    map[id] = {
      telegram_chat_id: null, telegram_username: null, telegram_last_active_at: null,
      wallet_balance: 0, paid_orders: 0, failed_orders: 0, last_paid_at: null, total_paid: 0,
      blocked_attempts: 0, signup_source: null, is_admin: false, is_moderator: false,
    };
  }

  const [tg, wallets, orders, roles, blocked] = await Promise.all([
    (supabase as any).from("notification_integrations")
      .select("user_id, provider_chat_id, provider_username, last_active_at, status")
      .in("user_id", userIds).eq("provider", "telegram"),
    (supabase as any).from("user_wallets").select("user_id, balance").in("user_id", userIds),
    (supabase as any).from("orders")
      .select("user_id, amount, status, created_at")
      .in("user_id", userIds).order("created_at", { ascending: false }).limit(2000),
    (supabase as any).from("user_roles").select("user_id, role").in("user_id", userIds),
    emails.filter(Boolean).length
      ? (supabase as any).from("signup_blocked_log")
          .select("email, source, created_at")
          .in("email", emails.filter(Boolean) as string[])
      : Promise.resolve({ data: [] as any[] }),
  ]);

  (tg.data || []).forEach((r: any) => {
    const m = map[r.user_id]; if (!m) return;
    if (r.status === "connected") m.telegram_chat_id = r.provider_chat_id;
    m.telegram_username = r.provider_username;
    m.telegram_last_active_at = r.last_active_at;
  });

  (wallets.data || []).forEach((r: any) => {
    const m = map[r.user_id]; if (!m) return;
    m.wallet_balance = Number(r.balance ?? 0);
  });

  (orders.data || []).forEach((r: any) => {
    const m = map[r.user_id]; if (!m) return;
    if (r.status === "paid" || r.status === "completed" || r.status === "success") {
      m.paid_orders += 1;
      m.total_paid += Number(r.amount ?? 0);
      if (!m.last_paid_at || r.created_at > m.last_paid_at) m.last_paid_at = r.created_at;
    } else if (r.status === "failed" || r.status === "cancelled") {
      m.failed_orders += 1;
    }
  });

  (roles.data || []).forEach((r: any) => {
    const m = map[r.user_id]; if (!m) return;
    if (r.role === "admin") m.is_admin = true;
    if (r.role === "moderator") m.is_moderator = true;
  });

  // Map blocked attempts back via email → user_id
  const blockedByEmail: Record<string, { count: number; source: string | null }> = {};
  (blocked.data || []).forEach((r: any) => {
    const k = (r.email || "").toLowerCase();
    if (!k) return;
    if (!blockedByEmail[k]) blockedByEmail[k] = { count: 0, source: r.source ?? null };
    blockedByEmail[k].count += 1;
  });
  // Map back: this counts attempts on the email a successful user later signed up with.
  Object.values(map).forEach(() => {});
  // Iterate users to attach by email
  emails.forEach((em, i) => {
    if (!em) return;
    const id = userIds[i];
    const hit = blockedByEmail[em.toLowerCase()];
    if (hit && map[id]) map[id].blocked_attempts = hit.count;
    if (hit?.source && map[id]) map[id].signup_source = hit.source;
  });

  return map;
}

export type UserStatus = "healthy" | "premium" | "internal" | "inactive" | "suspicious" | "blocked";

/** Derive an at-a-glance status pill for a user. Heuristic, never destructive. */
export function deriveUserStatus(p: { subscription_tier?: string | null; created_at?: string | null }, s: UserSignals): UserStatus {
  if (s.is_admin) return "internal";
  if (s.blocked_attempts > 0 || s.failed_orders >= 3) return "suspicious";
  if (p.subscription_tier && p.subscription_tier !== "free") return "premium";
  // inactive: no telegram activity, no orders, signed up >30d ago
  const createdMs = p.created_at ? new Date(p.created_at).getTime() : Date.now();
  const ageDays = (Date.now() - createdMs) / 86400000;
  if (ageDays > 30 && !s.telegram_last_active_at && s.paid_orders === 0) return "inactive";
  return "healthy";
}

export const STATUS_STYLES: Record<UserStatus, { label: string; cls: string }> = {
  healthy:    { label: "Healthy",    cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  premium:    { label: "Premium",    cls: "bg-violet-500/10 text-violet-400 border-violet-500/30" },
  internal:   { label: "Internal",   cls: "bg-slate-500/10 text-slate-300 border-slate-500/30" },
  inactive:   { label: "Inactive",   cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" },
  suspicious: { label: "Suspicious", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  blocked:    { label: "Blocked",    cls: "bg-destructive/10 text-destructive border-destructive/30" },
};
