
ALTER TABLE public.notification_events
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS link text;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS preset text NOT NULL DEFAULT 'default'
    CHECK (preset IN ('default','silent','critical','growth','ops'));

DROP POLICY IF EXISTS "Users update own events" ON public.notification_events;
CREATE POLICY "Users update own events" ON public.notification_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.notification_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'announcement',
  link text,
  target_tier text NOT NULL DEFAULT 'all'
    CHECK (target_tier IN ('all','free','pro','elite','infinity')),
  channels text[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_notif_broadcasts_active ON public.notification_broadcasts(is_active, created_at DESC);
ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads active broadcasts" ON public.notification_broadcasts;
CREATE POLICY "Anyone reads active broadcasts" ON public.notification_broadcasts
  FOR SELECT TO authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage broadcasts" ON public.notification_broadcasts;
CREATE POLICY "Admins manage broadcasts" ON public.notification_broadcasts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_events;
