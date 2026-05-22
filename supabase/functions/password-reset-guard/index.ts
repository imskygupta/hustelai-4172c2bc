// password-reset-guard — gates supabase.auth.resetPasswordForEmail.
// Denies reset when the account has no password-based auth enabled
// (auth_provider != 'password' AND password_enabled = false). This closes
// the OAuth-hijack -> enable-password -> persistence chain.
//
// Contract:
//   POST /functions/v1/password-reset-guard
//   Body: { email: string }
//   200 -> { allowed: true }
//   200 -> { allowed: false, reason: "password_auth_not_enabled" | "rate_limited" | "invalid_email" }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") || "";
  return (xf.split(",")[0] || "").trim() || "unknown";
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
  } catch { /* never fail on logging */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ allowed: false, reason: "method_not_allowed" }, 405);

  let body: { email?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 320) {
    return json({ allowed: false, reason: "invalid_email" }, 400);
  }

  const sb = admin();
  const ip = clientIp(req);

  // Rate-limit per (ip, email) — 5 attempts / 10 min.
  try {
    const { data: rl } = await sb.rpc("rate_limit_hit", {
      _bucket_key: `pwreset:${ip}:${email}`.slice(0, 200),
      _window_seconds: 600,
      _max_hits: 5,
    });
    if (rl && rl[0] && rl[0].allowed === false) {
      await logEvent(sb, null, email, "password_reset_rate_limited", "warn", { ip });
      return json({
        allowed: false,
        reason: "rate_limited",
        retryAfter: rl[0].retry_after_seconds ?? 600,
      });
    }
  } catch { /* fail open on rate-limit infra error */ }

  const { data: profile } = await sb
    .from("profiles")
    .select("user_id, email, auth_provider, password_enabled")
    .ilike("email", email)
    .maybeSingle();

  // Unknown email — allow silently to avoid account enumeration.
  if (!profile) return json({ allowed: true });

  const hasPassword =
    profile.auth_provider === "password" || profile.password_enabled === true;

  if (!hasPassword) {
    await logEvent(sb, profile.user_id, email, "password_reset_blocked", "critical", {
      ip,
      auth_provider: profile.auth_provider,
      password_enabled: profile.password_enabled,
    });
    return json({ allowed: false, reason: "password_auth_not_enabled" });
  }

  await logEvent(sb, profile.user_id, email, "password_reset_allowed", "info", { ip });
  return json({ allowed: true });
});
