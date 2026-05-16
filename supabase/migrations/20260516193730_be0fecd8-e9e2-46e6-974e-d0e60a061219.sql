-- Phase 1G — production safety pass: close 4 ERROR-level RLS findings.
-- All write paths fixed here are intentionally service-role-only flows
-- (Cashfree/Dodo/Skymedia webhooks, referral conversion worker, invoice
-- generator edge function). Service role bypasses RLS, so dropping the
-- permissive client-side policies is safe and removes privilege-escalation
-- vectors from authenticated users.

-- 1) Webinars: stop anonymous reads of meeting credentials.
DROP POLICY IF EXISTS "Authenticated can read webinars" ON public.webinars;
CREATE POLICY "Authenticated can read webinars"
  ON public.webinars
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) Referrals: only the conversion worker (service role) may update.
DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;

-- 3) Invoices: only the invoice generator (service role) may insert.
DROP POLICY IF EXISTS "System inserts invoices" ON public.invoices;

-- 4) Payment status logs: only payment webhooks (service role) may insert.
DROP POLICY IF EXISTS "System can insert payment logs" ON public.payment_status_logs;