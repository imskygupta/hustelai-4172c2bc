-- Phase 8C — Primary DB kernel allowlist enforcement.
-- Run on the PRIMARY DB (vbnqaovxatucrgtnggea).
--
-- Installs an event trigger that BLOCKS any CREATE TABLE in the public
-- schema unless the table is in the auth/billing kernel allowlist below.
-- Drop-and-recreate safe.
--
-- ALLOWED on primary:
--   profiles, subscriptions, wallets, payments, dodo_*, tier_limits,
--   email_verifications, notification_events, user_roles
--   (+ auth.* which we never touch).

create or replace function public.assert_primary_kernel_allowlist()
returns event_trigger
language plpgsql
as $$
declare
  obj record;
  allowed text[] := array[
    'profiles','subscriptions','wallets','payments','tier_limits',
    'email_verifications','notification_events','user_roles'
  ];
  tbl_name text;
begin
  for obj in
    select * from pg_event_trigger_ddl_commands()
    where command_tag = 'CREATE TABLE'
      and schema_name = 'public'
  loop
    tbl_name := split_part(obj.object_identity, '.', 2);
    if not (
      tbl_name = any(allowed)
      or tbl_name like 'dodo_%'
    ) then
      raise exception
        'PRIMARY KERNEL LOCK: table public.% is not in the auth/billing allowlist. Create it on the correct sibling DB (admin/blogs/ai/realtime/workspace).',
        tbl_name;
    end if;
  end loop;
end;
$$;

drop event trigger if exists assert_primary_kernel_allowlist_trg;
create event trigger assert_primary_kernel_allowlist_trg
on ddl_command_end
when tag in ('CREATE TABLE')
execute function public.assert_primary_kernel_allowlist();

-- To temporarily disable for emergency hotfix:
--   alter event trigger assert_primary_kernel_allowlist_trg disable;
-- And re-enable immediately after with:
--   alter event trigger assert_primary_kernel_allowlist_trg enable;