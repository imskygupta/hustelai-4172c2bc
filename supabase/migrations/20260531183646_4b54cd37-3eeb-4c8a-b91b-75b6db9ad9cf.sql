-- Newsletter opt-in (explicit consent: default false)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS newsletter_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS newsletter_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Idempotent welcome email tracker RPC. Returns whether welcome was already sent for this email.
CREATE OR REPLACE FUNCTION public.welcome_email_already_sent(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.email_logs
    WHERE template = 'welcome'
      AND recipient = lower(_email)
      AND status = 'sent'
    LIMIT 1
  );
$$;

GRANT EXECUTE ON FUNCTION public.welcome_email_already_sent(text) TO authenticated, service_role;

-- Index to speed up the existence check
CREATE INDEX IF NOT EXISTS idx_email_logs_template_recipient
  ON public.email_logs (template, recipient, status);