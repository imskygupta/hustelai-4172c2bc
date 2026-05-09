INSERT INTO public.api_runtime_config (key, value) VALUES
  ('payments_locked', 'false'::jsonb),
  ('subscription_checkout_locked', 'false'::jsonb),
  ('wallet_topup_locked', 'false'::jsonb),
  ('payment_maintenance_message', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;