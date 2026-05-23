// Sprint D · Phase 1 — Canonical server-side session resolver.
//
// Any edge function that needs to know "who is this and what can they do?"
// must call resolveSession(req). It handles three identity modes:
//
//   1. User JWT  — Authorization: Bearer <supabase access token>
//                  (browser invokes, supabase.functions.invoke())
//   2. Worker key — x-runtime-key: <RUNTIME_WORKER_KEY>
//                  (Railway workers calling internal endpoints)
//   3. Anonymous — no headers; caller decides whether that's allowed.
//
// Returns a canonical RuntimeSession that mirrors the browser shape so the
// same downstream logic (tier gates, telegram routing, admin checks) works
// in both contexts.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type RuntimeTier = "free" | "pro" | "elite" | "infinity";

export interface RuntimeTelegramState {
  connected: boolean;
  chat_id: string | null;
  username: string | null;
  bot_username: string | null;
}

export interface RuntimeSession {
  mode: "user" | "worker" | "anonymous";
  user_id: string | null;
  access_token: string | null;
  tier: RuntimeTier;
  telegram: RuntimeTelegramState;
  is_admin: boolean;
  workspace_owner_id: string | null;
  resolved_at: number;
}

const EMPTY_TG: RuntimeTelegramState = {
  connected: false, chat_id: null, username: null, bot_username: null,
};

function anonymous(): RuntimeSession {
  return {
    mode: "anonymous",
    user_id: null,
    access_token: null,
    tier: "free",
    telegram: EMPTY_TG,
    is_admin: false,
    workspace_owner_id: null,
    resolved_at: Date.now(),
  };
}

function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function enrich(userId: string, sb: SupabaseClient): Promise<Omit<RuntimeSession, "mode" | "user_id" | "access_token" | "resolved_at">> {
  const [profileRes, tgRes, adminRes] = await Promise.allSettled([
    sb.from("profiles")
      .select("subscription_tier, telegram_chat_id, telegram_username")
      .eq("user_id", userId)
      .maybeSingle(),
    sb.from("notification_integrations" as any)
      .select("provider_chat_id, provider_username, config, status")
      .eq("user_id", userId)
      .eq("provider", "telegram")
      .eq("status", "connected")
      .maybeSingle(),
    sb.rpc("has_role", { _user_id: userId, _role: "admin" as any }),
  ]);

  const profile = profileRes.status === "fulfilled" ? (profileRes.value as any).data : null;
  const tg = tgRes.status === "fulfilled" ? (tgRes.value as any).data : null;
  const isAdmin = adminRes.status === "fulfilled" ? !!(adminRes.value as any).data : false;

  const tier = ((profile?.subscription_tier as RuntimeTier) || "free") as RuntimeTier;
  const chatId = tg?.provider_chat_id ?? (profile?.telegram_chat_id ? String(profile.telegram_chat_id) : null);
  const username = tg?.provider_username ?? profile?.telegram_username ?? null;
  const botUsername = (tg?.config && (tg.config as any).bot_username) || null;

  return {
    tier,
    telegram: { connected: !!chatId, chat_id: chatId, username, bot_username: botUsername },
    is_admin: isAdmin,
    workspace_owner_id: userId,
  };
}

export async function resolveSession(req: Request): Promise<RuntimeSession> {
  // Worker identity — short-circuit before touching auth.
  const workerKey = req.headers.get("x-runtime-key") || "";
  const expectedWorkerKey = Deno.env.get("RUNTIME_WORKER_KEY") || "";
  if (expectedWorkerKey && workerKey && workerKey === expectedWorkerKey) {
    // Workers can pass an x-runtime-user header to act on a specific user.
    const onBehalfOf = req.headers.get("x-runtime-user");
    if (onBehalfOf) {
      const sb = adminClient();
      try {
        const enriched = await enrich(onBehalfOf, sb);
        return {
          mode: "worker",
          user_id: onBehalfOf,
          access_token: null,
          resolved_at: Date.now(),
          ...enriched,
        };
      } catch {
        /* fall through to anon-worker */
      }
    }
    return { ...anonymous(), mode: "worker" };
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return anonymous();
  const jwt = authHeader.slice(7).trim();
  if (!jwt) return anonymous();

  const sb = adminClient();
  const { data, error } = await sb.auth.getUser(jwt);
  if (error || !data?.user) return anonymous();

  try {
    const enriched = await enrich(data.user.id, sb);
    return {
      mode: "user",
      user_id: data.user.id,
      access_token: jwt,
      resolved_at: Date.now(),
      ...enriched,
    };
  } catch {
    return {
      mode: "user",
      user_id: data.user.id,
      access_token: jwt,
      tier: "free",
      telegram: EMPTY_TG,
      is_admin: false,
      workspace_owner_id: data.user.id,
      resolved_at: Date.now(),
    };
  }
}

/** Convenience: 401 helper for endpoints requiring an authenticated user. */
export function requireUser(
  session: RuntimeSession,
  corsHeaders: Record<string, string>,
): Response | null {
  if (session.mode === "user" && session.user_id) return null;
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}