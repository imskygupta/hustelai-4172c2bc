
-- Email settings table for admin-configurable SMTP accounts
CREATE TABLE public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  label text NOT NULL,
  smtp_email text DEFAULT '',
  smtp_password text DEFAULT '',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email settings" ON public.email_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default categories
INSERT INTO public.email_settings (category, label, smtp_email, smtp_password, is_active) VALUES
  ('newsletters', 'Newsletters', 'contact@hustelai.eu.cc', '', true),
  ('support', 'Support', 'support@hustelai.eu.cc', '', false),
  ('payments', 'Payments', '', '', false),
  ('tax', 'Tax & Invoices', '', '', false),
  ('products', 'Products & Updates', '', '', false),
  ('hello', 'Hello / Welcome', 'contact@hustelai.eu.cc', '', true);
