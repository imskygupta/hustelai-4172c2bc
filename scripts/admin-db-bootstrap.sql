-- =============================================================================
-- Admin/Ops DB bootstrap (rqqiujmiagauzohdqjmi)
-- Paste-once script. Run in the Admin DB SQL editor.
-- Idempotent: safe to re-run.
-- =============================================================================

-- Provider health (live snapshot, ~5 rows)
CREATE TABLE IF NOT EXISTS public.api_provider_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'unknown',
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
  cost_rank integer NOT NULL DEFAULT 99,
  speed_rank integer NOT NULL DEFAULT 99,
  reliability_rank integer NOT NULL DEFAULT 99,
  last_error text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aph_status ON public.api_provider_health(status);

CREATE TABLE IF NOT EXISTS public.provider_health_history (
  id bigserial PRIMARY KEY,
  provider text NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  success_rate numeric(5,2),
  ok boolean NOT NULL,
  error text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_phh_provider_time ON public.provider_health_history(provider, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.runtime_extraction_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream text NOT NULL UNIQUE,
  category text NOT NULL,
  posture text NOT NULL DEFAULT 'primary',
  owner_db text,
  confidence numeric NOT NULL DEFAULT 0,
  rail_guarded boolean NOT NULL DEFAULT false,
  critical boolean NOT NULL DEFAULT false,
  est_writes_per_hour bigint NOT NULL DEFAULT 0,
  est_bytes_per_write integer NOT NULL DEFAULT 256,
  notes text,
  authority_state text NOT NULL DEFAULT 'primary',
  fallback_enabled boolean NOT NULL DEFAULT true,
  parity_status text NOT NULL DEFAULT 'unknown',
  replay_pressure numeric NOT NULL DEFAULT 0,
  rollback_risk text NOT NULL DEFAULT 'low',
  primary_write_disabled_at timestamptz,
  fallback_activated_at timestamptz,
  fallback_expires_at timestamptz,
  fallback_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.runtime_authority (
  stream text PRIMARY KEY,
  authority_db text NOT NULL,
  read_db text NOT NULL,
  fallback_db text,
  last_changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by text,
  reason text
);

CREATE TABLE IF NOT EXISTS public.infra_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  role text NOT NULL,
  project_ref text,
  url text,
  status text NOT NULL DEFAULT 'active',
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.runtime_metrics (
  id bigserial PRIMARY KEY,
  metric text NOT NULL,
  value numeric NOT NULL,
  labels jsonb NOT NULL DEFAULT '{}',
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_runtime_metrics_kt ON public.runtime_metrics(metric, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  source text,
  user_id uuid,
  feature text,
  message text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}',
  telegram_sent boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created ON public.admin_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_unacked ON public.admin_alerts(created_at DESC) WHERE acknowledged_at IS NULL;

CREATE TABLE IF NOT EXISTS public.ops_events (
  id bigserial PRIMARY KEY,
  kind text NOT NULL,
  actor text,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ops_events_kt ON public.ops_events(kind, created_at DESC);

CREATE TABLE IF NOT EXISTS public.runtime_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  status text NOT NULL DEFAULT 'open',
  component text,
  summary text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.telemetry_snapshots (
  id bigserial PRIMARY KEY,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telemetry_snapshots_kt ON public.telemetry_snapshots(kind, captured_at DESC);

CREATE TABLE IF NOT EXISTS public.runtime_topology_cache (
  id text PRIMARY KEY,
  topology jsonb NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.authority_projection_cache (
  id text PRIMARY KEY,
  projection jsonb NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

-- Phase 7B: docs + handbook (folded into Admin DB; Docs DB retired)
CREATE TABLE IF NOT EXISTS public.docs_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  icon text,
  color text,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.docs_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.docs_categories(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  content text NOT NULL DEFAULT '',
  toc jsonb NOT NULL DEFAULT '[]',
  meta_title text,
  meta_description text,
  og_image text,
  tags text[] NOT NULL DEFAULT '{}',
  reading_time integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  version text NOT NULL DEFAULT '1.0',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.operator_handbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body_md text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.internal_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]',
  owner text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ai_system_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body_md text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.migration_notes (
  id bigserial PRIMARY KEY,
  phase text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed infra_registry with final topology
INSERT INTO public.infra_registry (key, role, project_ref, url, description, tags) VALUES
  ('primary',    'auth-billing',    'vbnqaovxatucrgtnggea', 'https://vbnqaovxatucrgtnggea.supabase.co', 'Auth, payments, profiles only',               ARRAY['core','primary']),
  ('admin',      'admin-ops',       'rqqiujmiagauzohdqjmi', 'https://rqqiujmiagauzohdqjmi.supabase.co', 'Admin/Ops control plane + docs',              ARRAY['admin','ops']),
  ('api',        'ai-async-queues', 'larncwugkdclkhayfjle', 'https://larncwugkdclkhayfjle.supabase.co', 'AI jobs, async queues, analytics, telemetry', ARRAY['ai','async','analytics']),
  ('blogs',      'cms-content',     'ynvfxxmhowlvhtqiigfc', 'https://ynvfxxmhowlvhtqiigfc.supabase.co', 'Blog, SEO, newsletter, side_hustles catalog', ARRAY['blogs','cms']),
  ('workspace',  'client-ops',      'utflzmecghdtcjupgdan', 'https://utflzmecghdtcjupgdan.supabase.co', 'Work Hub, client portal, intake',             ARRAY['workspace','crm']),
  ('community',  'forums-chat',     'qeswhaytgvosfzzgraef', 'https://qeswhaytgvosfzzgraef.supabase.co', 'Forums, chat, votes',                         ARRAY['community']),
  ('owned-ops',  'telemetry-mirror','wguuipsikboqqinqeehv', 'https://wguuipsikboqqinqeehv.supabase.co', 'Operational telemetry mirror',                ARRAY['owned','mirror'])
ON CONFLICT (key) DO UPDATE SET
  role = EXCLUDED.role,
  project_ref = EXCLUDED.project_ref,
  url = EXCLUDED.url,
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  updated_at = now();

-- Done.