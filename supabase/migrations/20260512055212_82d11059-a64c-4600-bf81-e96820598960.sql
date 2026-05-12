-- Activation telemetry: lightweight per-user event log used by the Next-Action engine
CREATE TABLE IF NOT EXISTS public.activation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_key text NOT NULL,
  surface text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activation_events_user_time
  ON public.activation_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activation_events_key
  ON public.activation_events (event_key);

ALTER TABLE public.activation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own activation events"
ON public.activation_events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own activation events"
ON public.activation_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admins read all activation events"
ON public.activation_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));