
-- Provider health table
CREATE TABLE IF NOT EXISTS public.api_provider_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'unknown', -- healthy | degraded | unhealthy | disabled | unknown
  latency_ms integer,
  success_rate numeric(5,2) DEFAULT 100.00,
  last_check_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  consecutive_successes integer NOT NULL DEFAULT 0,
  total_checks bigint NOT NULL DEFAULT 0,
  total_failures bigint NOT NULL DEFAULT 0,
  disabled_until timestamptz,
  manually_disabled boolean NOT NULL DEFAULT false,
  tokens_used_24h bigint NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  cost_rank integer NOT NULL DEFAULT 99,   -- lower = cheaper
  speed_rank integer NOT NULL DEFAULT 99,  -- lower = faster
  reliability_rank integer NOT NULL DEFAULT 99, -- lower = more reliable
  last_error text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_provider_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage provider health"
ON public.api_provider_health
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_api_provider_health_updated
BEFORE UPDATE ON public.api_provider_health
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fallback log table
CREATE TABLE IF NOT EXISTS public.api_provider_fallback_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_provider text NOT NULL,
  replacement_provider text,
  reason text NOT NULL, -- unhealthy | rate_limited | disabled | error | timeout
  feature text,
  latency_ms integer,
  error_message text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_provider_fallback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read fallback logs"
ON public.api_provider_fallback_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_fallback_logs_created ON public.api_provider_fallback_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fallback_logs_provider ON public.api_provider_fallback_logs (original_provider, created_at DESC);

-- Seed providers
INSERT INTO public.api_provider_health (provider, status, cost_rank, speed_rank, reliability_rank, notes) VALUES
  ('lovable', 'unknown', 1, 2, 1, 'Lovable AI Gateway'),
  ('gemini',  'unknown', 2, 1, 2, 'Google Gemini direct'),
  ('longcat', 'unknown', 3, 3, 3, 'LongCat fallback'),
  ('openai',  'unknown', 5, 4, 2, 'OpenAI GPT-5'),
  ('zhipu',   'unknown', 4, 5, 4, 'Zhipu GLM')
ON CONFLICT (provider) DO NOTHING;
