-- Rollback for the OAuth pre-account takeover hardening (Layer 1).
DROP TRIGGER IF EXISTS on_auth_identity_change ON auth.identities;
DROP FUNCTION IF EXISTS public.handle_user_identity_change();
DROP FUNCTION IF EXISTS public.claim_account_ownership(UUID, TEXT);
DROP FUNCTION IF EXISTS public.revoke_user_sessions(UUID);
DROP FUNCTION IF EXISTS public.get_security_account_conflicts();
DROP VIEW IF EXISTS public.security_account_conflicts;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS auth_provider,
  DROP COLUMN IF EXISTS auth_provider_user_id,
  DROP COLUMN IF EXISTS email_verified,
  DROP COLUMN IF EXISTS oauth_linked_at,
  DROP COLUMN IF EXISTS account_origin,
  DROP COLUMN IF EXISTS restricted_pending_ownership_review;