
-- Registry of all Supabase projects used in the ecosystem
CREATE TABLE public.infra_supabase_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  purpose text NOT NULL,
  environment text NOT NULL DEFAULT 'production',
  project_ref text NOT NULL UNIQUE,
  project_url text,
  owner_category text NOT NULL CHECK (owner_category IN ('lovable-owned','hustle-owned','isolated-module','deprecated')),
  criticality text NOT NULL CHECK (criticality IN ('critical','operational','optional','experimental')),
  migration_state text NOT NULL DEFAULT 'native',
  failover_notes text,
  connected_domains text[] NOT NULL DEFAULT '{}',
  connected_modules text[] NOT NULL DEFAULT '{}',
  tables_count int,
  edge_functions_count int,
  last_db_activity_at timestamptz,
  last_function_call_at timestamptz,
  est_daily_writes bigint,
  est_storage_mb bigint,
  lovable_dependency_score smallint CHECK (lovable_dependency_score BETWEEN 0 AND 100),
  extraction_readiness smallint CHECK (extraction_readiness BETWEEN 0 AND 100),
  safe_to_isolate boolean DEFAULT false,
  risk_if_primary_dies text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.infra_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('edge_function','cron','worker','domain','module','frontend')),
  source_name text NOT NULL,
  target_project_ref text NOT NULL,
  target_kind text NOT NULL CHECK (target_kind IN ('db','function','storage','auth','realtime','external')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_name, target_project_ref, target_kind)
);

CREATE TABLE public.infra_runtime_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_ref text NOT NULL,
  reachable boolean,
  paused boolean,
  auth_healthy boolean,
  functions_responding boolean,
  last_cron_at timestamptz,
  last_write_at timestamptz,
  latency_ms int,
  recent_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  sampled_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_infra_runtime_health_project_time ON public.infra_runtime_health(project_ref, sampled_at DESC);

CREATE TABLE public.infra_telegram_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_label text NOT NULL UNIQUE,
  bot_username text,
  worker_owner text,
  webhook_target text,
  routing_role text NOT NULL CHECK (routing_role IN ('admin','relay','ops','storage','user','deprecated')),
  chat_ids text[] NOT NULL DEFAULT '{}',
  last_message_at timestamptz,
  delivery_success_pct_24h numeric(5,2),
  env_dependencies text[] NOT NULL DEFAULT '{}',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.infra_railway_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL UNIQUE,
  purpose text NOT NULL,
  domain text,
  health_url text,
  uptime_pct numeric(5,2),
  status text,
  active_workers int,
  restart_count int DEFAULT 0,
  env_dependencies text[] NOT NULL DEFAULT '{}',
  last_seen_at timestamptz,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prep table for future DB-backed Telegram admin routing.
-- IMPORTANT: not yet consumed by the worker. Env var remains source of truth.
CREATE TABLE public.ops_telegram_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot text NOT NULL DEFAULT 'hustleai',
  chat_id text NOT NULL,
  label text,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','ops','relay','test')),
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bot, chat_id)
);

-- RLS
ALTER TABLE public.infra_supabase_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infra_dependencies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infra_runtime_health    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infra_telegram_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infra_railway_services  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_telegram_recipients ENABLE ROW LEVEL SECURITY;

