
CREATE TABLE IF NOT EXISTS public.api_runtime_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT 'false'::jsonb,
  environment TEXT NOT NULL DEFAULT 'production',
  notes TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_runtime_config_key ON public.api_runtime_config(key);

ALTER TABLE public.api_runtime_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Runtime config is publicly readable"
ON public.api_runtime_config FOR SELECT
USING (true);

CREATE POLICY "Admins can insert runtime config"
ON public.api_runtime_config FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update runtime config"
ON public.api_runtime_config FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete runtime config"
ON public.api_runtime_config FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_api_runtime_config_updated_at
BEFORE UPDATE ON public.api_runtime_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.api_runtime_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID,
  config_key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  action TEXT NOT NULL DEFAULT 'update',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_runtime_audit_created ON public.api_runtime_audit_logs(created_at DESC);

ALTER TABLE public.api_runtime_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read runtime audit logs"
ON public.api_runtime_audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert runtime audit logs"
ON public.api_runtime_audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.api_runtime_config (key, value, notes) VALUES
  ('maintenance_mode',     'false'::jsonb, 'Show branded maintenance page on root domain'),
  ('safe_mode',            'false'::jsonb, 'Disables AI, exports, experimental, subdomain routing'),
  ('readonly_mode',        'false'::jsonb, 'Blocks writes, key generation, exports'),
  ('disable_ai',           'false'::jsonb, 'Kills AI tools + AI exports'),
  ('disable_api',          'false'::jsonb, 'Kills API platform + console'),
  ('disable_console',      'false'::jsonb, 'Kills /console developer dashboard'),
  ('disable_exports',      'false'::jsonb, 'Kills PDF / DOCX export pipeline'),
  ('disable_routing',      'false'::jsonb, 'Kills all subdomain rewrites'),
  ('disable_docs',         'false'::jsonb, 'Kills docs subdomain'),
  ('disable_experimental', 'false'::jsonb, 'Hides experimental + beta tools')
ON CONFLICT (key) DO NOTHING;
