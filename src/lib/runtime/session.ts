// Sprint D · Phase 1 — Canonical runtime session resolver (browser).
//
// Single source of truth for: auth token, user_id, tier, telegram eligibility,
// admin status, workspace ownership. Every export/artifact/delivery flow on the
// frontend must read from here instead of issuing its own ad-hoc queries.
//
// Implementation strategy:
//  - Reads Supabase session locally (no network) for user_id + access_token.
//  - Enriches tier/telegram/admin by reading the sibling DBs through their
//    already-configured clients (profiles on primary, notification_integrations
//    on primary, user_roles on primary). No new edge fn required for v1.
//  - In-memory 30s cache keyed on user_id so navigation doesn't refetch.
//  - Uses Promise.allSettled — a single source failing never blanks the whole
//    snapshot. Each field independently falls back to a safe default.

import { supabase } from "@/integrations/supabase/client";

export type RuntimeTier = "free" | "pro" | "elite" | "infinity";

export interface RuntimeTelegramState {
  connected: boolean;
  chat_id: string | null;
  username: string | null;
  bot_username: string | null;
}

export interface RuntimeSession {
  user_id: string | null;
  access_token: string | null;
  tier: RuntimeTier;
  telegram: RuntimeTelegramState;
  is_admin: boolean;
  workspace_owner_id: string | null;
  /** Epoch ms when this snapshot was built. */
  resolved_at: number;
  /** Set when no Supabase session is present at all. */
  anonymous: boolean;
}

const EMPTY_TG: RuntimeTelegramState = {
  connected: false,
  chat_id: null,
  username: null,
  bot_username: null,
};

const CACHE_TTL_MS = 30_000;
let cached: { key: string; snapshot: RuntimeSession; expiresAt: number } | null = null;
let inflight: Promise<RuntimeSession> | null = null;

function anonymous(): RuntimeSession {
  return {
    user_id: null,
    access_token: null,
    tier: "free",
    telegram: EMPTY_TG,
    is_admin: false,
    workspace_owner_id: null,
    resolved_at: Date.now(),
    anonymous: true,
  };
}

async function buildSnapshot(): Promise<RuntimeSession> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const session = sessionRes?.session ?? null;
  const user = session?.user ?? null;
  if (!user) return anonymous();

  // Each lookup is independent — failure of one must NOT zero the others.
  const [profileRes, tgRes, adminRes] = await Promise.allSettled([
    supabase
      .from("profiles")
      .select("subscription_tier, telegram_chat_id, telegram_username")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("notification_integrations" as any)
      .select("provider_chat_id, provider_username, config, status")
      .eq("user_id", user.id)
      .eq("provider", "telegram")
      .eq("status", "connected")
      .maybeSingle(),
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as any }),
  ]);

  const profile =
    profileRes.status === "fulfilled" ? ((profileRes.value as any).data ?? null) : null;
  const tgIntegration =
    tgRes.status === "fulfilled" ? ((tgRes.value as any).data ?? null) : null;
  const isAdmin =
    adminRes.status === "fulfilled" ? !!(adminRes.value as any).data : false;

  const tier = ((profile?.subscription_tier as RuntimeTier) || "free") as RuntimeTier;

  // Telegram: prefer notification_integrations (operational truth), fall back
  // to profile fields (legacy onboarding) so existing connections aren't lost.
  const chatId =
    tgIntegration?.provider_chat_id ??
    (profile?.telegram_chat_id ? String(profile.telegram_chat_id) : null);
  const username =
    tgIntegration?.provider_username ??
    profile?.telegram_username ??
    null;
  const botUsername =
    (tgIntegration?.config && (tgIntegration.config as any).bot_username) || null;

  return {
    user_id: user.id,
    access_token: session?.access_token ?? null,
    tier,
    telegram: {
      connected: !!chatId,
      chat_id: chatId,
      username,
      bot_username: botUsername,
    },
    is_admin: isAdmin,
    workspace_owner_id: user.id,
    resolved_at: Date.now(),
    anonymous: false,
  };
}

/**
 * Canonical runtime session snapshot. Cached 30s per user. Always resolves —
 * never throws — and returns an anonymous snapshot if no session is present.
 */
export async function getRuntimeSession(opts: { force?: boolean } = {}): Promise<RuntimeSession> {
  const now = Date.now();
  if (!opts.force && cached && cached.expiresAt > now) return cached.snapshot;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const snap = await buildSnapshot();
      cached = {
        key: snap.user_id || "anon",
        snapshot: snap,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return snap;
    } catch {
      // Last-resort: never throw. Return anon snapshot.
      return anonymous();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Invalidate the cache (call after connecting Telegram, tier change, etc.). */
export function invalidateRuntimeSession() {
  cached = null;
}

// Auto-invalidate on auth state changes so a fresh sign-in or signout flips
// the snapshot immediately.
if (typeof window !== "undefined") {
  try {
    supabase.auth.onAuthStateChange(() => {
      invalidateRuntimeSession();
    });
  } catch {
    /* SSR / non-browser — ignore */
  }
}