
-- Public/private flag for share tokens
ALTER TABLE public.export_download_tokens
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_via text NOT NULL DEFAULT 'private';

CREATE INDEX IF NOT EXISTS idx_export_download_tokens_public
  ON public.export_download_tokens(is_public) WHERE is_public = true;

-- Admin alerts feed
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  source text,
  user_id uuid,
  feature text,
  message text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  telegram_sent boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_created ON public.admin_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_unacked ON public.admin_alerts (created_at DESC) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_alerts_kind ON public.admin_alerts (kind);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read admin_alerts"
  ON public.admin_alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update admin_alerts"
  ON public.admin_alerts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
