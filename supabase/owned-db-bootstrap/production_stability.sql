-- Production Stability Plane — runs on the OWNED project (wguuipsikboqqinqeehv).
-- Idempotent. Apply manually in the owned project's SQL editor.
--
-- Strict rule: this entire surface lives on the OWNED DB. Nothing here may
-- be created on the Lovable-owned primary (vbnqaovxatucrgtnggea).

create schema if not exists ops;

-- 1) Production incidents (NOC layer)
create table if not exists ops.production_incidents (
  id uuid primary key default gen_random_uuid(),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  severity text not null check (severity in ('info','warn','degraded','critical')),
  status text not null default 'open' check (status in ('open','acknowledged','mitigating','resolved')),
  surface text not null,           -- e.g. 'explore','shared-link','export-delivery','realtime','telegram'
  component text not null,         -- failing function/RPC/bucket/cron
  user_facing boolean not null default false,
  impacted_modules text[] not null default '{}',
  blast_radius int not null default 0,
  failure_class text,              -- 'quota','auth','rls','signing','bucket-missing','env','cron','timeout','runtime'
  evidence jsonb not null default '{}'::jsonb,
  suggested_rollback text,
  acknowledged_by uuid,
  resolution_notes text
);
create index if not exists idx_prod_incidents_open on ops.production_incidents(status, detected_at desc) where status <> 'resolved';
create index if not exists idx_prod_incidents_surface on ops.production_incidents(surface, detected_at desc);

-- 2) Runtime health sweeps
create table if not exists ops.runtime_health_sweeps (
  id uuid primary key default gen_random_uuid(),
  sampled_at timestamptz not null default now(),
  target_kind text not null,       -- 'edge-fn','cron','bucket','rpc','realtime','webhook','ai-provider','worker'
  target_name text not null,
  ok boolean not null,
  latency_ms int,
  error_class text,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists idx_rhs_recent on ops.runtime_health_sweeps(target_kind, sampled_at desc);

-- 3) Shared-link audit
create table if not exists ops.shared_link_audit (
  id uuid primary key default gen_random_uuid(),
  scanned_at timestamptz not null default now(),
  token_id uuid,
  export_id uuid,
  bucket text,
  storage_path text,
  state text not null,             -- 'ok','expired','revoked','file-missing','bucket-missing','signing-failed','regenerated'
  detail jsonb not null default '{}'::jsonb
);
create index if not exists idx_sla_state on ops.shared_link_audit(state, scanned_at desc);

-- 4) Explore dependency trace
create table if not exists ops.explore_dependency_traces (
  id uuid primary key default gen_random_uuid(),
  traced_at timestamptz not null default now(),
  surface text not null default 'explore',
  dep_kind text not null,          -- 'query','rpc','storage','ai','realtime','flag','edge-fn'
  dep_name text not null,
  target_db text,                  -- 'primary','owned','analytics','workspace','community','async'
  hard_coupling boolean not null default false,
  quota_sensitive boolean not null default false,
  notes text
);
create index if not exists idx_edt_surface on ops.explore_dependency_traces(surface, traced_at desc);

-- 5) Production audit runs
create table if not exists ops.production_audit_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  scope text[] not null default '{}',
  totals jsonb not null default '{}'::jsonb,
  failures jsonb not null default '[]'::jsonb,
  recovery_actions jsonb not null default '[]'::jsonb,
  triggered_by uuid
);

-- Helper: open or upgrade incident (dedupe by surface+component while open)
create or replace function ops.upsert_incident(
  _surface text, _component text, _severity text,
  _failure_class text, _evidence jsonb, _impacted text[],
  _user_facing boolean, _suggested_rollback text
) returns uuid
language plpgsql as $$
declare _id uuid;
begin
  select id into _id from ops.production_incidents
    where surface = _surface and component = _component and status <> 'resolved'
    order by detected_at desc limit 1;
  if _id is null then
    insert into ops.production_incidents
      (severity, surface, component, user_facing, impacted_modules, failure_class, evidence, suggested_rollback)
      values (_severity, _surface, _component, _user_facing, coalesce(_impacted,'{}'), _failure_class, coalesce(_evidence,'{}'::jsonb), _suggested_rollback)
      returning id into _id;
  else
    update ops.production_incidents
      set severity = _severity, evidence = coalesce(_evidence, evidence),
          failure_class = coalesce(_failure_class, failure_class),
          impacted_modules = coalesce(_impacted, impacted_modules),
          suggested_rollback = coalesce(_suggested_rollback, suggested_rollback)
      where id = _id;
  end if;
  return _id;
end $$;

-- 90-day retention purge
create or replace function ops.purge_stability_old() returns void
language sql as $$
  delete from ops.runtime_health_sweeps where sampled_at < now() - interval '30 days';
  delete from ops.shared_link_audit where scanned_at < now() - interval '90 days';
  delete from ops.explore_dependency_traces where traced_at < now() - interval '30 days';
  delete from ops.production_audit_runs where started_at < now() - interval '90 days';
  delete from ops.production_incidents where status = 'resolved' and resolved_at < now() - interval '90 days';
$$;