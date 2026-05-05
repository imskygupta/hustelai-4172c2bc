CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  min_tier subscription_tier,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read flags"
  ON public.feature_flags FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage flags"
  ON public.feature_flags FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.feature_flags (feature_key, label, description, enabled, min_tier, category) VALUES
  ('work.invoices',   'Invoices',         'Create, track & download invoices',          true, NULL, 'work'),
  ('work.time',       'Time Tracker',     'Start/stop timer, auto-bill hours',          true, NULL, 'work'),
  ('work.clients',    'Clients (CRM)',    'Manage every client in one place',           true, NULL, 'work'),
  ('work.checklists', 'Checklists',       'Project templates with progress',            true, NULL, 'work'),
  ('work.files',      'Files & Delivery', 'Track Figma/Drive links & versions',         true, NULL, 'work'),
  ('work.notes',      'Quick Notes',      'Sticky-note brain dump',                     true, NULL, 'work'),
  ('work.expenses',   'Expenses',         'Tools, ads & subscription costs',            true, NULL, 'work'),
  ('work.comm',       'Comm Log',         'Calls, WhatsApp, emails timeline',           true, NULL, 'work'),
  ('work.deadlines',  'Deadlines',        'Color-coded countdowns',                     true, NULL, 'work'),
  ('work.daily',      'Daily Tracker',    'Habits, streaks & momentum',                 true, NULL, 'work'),
  ('work.analytics',  'Analytics',        'Pipeline conversion & revenue',              true, 'pro',   'work'),
  ('work.portals',    'Client Portals',   'Public link clients can open',               true, 'pro',   'work')
ON CONFLICT (feature_key) DO NOTHING;