-- Admin-only full access
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'infra_supabase_projects',
    'infra_dependencies',
    'infra_runtime_health',
    'infra_telegram_registry',
    'infra_railway_services',
    'ops_telegram_recipients'
  ]
  LOOP
    EXECUTE format('CREATE POLICY "admin select %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t);
    EXECUTE format('CREATE POLICY "admin insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin''))', t);
    EXECUTE format('CREATE POLICY "admin update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t);
    EXECUTE format('CREATE POLICY "admin delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;
END $$;

-- updated_at trigger
CREATE TRIGGER trg_infra_supabase_projects_updated BEFORE UPDATE ON public.infra_supabase_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_infra_telegram_registry_updated BEFORE UPDATE ON public.infra_telegram_registry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_infra_railway_services_updated  BEFORE UPDATE ON public.infra_railway_services  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seeds
INSERT INTO public.infra_supabase_projects
  (name, purpose, environment, project_ref, project_url, owner_category, criticality, migration_state, connected_modules, lovable_dependency_score, extraction_readiness, safe_to_isolate, risk_if_primary_dies, notes)
VALUES
  ('Primary Lovable DB', 'Auth, profiles, billing, ai_jobs, workflow_runs, notifications, all core app data', 'production', 'vbnqaovxatucrgtnggea', 'https://vbnqaovxatucrgtnggea.supabase.co', 'lovable-owned', 'critical', 'native', ARRAY['auth','app','admin','ai-jobs','queues','editorial'], 100, 5, false, 'Full app outage. SPOF.', 'Default Supabase client. Hosts auth + RLS + all pg_cron jobs.'),
  ('Owned Ops DB', 'Tier-1 telemetry mirror destination (admin_alerts, migration_mirror_log)', 'production', 'wguuipsikboqqinqeehv', 'https://wguuipsikboqqinqeehv.supabase.co', 'hustle-owned', 'operational', 'mirroring', ARRAY['ops-telemetry','admin-alerts'], 20, 70, true, 'Loses mirror redundancy only; primary keeps working.', 'Dual-write target via _shared/ops-routing.ts.'),
  ('Community DB', 'Forums + Discord-style community backend (sicor)', 'production', 'qeswhaytgvosfzzgraef', 'https://qeswhaytgvosfzzgraef.supabase.co', 'isolated-module', 'operational', 'native', ARRAY['community','forums'], 10, 85, true, 'Community module down only.', 'See mem://features/community-backend.'),
  ('Work DB (DB2)', 'Freelancer Work Hub + Intake OS', 'production', 'TBD-work-db', NULL, 'isolated-module', 'operational', 'native', ARRAY['work-hub','intake-os'], 10, 85, true, 'Work tools + intake forms down only.', 'See mem://features/work-hub.'),
  ('Blogs Hustlai', 'Public blog content + editorial pipeline reads', 'production', 'TBD-blogs', 'https://blogs.hustlai.in', 'isolated-module', 'optional', 'native', ARRAY['blog'], 30, 60, true, 'Blog reads may degrade; cached content survives.', 'Verify project ref in src/integrations/blog/client.ts.'),
  ('Docs Hustlai', 'Documentation surface', 'production', 'TBD-docs', 'https://docs.hustlai.in', 'isolated-module', 'optional', 'native', ARRAY['docs'], 20, 80, true, 'Docs offline only.', 'Verify project ref in src/integrations/docs/client.ts.'),
  ('Analytics DB', 'Analytics event sink', 'production', 'TBD-analytics', NULL, 'isolated-module', 'operational', 'native', ARRAY['analytics'], 25, 70, true, 'Analytics ingestion paused; app functional.', 'src/integrations/analytics/client.ts.'),
  ('Async DB', 'Async activity workspace tracking', 'production', 'TBD-async', NULL, 'isolated-module', 'optional', 'native', ARRAY['async-activity'], 20, 80, true, 'Async activity tracking paused.', 'src/integrations/async/client.ts.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.infra_telegram_registry
  (bot_label, bot_username, worker_owner, webhook_target, routing_role, chat_ids, env_dependencies, notes)
VALUES
  ('HustleAI Bot', 'thehustleaibot', 'railway:telegram-worker', 'supabase:telegram-admin-webhook', 'user', ARRAY[]::text[], ARRAY['TELEGRAM_BOT_TOKEN'], 'User-facing notifications and link tokens.'),
  ('Skymedia Ops Bot', 'theskymediabot', 'railway:telegram-worker', NULL, 'admin', ARRAY['1378192648'], ARRAY['SKYMEDIA_BOT_TOKEN','TELEGRAM_ADMIN_CHAT_IDS'], 'Sole admin/ops alert recipient after storage channel removal.'),
  ('Storage Relay (deprecated)', NULL, 'railway:telegram-worker', NULL, 'deprecated', ARRAY[]::text[], ARRAY[]::text[], 'Removed from TELEGRAM_ADMIN_CHAT_IDS. Kept for historical reference.')
ON CONFLICT (bot_label) DO NOTHING;

INSERT INTO public.infra_railway_services
  (service_name, purpose, domain, health_url, env_dependencies, notes)
VALUES
  ('telegram-worker', 'Telegram fan-out worker (send-alert, ops loops)', NULL, '/health', ARRAY['TELEGRAM_BOT_TOKEN','SKYMEDIA_BOT_TOKEN','TELEGRAM_ADMIN_CHAT_IDS','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','WORKER_SHARED_SECRET'], 'Hosts /send-alert HTTP + optional ops poller (OPS_WORKER_ENABLED).')
ON CONFLICT (service_name) DO NOTHING;

-- Seed dependency edges (code-grep derived)
INSERT INTO public.infra_dependencies (source_type, source_name, target_project_ref, target_kind, notes) VALUES
  ('edge_function','admin-alert','vbnqaovxatucrgtnggea','db','Insert into admin_alerts'),
  ('edge_function','admin-alert','wguuipsikboqqinqeehv','db','Mirror via ops-routing'),
  ('edge_function','intelligence-anomaly-scan','vbnqaovxatucrgtnggea','db','Reads intelligence_alerts, calls admin-alert'),
  ('edge_function','blog-scheduler','vbnqaovxatucrgtnggea','db','Blog drafts pipeline'),
  ('edge_function','cleanup-expired-exports','vbnqaovxatucrgtnggea','db','Marks expired exports'),
  ('edge_function','migration-health','vbnqaovxatucrgtnggea','db','Reads migration_mirror_log via RPC'),
  ('edge_function','migration-health','wguuipsikboqqinqeehv','db','Pings owned project'),
  ('cron','ai-job-runner','vbnqaovxatucrgtnggea','function','pg_cron'),
  ('cron','analytics-rollup','vbnqaovxatucrgtnggea','function','pg_cron'),
  ('cron','blog-scheduler','vbnqaovxatucrgtnggea','function','pg_cron'),
  ('cron','intelligence-anomaly-scan','vbnqaovxatucrgtnggea','function','pg_cron'),
  ('cron','provider-health-check','vbnqaovxatucrgtnggea','function','pg_cron'),
  ('worker','telegram-worker','vbnqaovxatucrgtnggea','db','Inserts admin_alerts via service role'),
  ('domain','blogs.hustlai.in','TBD-blogs','db','Blog public reads'),
  ('domain','docs.hustlai.in','TBD-docs','db','Docs public reads'),
  ('module','community/sicor','qeswhaytgvosfzzgraef','db','Forums backend'),
  ('module','work-hub','TBD-work-db','db','Freelancer tools + intake')
ON CONFLICT DO NOTHING;
