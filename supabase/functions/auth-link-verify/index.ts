// auth-link-verify — runs after every successful sign-in.
// Closes the OAuth pre-account takeover gap by validating that the current
// session's identities all agree on email + verification, and migrating
// ownership when an OAuth claim resolves a locked unverified shell.
//
// Contract:
//   POST /functions/v1/auth-link-verify
//   Authorization: Bearer <user JWT>
//   -> { ok: true }                                     normal path
//   -> { ok: false, action: "force_signout", reason }   collision detected
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OAUTH_PROVIDERS = new Set(["google", "apple", "azure", "github", "discord"]);

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

async function logEvent(sb: ReturnType<typeof admin>, userId: string | null, email: string | null, type: string, severity: "info"|"warn"|"critical", metadata: Record<string, unknown> = {}) {
  try {
    await sb.rpc("log_security_auth_event", {
      _user_id: userId,
      _email: email,
      _event_type: type,
      _severity: severity,
      _metadata: metadata,
    });
  } catch { /* never fail the request on logging */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, reason: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ ok: false, reason: "missing_token" }, 401);

  const sb = admin();

  // Validate the user from the JWT
  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData?.user) {
    return json({ ok: false, reason: "invalid_token" }, 401);
  }
  const user = userData.user;
  const userId = user.id;
  const userEmail = (user.email || "").toLowerCase();

  // Pull all identities for this user
  const { data: identities, error: identErr } = await sb
    .from("identities")
    .select("id, provider, email, identity_data, created_at")
    .eq("user_id", userId)
    .schema("auth" as any);

  if (identErr) {
    // Fall back to admin listUsers if direct table read isn't permitted in this project.
    const { data: full } = await sb.auth.admin.getUserById(userId);
    const ids = (full?.user?.identities || []).map((i: any) => ({
      id: i.identity_id || i.id,
      provider: i.provider,
      email: (i.identity_data?.email || "").toLowerCase(),
      identity_data: i.identity_data,
      created_at: i.created_at,
    }));
    return await evaluate(sb, userId, userEmail, ids);
  }

  const ids = (identities || []).map((i: any) => ({
    id: i.id,
    provider: i.provider,
    email: (i.email || i.identity_data?.email || "").toLowerCase(),
    identity_data: i.identity_data,
    created_at: i.created_at,
  }));

  return await evaluate(sb, userId, userEmail, ids);
});

async function evaluate(
  sb: ReturnType<typeof admin>,
  userId: string,
  userEmail: string,
  identities: Array<{ id: string; provider: string; email: string; identity_data: any; created_at: string }>,
) {
  const oauthIds = identities.filter((i) => OAUTH_PROVIDERS.has(i.provider));
  const hasOauth = oauthIds.length > 0;

  // Provider collision check: every identity email must match user email and be verified.
  for (const ident of identities) {
    const identEmail = (ident.email || "").toLowerCase();
    const identVerified = ident.identity_data?.email_verified === true
      || ident.identity_data?.email_verified === "true";

    if (OAUTH_PROVIDERS.has(ident.provider)) {
      if (!identVerified || (identEmail && identEmail !== userEmail)) {
        await logEvent(sb, userId, userEmail, "provider_merge_blocked", "critical", {
          provider: ident.provider,
          identity_email: identEmail,
          user_email: userEmail,
          identity_verified: identVerified,
        });
        await sb.rpc("revoke_user_sessions", { _user_id: userId });
        try {
          await sb.from("profiles").update({
            restricted_pending_ownership_review: true,
            restricted_reason: "provider_collision",
          }).eq("user_id", userId);
        } catch { /* best effort */ }
        return json({ ok: false, action: "force_signout", reason: "provider_collision" });
      }
    }
  }

  // Read the current profile state
  const { data: profile } = await sb
    .from("profiles")
    .select("user_id, email, email_verified, restricted_pending_ownership_review, auth_provider, account_origin")
    .eq("user_id", userId)
    .maybeSingle();

  // Ownership migration: locked profile + valid OAuth claim by matching verified email → claim it.
  if (profile?.restricted_pending_ownership_review && hasOauth) {
    const claimant = oauthIds.find((i) => (i.email || "").toLowerCase() === userEmail);
    if (claimant) {
      await sb.rpc("claim_account_ownership", {
        _user_id: userId,
        _provider: claimant.provider,
      });
      // Revoke older sessions (Supabase will keep the current one alive via refresh).
      // We accept that the current OAuth session is also revoked — client will re-authenticate.
      await sb.rpc("revoke_user_sessions", { _user_id: userId });
      return json({
        ok: false,
        action: "force_signout",
        reason: "ownership_migrated",
        message: "Account ownership has been transferred. Please sign in again with Google.",
      });
    }
    // Locked but no valid OAuth claimant — refuse to proceed silently.
    return json({ ok: false, action: "force_signout", reason: "ownership_review_required" });
  }

  return json({ ok: true });
}