-- Phase 9E — Security hardening audit. Run per DB; review output manually.

-- 1. Tables WITHOUT row-level security enabled
select 'rls_disabled' as kind, schemaname||'.'||tablename as detail
  from pg_tables
 where schemaname = 'public'
   and tablename not in (
     select c.relname from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relrowsecurity = true
   );

-- 2. Overly permissive policies (USING true / WITH CHECK true)
select 'wide_open_policy' as kind, schemaname||'.'||tablename||'/'||policyname as detail
  from pg_policies
 where schemaname='public'
   and (qual = 'true' or with_check = 'true');

-- 3. Tables exposed to anon role with write privilege
select 'anon_write_privilege' as kind, table_schema||'.'||table_name||'/'||privilege_type as detail
  from information_schema.role_table_grants
 where grantee = 'anon'
   and privilege_type in ('INSERT','UPDATE','DELETE')
   and table_schema = 'public';

-- 4. Storage buckets that are public
select 'public_bucket' as kind, id::text as detail
  from storage.buckets where public = true;

-- 5. Storage objects in non-public buckets without an explicit owner-scoped policy
--    (informational — review per bucket)
select 'bucket_policy_review' as kind, b.id as detail
  from storage.buckets b
 where not exists (
   select 1 from pg_policies p
    where p.schemaname='storage' and p.tablename='objects'
      and p.qual ilike '%'||b.id||'%'
 );

-- 6. Secret inventory — list infra_secrets older than 180d (run on Admin DB)
-- select 'secret_rotation_due' as kind, name||' age='||(now()-created_at)::text as detail
--   from public.infra_secrets where created_at < now() - interval '180 days';