
-- Email templates (admin-editable)
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'transactional', -- transactional | marketing | lifecycle
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  preview_text TEXT,
  preferred_provider TEXT DEFAULT 'brevo', -- brevo | mailersend | auto
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email templates"
  ON public.email_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can read active templates"
  ON public.email_templates FOR SELECT
  USING (is_active = true);

CREATE TRIGGER trg_email_templates_updated
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Checkout sessions for abandoned-cart recovery
CREATE TABLE public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_label TEXT,
  tier TEXT,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'INR',
  billing_interval TEXT DEFAULT 'monthly',
  dodo_session_id TEXT,
  resume_url TEXT,
  status TEXT NOT NULL DEFAULT 'opened', -- opened | completed | abandoned | recovered
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  recovery_email_sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkout_sessions_recovery
  ON public.checkout_sessions (status, opened_at)
  WHERE status = 'opened' AND recovery_email_sent_at IS NULL;

CREATE INDEX idx_checkout_sessions_user ON public.checkout_sessions (user_id, created_at DESC);

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own checkout sessions"
  ON public.checkout_sessions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage checkout sessions"
  ON public.checkout_sessions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_checkout_sessions_updated
  BEFORE UPDATE ON public.checkout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mailing provider config (single row)
CREATE TABLE public.mailing_provider_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_provider TEXT NOT NULL DEFAULT 'brevo', -- brevo | mailersend
  fallback_provider TEXT DEFAULT 'mailersend',
  brevo_enabled BOOLEAN NOT NULL DEFAULT true,
  mailersend_enabled BOOLEAN NOT NULL DEFAULT true,
  from_email TEXT NOT NULL DEFAULT 'noreply@hustlaiapp.in',
  from_name TEXT NOT NULL DEFAULT 'HustleAI',
  reply_to TEXT DEFAULT 'support@hustlaiapp.in',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.mailing_provider_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.mailing_provider_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage mailing config"
  ON public.mailing_provider_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated reads mailing config"
  ON public.mailing_provider_config FOR SELECT
  USING (auth.role() = 'authenticated');
