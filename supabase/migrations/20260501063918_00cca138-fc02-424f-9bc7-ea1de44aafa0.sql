
-- Ensure helper trigger function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Payment methods (admin-managed UPI IDs + QR codes)
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_type TEXT NOT NULL DEFAULT 'upi' CHECK (method_type IN ('upi', 'qr')),
  label TEXT NOT NULL,
  upi_id TEXT,
  qr_image_url TEXT,
  display_name TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payment methods" ON public.payment_methods
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated read active payment methods" ON public.payment_methods
  FOR SELECT TO authenticated USING (is_active = true);
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Manual payment submissions
CREATE TABLE public.manual_payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'plan' CHECK (payment_type IN ('plan', 'wallet')),
  plan TEXT,
  wallet_pack TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  upi_id_used TEXT,
  utr_number TEXT NOT NULL,
  screenshot_url TEXT,
  user_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_payment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create own submissions" ON public.manual_payment_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own submissions" ON public.manual_payment_submissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all submissions" ON public.manual_payment_submissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_manual_submissions_updated_at
  BEFORE UPDATE ON public.manual_payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  item_type TEXT NOT NULL DEFAULT 'plan',
  item_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',
  sent_to_user BOOLEAN NOT NULL DEFAULT false,
  sent_to_admin BOOLEAN NOT NULL DEFAULT false,
  send_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own invoices" ON public.invoices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts invoices" ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-qr', 'payment-qr', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read payment proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-proofs');
CREATE POLICY "Users upload own payment proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins manage all payment proofs" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read payment QR" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-qr');
CREATE POLICY "Admins manage payment QR" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'payment-qr' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'payment-qr' AND public.has_role(auth.uid(), 'admin'));
