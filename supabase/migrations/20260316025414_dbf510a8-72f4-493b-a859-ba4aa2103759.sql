
-- Problem leads CRM table
CREATE TABLE public.problem_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'reddit',
  source_url text,
  title text NOT NULL,
  author text,
  platform_data jsonb DEFAULT '{}'::jsonb,
  pain_point text,
  opportunity text,
  service_category text,
  intent_score integer DEFAULT 5,
  intent_level text DEFAULT 'Medium',
  suggested_pitch text,
  personalized_outreach text,
  status text NOT NULL DEFAULT 'new',
  outreach_notes text,
  contacted_at timestamp with time zone,
  converted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.problem_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own leads"
  ON public.problem_leads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all leads"
  ON public.problem_leads FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trend snapshots table
CREATE TABLE public.lead_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trend_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  analysis text,
  scanned_sources text[] DEFAULT '{}'::text[],
  total_posts_analyzed integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trends"
  ON public.lead_trends FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
