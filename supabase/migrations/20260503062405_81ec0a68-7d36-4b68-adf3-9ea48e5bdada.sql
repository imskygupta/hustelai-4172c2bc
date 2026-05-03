
CREATE TABLE public.job_opportunity_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  primary_skill TEXT NOT NULL,
  experience_years TEXT NOT NULL,
  expected_hourly_rate TEXT,
  portfolio_url TEXT,
  linkedin_url TEXT,
  preferred_platforms TEXT[] DEFAULT '{}',
  availability TEXT,
  about TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_opportunity_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own submissions"
ON public.job_opportunity_submissions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own submissions"
ON public.job_opportunity_submissions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update submissions"
ON public.job_opportunity_submissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_jobopp_updated_at
BEFORE UPDATE ON public.job_opportunity_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_jobopp_user ON public.job_opportunity_submissions(user_id);
CREATE INDEX idx_jobopp_status ON public.job_opportunity_submissions(status);
