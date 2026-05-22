// session-revoke-all — user-initiated "Sign out everywhere".
// Requires a recent re-authentication (profiles.last_reauth_at within
// REAUTH_WINDOW_SEC). Validates the caller JWT, enforces rate-limit, then
// calls revoke_user_sessions() to delete all auth.sessions rows for the user.
//
// Contract:
//   POST /functions/v1/session-revoke-all
//   Authorization: Bearer <user JWT>
//   200 -> { ok: true, revoked: <n> }
//   401 -> { ok: false, reason: "invalid_token" | "reauth_required" }
//   429 -> { ok: false, reason: "rate_limited" }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REAUTH_WINDOW_SEC = 10 * 60;

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logEvent(
  sb: ReturnType<typeof admin>,
  userId: string | null,
  email: string | null,
  type: string,
  severity: "info" | "warn" | "critical",
  metadata: Record<string, unknown> = {},
) {
  try {
    await sb.rpc("log_security_auth_event", {
      _user_id: userId,
      _email: email,
      _event_type: type,
      _severity: severity,
      _metadata: metadata,
    });
  } catch { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, reason: "method_not_allowed" }, 405);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ ok: false, reason: "missing_token" }, 401);

  const sb = admin();
  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData?.user) return json({ ok: false, reason: "invalid_token" }, 401);

  const userId = userData.user.id;
  const userEmail = (userData.user.email || "").toLowerCase() || null;

  // Rate-limit — 5 revocations / hour / user.
  try {
    const { data: rl } = await sb.rpc("rate_limit_hit", {
      _bucket_key: `revokeall:${userId}`,
      _window_seconds: 3600,
      _max_hits: 5,
    });
    if (rl && rl[0] && rl[0].allowed === false) {
      return json({ ok: false, reason: "rate_limited", retryAfter: rl[0].retry_after_seconds ?? 3600 }, 429);
    }
  } catch { /* fail open */ }

  // Step-up: require recent re-auth.
  const { data: profile } = await sb
    .from("profiles")
    .select("last_reauth_at")
    .eq("user_id", userId)
    .maybeSingle();

  const lastReauth = profile?.last_reauth_at ? new Date(profile.last_reauth_at).getTime() : 0;
  if (!lastReauth || (Date.now() - lastReauth) > REAUTH_WINDOW_SEC * 1000) {
    return json({ ok: false, reason: "reauth_required" }, 401);
  }

  // Revoke all sessions.
  const { data: revoked, error: revErr } = await sb.rpc("revoke_user_sessions", { _user_id: userId });
  if (revErr) {
    await logEvent(sb, userId, userEmail, "sessions_revocation_failed", "critical", { error: revErr.message });
    return json({ ok: false, reason: "revoke_failed" }, 500);
  }

  await logEvent(sb, userId, userEmail, "sessions_revoked", "warn", {
    initiated_by: "user",
    count: revoked ?? 0,
  });

  return json({ ok: true, revoked: revoked ?? 0 });
});
