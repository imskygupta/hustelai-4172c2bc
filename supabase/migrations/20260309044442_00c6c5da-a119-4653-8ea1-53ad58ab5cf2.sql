
-- Table to store AI provider API keys (admin-managed)
CREATE TABLE public.ai_provider_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  display_name text NOT NULL,
  api_key text NOT NULL,
  api_endpoint text NOT NULL,
  default_model text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage
CREATE POLICY "Admins can manage ai provider keys"
  ON public.ai_provider_keys FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default providers
INSERT INTO public.ai_provider_keys (provider_name, display_name, api_key, api_endpoint, default_model, is_active, priority, notes) VALUES
  ('lovable_ai', 'Lovable AI Gateway (Gemini)', 'default', 'https://ai.gateway.lovable.dev/v1/chat/completions', 'google/gemini-2.5-flash', true, 1, 'Default provider - uses LOVABLE_API_KEY secret'),
  ('longcat', 'LongCat API', 'ak_2Sf9pp2Z15TI9mB6Wa5Zx13k2Hv8V', 'https://api.longcat.chat/openai/v1/chat/completions', 'LongCat-Flash-Lite', true, 2, 'Backup provider - 50M tokens/day free');
