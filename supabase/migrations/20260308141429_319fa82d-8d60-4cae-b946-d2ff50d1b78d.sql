CREATE TABLE public.trending_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text DEFAULT 'Trending',
  link text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.trending_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read active links" ON public.trending_links
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage trending links" ON public.trending_links
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));