
-- =========================================================
-- Workspace OS — Phase 1 schema
-- =========================================================

-- ---------- workspaces ----------
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  client_name text NOT NULL,
  project_scope text,
  deadlines jsonb NOT NULL DEFAULT '[]'::jsonb,
  deliverables jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  ai_summary text,
  source_inputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workspaces"
  ON public.workspaces FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins manage all workspaces"
  ON public.workspaces FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- user_ai_keys (BYO AI) ----------
CREATE TABLE public.user_ai_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'gemini',
  api_key text NOT NULL,
  model text,
  is_active boolean NOT NULL DEFAULT true,
  last_tested_at timestamptz,
  last_test_ok boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ai_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ai key"
  ON public.user_ai_keys FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read ai keys"
  ON public.user_ai_keys FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_ai_keys_updated_at
  BEFORE UPDATE ON public.user_ai_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- ai_usage_log ----------
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_used text NOT NULL,           -- 'hustlai' | 'user'
  feature text NOT NULL,                  -- e.g. 'workspace.extract'
  tokens_in integer DEFAULT 0,
  tokens_out integer DEFAULT 0,
  ok boolean NOT NULL DEFAULT true,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_user_created ON public.ai_usage_log(user_id, created_at DESC);
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage"
  ON public.ai_usage_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "System inserts usage"
  ON public.ai_usage_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage usage"
  ON public.ai_usage_log FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
