/**
 * Centralized public-facing brand contact configuration.
 *
 * NOTE: This is for VISIBLE/PUBLIC references only (footer, contact pages,
 * legal pages, marketing copy). It is NOT used by transactional email
 * infrastructure (Resend / Supabase Auth SMTP) — those keep their own
 * branded sender identities.
 */

export const PUBLIC_CONTACT_EMAIL = "hustlaiapp@zohomail.in";

export const SUPPORT_EMAIL = PUBLIC_CONTACT_EMAIL;
export const CONTACT_EMAIL = PUBLIC_CONTACT_EMAIL;
export const BILLING_EMAIL = PUBLIC_CONTACT_EMAIL;

export const BRAND = {
  name: "HustleAI Workspace OS",
  shortName: "HustleAI",
  domain: "hustlaiapp.in",
  url: "https://hustlaiapp.in",
  email: PUBLIC_CONTACT_EMAIL,
  support: SUPPORT_EMAIL,
  contact: CONTACT_EMAIL,
  billing: BILLING_EMAIL,
} as const;