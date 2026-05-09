
-- Extend newsletter subscribers with name, tags, unsubscribe support
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS unsubscribe_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'website';

-- Backfill tokens for existing
UPDATE public.newsletter_subscribers
SET unsubscribe_token = encode(gen_random_bytes(16), 'hex')
WHERE unsubscribe_token IS NULL;

-- Extend campaigns for Brevo + scheduling + AI
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'brevo',
  ADD COLUMN IF NOT EXISTS brevo_message_id text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preview_text text,
  ADD COLUMN IF NOT EXISTS from_name text DEFAULT 'HustleAI',
  ADD COLUMN IF NOT EXISTS from_email text,
  ADD COLUMN IF NOT EXISTS error_message text;

-- Allow public unsubscribe via token
DROP POLICY IF EXISTS "Public can unsubscribe via token" ON public.newsletter_subscribers;
CREATE POLICY "Public can unsubscribe via token"
ON public.newsletter_subscribers FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Newsletter weekly digest schedule (single config row)
CREATE TABLE IF NOT EXISTS public.newsletter_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  frequency text NOT NULL DEFAULT 'weekly', -- weekly | daily | monthly
  send_day int DEFAULT 1, -- day of week (0=Sun) for weekly
  send_hour int NOT NULL DEFAULT 9, -- UTC hour
  ai_prompt text NOT NULL DEFAULT 'Generate a friendly weekly digest from HustleAI covering: 1) one new AI tool or feature launched this week, 2) a trending side hustle insight for Indian creators, 3) a quick tip to earn online. Tone: motivating, concise, modern.',
  from_name text DEFAULT 'HustleAI',
  from_email text DEFAULT 'noreply@hustlaiapp.in',
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage schedules" ON public.newsletter_schedules;
CREATE POLICY "Admins manage schedules" ON public.newsletter_schedules
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default row
INSERT INTO public.newsletter_schedules (enabled) VALUES (false)
ON CONFLICT DO NOTHING;
