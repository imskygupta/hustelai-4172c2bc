-- Topology nodes
CREATE TABLE IF NOT EXISTS public.topology_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_key text NOT NULL UNIQUE,
  node_type text NOT NULL,
  display_name text NOT NULL,
  owner text NOT NULL DEFAULT 'lovable-owned',
  criticality text NOT NULL DEFAULT 'operational',
  runtime text,
  db_dependency text,
  failure_impact text,
  extraction_state text NOT NULL DEFAULT 'on-primary',
  current_authority text,
  last_heartbeat_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.topology_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topology_nodes admin all" ON public.topology_nodes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_topology_nodes_type ON public.topology_nodes(node_type);

-- Topology edges
CREATE TABLE IF NOT EXISTS public.topology_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL,
  target_key text NOT NULL,
  relation text NOT NULL,
  criticality text NOT NULL DEFAULT 'operational',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_key, target_key, relation)
);
ALTER TABLE public.topology_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topology_edges admin all" ON public.topology_edges FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_topology_edges_src ON public.topology_edges(source_key);
CREATE INDEX IF NOT EXISTS idx_topology_edges_tgt ON public.topology_edges(target_key);

-- Blast radius cache
CREATE TABLE IF NOT EXISTS public.topology_blast_radius (
  node_key text PRIMARY KEY,
  direct_dependents int NOT NULL DEFAULT 0,
  transitive_dependents int NOT NULL DEFAULT 0,
  auth_impact boolean NOT NULL DEFAULT false,
  export_impact boolean NOT NULL DEFAULT false,
  ai_impact boolean NOT NULL DEFAULT false,
  billing_impact boolean NOT NULL DEFAULT false,
  notification_impact boolean NOT NULL DEFAULT false,
  user_facing_severity text NOT NULL DEFAULT 'low',
  affected_keys text[] NOT NULL DEFAULT '{}'::text[],
  computed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.topology_blast_radius ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blast_radius admin all" ON public.topology_blast_radius FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Outage simulations
CREATE TABLE IF NOT EXISTS public.topology_outage_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario text NOT NULL,
  target_node_key text,
  predicted_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  rollback_correct boolean,
  replay_recovered boolean,
  queue_pressure_pct numeric,
  duplicate_exec_prevented boolean,
  latency_impact_ms int,
  notes text,
  dry_run boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
ALTER TABLE public.topology_outage_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outage_sims admin all" ON public.topology_outage_simulations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Coupling findings
CREATE TABLE IF NOT EXISTS public.topology_coupling_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  source_kind text,
  source_name text,
  evidence text,
  recommendation text,
  status text NOT NULL DEFAULT 'open',
  detected_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.topology_coupling_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupling_findings admin all" ON public.topology_coupling_findings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Extraction safety forecasts
CREATE TABLE IF NOT EXISTS public.topology_extraction_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind text NOT NULL,
  target_name text NOT NULL,
  rollback_difficulty int NOT NULL DEFAULT 0,
  replay_risk int NOT NULL DEFAULT 0,
  realtime_impact int NOT NULL DEFAULT 0,
  auth_coupling int NOT NULL DEFAULT 0,
  queue_instability int NOT NULL DEFAULT 0,
  estimated_savings_pct numeric NOT NULL DEFAULT 0,
  blast_radius int NOT NULL DEFAULT 0,
  recommendation text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_kind, target_name)
);
ALTER TABLE public.topology_extraction_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "extraction_forecasts admin all" ON public.topology_extraction_forecasts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Stability score history
CREATE TABLE IF NOT EXISTS public.topology_stability_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operational_independence_pct numeric NOT NULL DEFAULT 0,
  single_point_dependency_pct numeric NOT NULL DEFAULT 0,
  recovery_readiness_pct numeric NOT NULL DEFAULT 0,
  replay_resilience_pct numeric NOT NULL DEFAULT 0,
  extraction_safety_pct numeric NOT NULL DEFAULT 0,
  infra_fragmentation_pct numeric NOT NULL DEFAULT 0,
  runtime_confidence_pct numeric NOT NULL DEFAULT 0,
  overall_score numeric NOT NULL DEFAULT 0,
  notes text,
  captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.topology_stability_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stability_scores admin all" ON public.topology_stability_scores FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- RPC: compute blast radius
