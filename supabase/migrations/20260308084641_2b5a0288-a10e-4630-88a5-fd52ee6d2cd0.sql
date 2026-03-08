
-- Add is_verified and xp_points to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp_points integer NOT NULL DEFAULT 0;

-- User verifications (KYC)
CREATE TABLE public.user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  id_card_url text NOT NULL,
  photo_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own verification" ON public.user_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own verification" ON public.user_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage verifications" ON public.user_verifications FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id text NOT NULL,
  cf_order_id text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_session_id text,
  cf_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Saved hustles / progress tracker
CREATE TABLE public.saved_hustles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hustle_id uuid NOT NULL REFERENCES public.side_hustles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'saved',
  income_logged numeric DEFAULT 0,
  notes text,
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, hustle_id)
);
ALTER TABLE public.saved_hustles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved hustles" ON public.saved_hustles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Achievements
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read achievements for leaderboard" ON public.user_achievements FOR SELECT USING (true);

-- Storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload own KYC docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can read own KYC docs" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can read all KYC docs" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND has_role(auth.uid(), 'admin'));

-- Update forum_posts RLS: verified users auto-approved
DROP POLICY IF EXISTS "Authenticated can create posts" ON public.forum_posts;
CREATE POLICY "Authenticated can create posts" ON public.forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
