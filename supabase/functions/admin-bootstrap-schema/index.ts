// One-shot bootstrap of the Admin/Ops DB (rqqiujmiagauzohdqjmi).
// Creates all 13 admin-domain tables idempotently. Safe to re-run.
// Invoke: POST /functions/v1/admin-bootstrap-schema  (no body required)
//
// All tables are service-role only (no RLS policies — DB never exposed
// to client; reads go through dedicated read-only edge functions).
import { getAdmin } from "../_shared/clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DDL = [
  // Provider health (mirror of primary schema)
  `CREATE TABLE IF NOT EXISTS public.api_provider_health (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_api_provider_health_status ON public.api_provider_health(status)`,

  // Provider health rolling history (append-only)
  `CREATE TABLE IF NOT EXISTS public.provider_health_history (
    id bigserial PRIMARY KEY,
    provider text NOT NULL,
    status text NOT NULL,
    latency_ms integer,
    success_rate numeric(5,2),
    ok boolean NOT NULL,
    error text,
    recorded_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_phh_provider_recorded ON public.provider_health_history(provider, recorded_at DESC)`,

  // Runtime extraction streams (mirror of primary schema)
  `CREATE TABLE IF NOT EXISTS public.runtime_extraction_streams (
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
  )`,

  // Runtime authority (final routing decisions per stream)
  `CREATE TABLE IF NOT EXISTS public.runtime_authority (
    stream text PRIMARY KEY,
    authority_db text NOT NULL,
    read_db text NOT NULL,
    fallback_db text,
    last_changed_at timestamptz NOT NULL DEFAULT now(),
    changed_by text,
    reason text
  )`,

  // Infra registry (catalog of every DB / runtime / connector)
  `CREATE TABLE IF NOT EXISTS public.infra_registry (
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
  )`,

  // Runtime metrics (5-min rollups)
  `CREATE TABLE IF NOT EXISTS public.runtime_metrics (
    id bigserial PRIMARY KEY,
    metric text NOT NULL,
    value numeric NOT NULL,
    labels jsonb NOT NULL DEFAULT '{}',
    recorded_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_runtime_metrics_metric_time ON public.runtime_metrics(metric, recorded_at DESC)`,

  // Admin alerts (mirror of primary schema, no auth.uid dependency)
  `CREATE TABLE IF NOT EXISTS public.admin_alerts (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_admin_alerts_created ON public.admin_alerts(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_admin_alerts_unacked ON public.admin_alerts(created_at DESC) WHERE acknowledged_at IS NULL`,

  // Ops events (generic admin event log)
  `CREATE TABLE IF NOT EXISTS public.ops_events (
    id bigserial PRIMARY KEY,
    kind text NOT NULL,
    actor text,
    payload jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ops_events_kind_time ON public.ops_events(kind, created_at DESC)`,

  // Runtime incidents
  `CREATE TABLE IF NOT EXISTS public.runtime_incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    severity text NOT NULL DEFAULT 'warning',
    status text NOT NULL DEFAULT 'open',
    component text,
    summary text,
    opened_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    meta jsonb NOT NULL DEFAULT '{}'
  )`,

  // Telemetry snapshots (point-in-time aggregates)
  `CREATE TABLE IF NOT EXISTS public.telemetry_snapshots (
    id bigserial PRIMARY KEY,
    kind text NOT NULL,
    payload jsonb NOT NULL,
    captured_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_snapshots_kind_time ON public.telemetry_snapshots(kind, captured_at DESC)`,

  // Runtime topology cache
  `CREATE TABLE IF NOT EXISTS public.runtime_topology_cache (
    id text PRIMARY KEY,
    topology jsonb NOT NULL,
    refreshed_at timestamptz NOT NULL DEFAULT now()
  )`,

  // Authority projection cache
  `CREATE TABLE IF NOT EXISTS public.authority_projection_cache (
    id text PRIMARY KEY,
    projection jsonb NOT NULL,
    refreshed_at timestamptz NOT NULL DEFAULT now()
  )`,

  // Docs/handbook (Phase 7B — folded into Admin DB)
  `CREATE TABLE IF NOT EXISTS public.docs_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    description text,
    icon text,
    color text,
    sort_order integer NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS public.docs_pages (
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
  )`,
  `CREATE TABLE IF NOT EXISTS public.operator_handbook (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    body_md text NOT NULL DEFAULT '',
    tags text[] NOT NULL DEFAULT '{}',
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS public.internal_playbooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    steps jsonb NOT NULL DEFAULT '[]',
    owner text,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS public.ai_system_docs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    body_md text NOT NULL DEFAULT '',
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS public.migration_notes (
    id bigserial PRIMARY KEY,
    phase text NOT NULL,
    note text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,

  // Seed infra_registry from final topology (idempotent upserts)
  `INSERT INTO public.infra_registry (key, role, project_ref, url, description, tags) VALUES
    ('primary',    'auth-billing',   'vbnqaovxatucrgtnggea', 'https://vbnqaovxatucrgtnggea.supabase.co', 'Auth, payments, profiles only',              ARRAY['core','primary']),
    ('admin',      'admin-ops',      'rqqiujmiagauzohdqjmi', 'https://rqqiujmiagauzohdqjmi.supabase.co', 'Admin/Ops control plane + docs',             ARRAY['admin','ops']),
    ('api',        'ai-async-queues','larncwugkdclkhayfjle', 'https://larncwugkdclkhayfjle.supabase.co', 'AI jobs, async queues, analytics, telemetry',ARRAY['ai','async','analytics']),
    ('blogs',      'cms-content',    'ynvfxxmhowlvhtqiigfc', 'https://ynvfxxmhowlvhtqiigfc.supabase.co', 'Blog, SEO, newsletter, side_hustles catalog',ARRAY['blogs','cms']),
    ('workspace',  'client-ops',     'utflzmecghdtcjupgdan', 'https://utflzmecghdtcjupgdan.supabase.co', 'Work Hub, client portal, intake',            ARRAY['workspace','crm']),
    ('community',  'forums-chat',    'qeswhaytgvosfzzgraef', 'https://qeswhaytgvosfzzgraef.supabase.co', 'Forums, chat, votes',                        ARRAY['community']),
    ('owned-ops',  'telemetry-mirror','wguuipsikboqqinqeehv','https://wguuipsikboqqinqeehv.supabase.co','Operational telemetry mirror',                ARRAY['owned','mirror'])
   ON CONFLICT (key) DO UPDATE SET
     role = EXCLUDED.role,
     project_ref = EXCLUDED.project_ref,
     url = EXCLUDED.url,
     description = EXCLUDED.description,
     tags = EXCLUDED.tags,
     updated_at = now()`,
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = getAdmin();
    const results: Array<{ idx: number; ok: boolean; error?: string; preview: string }> = [];

    for (let i = 0; i < DDL.length; i++) {
      const sql = DDL[i];
      const preview = sql.replace(/\s+/g, " ").slice(0, 80);
      // PostgREST has no raw-SQL endpoint; use pg-meta-style call via rpc on a
      // generic exec function if present, else call SQL via the storage hack.
      // Cleanest path: use the Supabase SQL endpoint with service-role.
      const url = Deno.env.get("ADMIN_SUPABASE_URL")!;
      const key = Deno.env.get("ADMIN_SUPABASE_SERVICE_ROLE_KEY")!;
      const r = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ sql }),
      });
      if (r.ok) {
        results.push({ idx: i, ok: true, preview });
      } else {
        const txt = await r.text().catch(() => "");
        results.push({ idx: i, ok: false, error: `${r.status} ${txt.slice(0, 200)}`, preview });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    return new Response(
      JSON.stringify({
        ok: okCount === DDL.length,
        total: DDL.length,
        succeeded: okCount,
        failed: DDL.length - okCount,
        results,
        note:
          okCount < DDL.length
            ? "If 'exec_sql' RPC missing on Admin DB, create it once in Admin DB SQL editor: CREATE OR REPLACE FUNCTION public.exec_sql(sql text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN EXECUTE sql; END; $$;"
            : "All admin tables created/verified.",
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});