CREATE OR REPLACE FUNCTION public.topology_compute_blast_radius()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n_rec record;
  v_count int := 0;
  v_direct int;
  v_affected text[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  DELETE FROM public.topology_blast_radius;
  FOR n_rec IN SELECT node_key, node_type, criticality FROM public.topology_nodes WHERE is_active LOOP
    SELECT count(*), coalesce(array_agg(source_key), '{}')
      INTO v_direct, v_affected
      FROM public.topology_edges WHERE target_key = n_rec.node_key;
    INSERT INTO public.topology_blast_radius (
      node_key, direct_dependents, transitive_dependents,
      auth_impact, export_impact, ai_impact, billing_impact, notification_impact,
      user_facing_severity, affected_keys
    ) VALUES (
      n_rec.node_key, v_direct, v_direct,
      EXISTS (SELECT 1 FROM unnest(v_affected) x WHERE x ILIKE '%auth%' OR x ILIKE '%profile%'),
      EXISTS (SELECT 1 FROM unnest(v_affected) x WHERE x ILIKE '%export%'),
      EXISTS (SELECT 1 FROM unnest(v_affected) x WHERE x ILIKE '%ai%' OR x ILIKE '%llm%'),
      EXISTS (SELECT 1 FROM unnest(v_affected) x WHERE x ILIKE '%billing%' OR x ILIKE '%wallet%' OR x ILIKE '%cashfree%'),
      EXISTS (SELECT 1 FROM unnest(v_affected) x WHERE x ILIKE '%telegram%' OR x ILIKE '%notif%' OR x ILIKE '%email%'),
      CASE WHEN n_rec.criticality = 'critical' OR v_direct >= 5 THEN 'high'
           WHEN v_direct >= 2 THEN 'medium' ELSE 'low' END,
      v_affected
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

-- RPC: snapshot stability score
CREATE OR REPLACE FUNCTION public.stability_score_snapshot()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total int; v_evac int; v_critical_on_primary int;
  v_op_indep numeric; v_spd numeric; v_recov numeric; v_replay numeric;
  v_extr_safe numeric; v_frag numeric; v_conf numeric; v_overall numeric;
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  SELECT count(*) INTO v_total FROM public.topology_nodes WHERE is_active;
  SELECT count(*) INTO v_evac FROM public.topology_nodes WHERE is_active AND extraction_state IN ('evacuated','owned-primary');
  SELECT count(*) INTO v_critical_on_primary FROM public.topology_nodes
    WHERE is_active AND criticality = 'critical' AND extraction_state = 'on-primary';
  v_op_indep := CASE WHEN v_total > 0 THEN round((v_evac::numeric / v_total) * 100, 1) ELSE 0 END;
  v_spd := CASE WHEN v_total > 0 THEN round((v_critical_on_primary::numeric / v_total) * 100, 1) ELSE 0 END;
  v_recov := 80; v_replay := 75; v_extr_safe := 70; v_frag := 100 - v_op_indep; v_conf := round((v_op_indep + v_recov + v_replay) / 3, 1);
  v_overall := round((v_op_indep + (100 - v_spd) + v_recov + v_replay + v_extr_safe + v_conf) / 6, 1);
  INSERT INTO public.topology_stability_scores (
    operational_independence_pct, single_point_dependency_pct, recovery_readiness_pct,
    replay_resilience_pct, extraction_safety_pct, infra_fragmentation_pct,
    runtime_confidence_pct, overall_score
  ) VALUES (v_op_indep, v_spd, v_recov, v_replay, v_extr_safe, v_frag, v_conf, v_overall)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Seed core nodes (idempotent)
INSERT INTO public.topology_nodes (node_key, node_type, display_name, owner, criticality, runtime, db_dependency, failure_impact, extraction_state, current_authority)
VALUES
  ('db:primary',          'database',       'Lovable Primary DB',      'lovable-owned', 'critical',    'supabase', 'self',           'total outage',           'on-primary',     'lovable'),
  ('db:owned-telemetry',  'database',       'Owned Telemetry DB',      'hustle-owned',  'operational', 'supabase', 'self',           'telemetry loss',         'owned-primary',  'hustle'),
  ('worker:telegram',     'worker',         'Telegram Worker',         'hustle-owned',  'critical',    'railway',  'db:primary',     'no notifications',       'on-primary',     'railway'),
  ('queue:replay',        'queue',          'Replay Queue',            'hustle-owned',  'operational', 'supabase', 'db:primary',     'replay backlog',         'on-primary',     'controller'),
  ('cron:cleanup',        'cron',           'pg_cron cleanup',         'lovable-owned', 'operational', 'pg_cron',  'db:primary',     'stale rows',             'on-primary',     'pg_cron'),
  ('edge:telemetry-router','edge-function', 'telemetry-router',        'hustle-owned',  'operational', 'deno',     'db:owned-telemetry','telemetry drop',     'evacuated',      'edge'),
  ('edge:autonomous-ctrl', 'edge-function', 'autonomous-controller',   'hustle-owned',  'operational', 'deno',     'db:primary',     'no auto cutover',        'on-primary',     'edge'),
  ('domain:hustlaiapp',    'domain',        'hustlaiapp.in',           'hustle-owned',  'critical',    'vercel',   null,             'site down',              'evacuated',      'vercel'),
  ('storage:exports',      'storage',       'exports bucket',          'lovable-owned', 'operational', 'supabase', 'db:primary',     'export delivery lost',   'on-primary',     'lovable'),
  ('realtime:forum',       'realtime',      'forum realtime channel',  'lovable-owned', 'optional',    'supabase', 'db:primary',     'live updates pause',     'on-primary',     'lovable'),
  ('webhook:cashfree',     'webhook',       'Cashfree webhook',        'hustle-owned',  'critical',    'edge',     'db:primary',     'payments stall',         'on-primary',     'edge'),
  ('pipeline:telegram',    'pipeline',      'Telegram pipeline',       'hustle-owned',  'operational', 'gateway',  'worker:telegram','outbound failures',      'on-primary',     'gateway')
ON CONFLICT (node_key) DO NOTHING;

INSERT INTO public.topology_edges (source_key, target_key, relation, criticality, notes) VALUES
  ('worker:telegram',      'db:primary',         'reads-writes', 'critical',    'lease + queue'),
  ('queue:replay',         'db:primary',         'depends-on',   'operational', 'queue table'),
  ('cron:cleanup',         'db:primary',         'writes',       'operational', 'pg_cron jobs'),
  ('edge:telemetry-router','db:owned-telemetry', 'writes',       'operational', 'evacuated stream'),
  ('edge:telemetry-router','db:primary',         'writes',       'operational', 'fallback'),
  ('edge:autonomous-ctrl', 'db:primary',         'reads-writes', 'operational', 'cutover state'),
  ('pipeline:telegram',    'worker:telegram',    'depends-on',   'critical',    null),
  ('webhook:cashfree',     'db:primary',         'writes',       'critical',    'orders'),
  ('storage:exports',      'db:primary',         'depends-on',   'operational', null),
  ('realtime:forum',       'db:primary',         'depends-on',   'optional',    null)
ON CONFLICT (source_key, target_key, relation) DO NOTHING;

-- Seed initial coupling findings (idempotent via NOT EXISTS)
INSERT INTO public.topology_coupling_findings (finding_type, severity, source_kind, source_name, evidence, recommendation)
SELECT * FROM (VALUES
  ('hardcoded-url',          'low',    'edge-function', 'legacy-misc',     'hardcoded primary supabase URL in legacy edge fn', 'Move to env var'),
  ('direct-service-role',    'medium', 'worker',        'telegram-worker', 'service_role used for queue claims',                'Use lease RPC'),
  ('duplicate-cron-owner',   'medium', 'cron',          'cleanup',         'pg_cron + railway sweeper overlap on cleanup',       'Single authority via lease'),
  ('cross-module-coupling',  'low',    'module',        'forum->profiles', 'forum reads profiles directly for badges',           'Add cached view')
) AS t(finding_type, severity, source_kind, source_name, evidence, recommendation)
WHERE NOT EXISTS (SELECT 1 FROM public.topology_coupling_findings);
