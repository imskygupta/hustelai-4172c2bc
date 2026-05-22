// Pre-signup guard. Validates email against policy BEFORE the client calls
// supabase.auth.signUp. Logs blocked attempts and notifies admin via SkyMedia.
// Public endpoint (no JWT required) — only validates an email string.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { checkEmailPolicy } from "../_shared/email-policy.ts";
import { parseJson, S, z, badRequest } from "../_shared/validation.ts";
import { enforceRateLimit, ipKey } from "../_shared/rate-limit.ts";
import { recordAnomaly } from "../_shared/anomaly.ts";

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

const Body = z.object({
  email: S.email(),
  source: z.string().trim().max(80).optional().default(""),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const parsed = await parseJson(req, Body, { maxBytes: 4 * 1024 });
    if (!parsed.ok) return parsed.response;
    const { email, source } = parsed.data;

    const sb = admin();

    // Rate limit per IP — defends against signup enumeration / spam.
    const limit = await enforceRateLimit(sb, {
      key: `signup-guard:${ipKey(req)}`, windowSec: 600, max: 20,
    });
    if (!limit.ok) {
      void recordAnomaly(sb, {
        eventType: "rate_limit.exceeded", severity: "warn",
        email, req, metadata: { surface: "signup-guard", hits: limit.hits },
      });
      return limit.response;
    }

    const result = checkEmailPolicy(email);

    if (result.ok) {
      // Pre-account takeover defense: if a row already exists for this email,
      // do NOT allow a fresh password signup to mint a parallel shell.
      const emailLower = email.toLowerCase().trim();
      try {
        const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list?.users?.find((u: any) => (u.email || "").toLowerCase() === emailLower);
        if (existing) {
          if (existing.email_confirmed_at) {
            void sb.rpc("log_security_auth_event", {
              _user_id: existing.id, _email: emailLower,
              _event_type: "auth.signup_blocked", _severity: "warn",
              _metadata: { reason: "email_already_registered", source },
            });
            return json({ ok: false, reason: "email_already_registered",
              message: "This email is already registered. Try signing in instead." }, 200);
          }
          // Unconfirmed shell exists. If stale (>24h) suspend it; either way reject.
          const ageHours = (Date.now() - new Date(existing.created_at).getTime()) / 36e5;
          if (ageHours >= 24) {
            try { await sb.rpc("auto_suspend_unverified"); } catch { /* best-effort */ }
          }
          void sb.rpc("log_security_auth_event", {
            _user_id: existing.id, _email: emailLower,
            _event_type: "auth.signup_blocked", _severity: "warn",
            _metadata: { reason: "verification_pending", age_hours: ageHours, source },
          });
          return json({ ok: false, reason: "verification_pending",
            message: "A signup is already in progress for this email. Check your inbox or sign in with Google." }, 200);
        }
      } catch { /* fall through — never block legitimate signup on a lookup error */ }

      return json({ ok: true });
    }

    // Log + notify (fire-and-forget)
    void sb.from("signup_blocked_log").insert({
      email: email.toLowerCase().trim(),
      reason: result.reason,
      source: source || null,
      ip: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    }).then(() => undefined, () => undefined);

    void recordAnomaly(sb, {
      eventType: "auth.signup_blocked", severity: "warn",
      email, req, metadata: { reason: result.reason, source },
    });

    void fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/admin-bot-notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "signup_blocked",
        payload: {
          email,
          reason: result.reason,
          source,
          timestamp: new Date().toISOString(),
        },
      }),
    }).catch(() => undefined);

    return json({ ok: false, reason: result.reason, message: result.message }, 200);
  } catch (e: any) {
    return json({ ok: false, reason: "error", message: String(e?.message || e) }, 200);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}