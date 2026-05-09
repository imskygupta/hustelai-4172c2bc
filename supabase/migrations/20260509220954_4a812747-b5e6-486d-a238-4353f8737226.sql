
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS channel_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.notification_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('telegram','discord','slack','webhook','whatsapp','email')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','connected','revoked','error')),
  provider_user_id text,
  provider_chat_id text,
  provider_username text,
  connect_token text UNIQUE,
  connect_token_expires_at timestamptz,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_active_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_notif_integrations_user ON public.notification_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_integrations_token ON public.notification_integrations(connect_token) WHERE connect_token IS NOT NULL;
ALTER TABLE public.notification_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own integrations" ON public.notification_integrations;
CREATE POLICY "Users manage own integrations" ON public.notification_integrations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins read all integrations" ON public.notification_integrations;
CREATE POLICY "Admins read all integrations" ON public.notification_integrations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_notif_integrations_updated ON public.notification_integrations;
CREATE TRIGGER trg_notif_integrations_updated BEFORE UPDATE ON public.notification_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_key text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  title text,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_events_user ON public.notification_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_events_key ON public.notification_events(event_key, created_at DESC);
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own events" ON public.notification_events;
CREATE POLICY "Users read own events" ON public.notification_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins read all events" ON public.notification_events;
CREATE POLICY "Admins read all events" ON public.notification_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.notification_events(id) ON DELETE CASCADE,
  user_id uuid,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','skipped')),
  attempt_count int NOT NULL DEFAULT 0,
  last_error text,
  external_message_id text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_deliveries_user ON public.notification_deliveries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_deliveries_event ON public.notification_deliveries(event_id);
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own deliveries" ON public.notification_deliveries;
CREATE POLICY "Users read own deliveries" ON public.notification_deliveries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins read all deliveries" ON public.notification_deliveries;
CREATE POLICY "Admins read all deliveries" ON public.notification_deliveries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_notif_deliveries_updated ON public.notification_deliveries;
CREATE TRIGGER trg_notif_deliveries_updated BEFORE UPDATE ON public.notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
