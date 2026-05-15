// Email policy for signup / password reset.
// Anti-abuse phase: Gmail-only + hard blocklist + disposable-domain filter.
// Server-mirrored in supabase/functions/_shared/email-policy.ts (keep in sync).

const BLOCKED_EMAILS = new Set<string>([
  "samratakash0000@gmail.com",
]);

const BLOCKED_DOMAINS = new Set<string>([
  "skycart.xyz",
]);

const DISPOSABLE_DOMAINS = new Set<string>([
  "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
  "yopmail.com", "trashmail.com", "getnada.com", "dispostable.com",
  "throwawaymail.com", "fakeinbox.com", "maildrop.cc", "sharklasers.com",
  "tempr.email", "moakt.com", "spambox.us", "mintemail.com",
]);

const ALLOWED_DOMAINS = new Set<string>([
  "gmail.com",
]);

export type EmailPolicyResult =
  | { ok: true; normalized: string }
  | { ok: false; reason: string; message: string };

export function checkEmailPolicy(rawEmail: string): EmailPolicyResult {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, reason: "invalid_format", message: "Please enter a valid email address." };
  }
  const [, domain] = email.split("@");
  if (!domain) {
    return { ok: false, reason: "invalid_format", message: "Please enter a valid email address." };
  }

  if (BLOCKED_EMAILS.has(email)) {
    return { ok: false, reason: "blocked_email", message: "This email address cannot be used to create an account." };
  }
  if (BLOCKED_DOMAINS.has(domain)) {
    return { ok: false, reason: "blocked_domain", message: "This email domain is not permitted." };
  }
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, reason: "disposable_domain", message: "Disposable / temporary email providers are not allowed." };
  }
  if (!ALLOWED_DOMAINS.has(domain)) {
    return {
      ok: false,
      reason: "non_allowed_domain",
      message: "We're currently in invite-only beta — only Gmail accounts are accepted.",
    };
  }

  return { ok: true, normalized: email };
}