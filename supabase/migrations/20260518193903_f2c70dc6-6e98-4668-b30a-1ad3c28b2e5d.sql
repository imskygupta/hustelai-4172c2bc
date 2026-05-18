
-- Phase 1: DB-backed operational config
CREATE TABLE public.infra_runtime_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  scope text NOT NULL DEFAULT 'global',
  env text NOT NULL DEFAULT 'production',
  description text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.infra_runtime_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins all on infra_runtime_config" ON public.infra_runtime_config
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.infra_feature_flags (
  flag_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  rollout_pct smallint NOT NULL DEFAULT 100,
  environments text[] NOT NULL DEFAULT ARRAY['production'],
  maintenance boolean NOT NULL DEFAULT false,
  message text,
  description text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.infra_feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins all on infra_feature_flags" ON public.infra_feature_flags
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.infra_service_secrets_meta (
  secret_name text PRIMARY KEY,
  owner_service text NOT NULL,
  location text NOT NULL DEFAULT 'env',
  last_rotated_at timestamptz,
  expected_format text,
  required_by text[] NOT NULL DEFAULT '{}',
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.infra_service_secrets_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins all on infra_service_secrets_meta" ON public.infra_service_secrets_meta
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Extend ops_telegram_recipients
ALTER TABLE public.ops_telegram_recipients
  ADD COLUMN IF NOT EXISTS muted_until timestamptz,
  ADD COLUMN IF NOT EXISTS severity_min text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS routing_role text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS deprecated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Phase 2: Railway self-awareness
CREATE TABLE public.worker_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  deployed_at timestamptz NOT NULL DEFAULT now(),
  commit_sha text,
  version text,
  source text DEFAULT 'boot-ping',
  uptime_reset boolean DEFAULT true,
  env_fingerprint jsonb,
  reported_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read worker_deployments" ON public.worker_deployments
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_worker_deploys_service_time ON public.worker_deployments(service, deployed_at DESC);

-- Phase 4: Extraction sequencing
CREATE TABLE public.infra_extraction_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_ref text NOT NULL,
  dependency_count int DEFAULT 0,
  lovable_dependency_score int,
  extraction_readiness int,
  est_daily_writes bigint,
  est_storage_mb int,
  criticality text,
  sampled_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.infra_extraction_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read extraction_snapshots" ON public.infra_extraction_snapshots
  FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_extraction_snap_ref_time ON public.infra_extraction_snapshots(project_ref, sampled_at DESC);

CREATE TABLE public.infra_extraction_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_ref text NOT NULL,
  milestone text NOT NULL,
  target_date date,
  completed_at timestamptz,
  evidence text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_ref, milestone)
);
ALTER TABLE public.infra_extraction_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins all extraction_milestones" ON public.infra_extraction_milestones
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Phase 5: Discovery findings
CREATE TABLE public.infra_discovery_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  identifier text NOT NULL,
  confidence smallint NOT NULL DEFAULT 50,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  registered boolean NOT NULL DEFAULT false,
  source_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  notes text,
  UNIQUE(kind, identifier)
);
ALTER TABLE public.infra_discovery_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins all discovery_findings" ON public.infra_discovery_findings
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- updated_at triggers
CREATE TRIGGER trg_irc_uat BEFORE UPDATE ON public.infra_runtime_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_iff_uat BEFORE UPDATE ON public.infra_feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_issm_uat BEFORE UPDATE ON public.infra_service_secrets_meta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_iem_uat BEFORE UPDATE ON public.infra_extraction_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_otr_uat BEFORE UPDATE ON public.ops_telegram_recipients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
