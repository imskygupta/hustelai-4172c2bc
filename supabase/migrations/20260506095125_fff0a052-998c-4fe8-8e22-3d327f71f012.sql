
-- Email logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  recipient text NOT NULL,
  template text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'pending',
  provider_id text,
  error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  campaign_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs(template);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON public.email_logs(created_at DESC);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all email logs" ON public.email_logs
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their own email logs" ON public.email_logs
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY,
  email_enabled boolean NOT NULL DEFAULT true,
  invoice_reminders boolean NOT NULL DEFAULT true,
  workspace_updates boolean NOT NULL DEFAULT true,
  community_notifications boolean NOT NULL DEFAULT true,
  payment_alerts boolean NOT NULL DEFAULT true,
  collaboration_alerts boolean NOT NULL DEFAULT true,
  product_announcements boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prefs" ON public.notification_preferences
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_notif_prefs_updated
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Email campaigns (admin announcements)
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  audience_filter jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns" ON public.email_campaigns
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
