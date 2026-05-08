
-- Admin view: per-user AI usage today
create or replace view public.admin_daily_usage_summary
with (security_invoker = true) as
select
  p.user_id,
  p.email,
  p.subscription_tier::text as subscription_tier,
  coalesce(sum(u.count) filter (where u.usage_date = (now() at time zone 'utc')::date), 0)::int as ai_used_today,
  case p.subscription_tier::text
    when 'pro' then 5
    when 'elite' then 10
    when 'infinity' then 20
    else 3
  end as ai_max_today,
  max(u.updated_at) filter (where u.usage_date = (now() at time zone 'utc')::date) as last_use_at,
  exists(
    select 1 from public.user_ai_keys k
    where k.user_id = p.user_id and k.is_active = true
      and k.api_key is not null and length(k.api_key) > 0
  ) as has_byo_key
from public.profiles p
left join public.ai_daily_usage u on u.user_id = p.user_id
group by p.user_id, p.email, p.subscription_tier;

grant select on public.admin_daily_usage_summary to authenticated;

-- Allow admins to insert notifications for any user
drop policy if exists "admins create notifs for any user" on public.workspace_notifications;
create policy "admins create notifs for any user"
on public.workspace_notifications
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to read all notifications (for audit)
drop policy if exists "admins read all notifs" on public.workspace_notifications;
create policy "admins read all notifs"
on public.workspace_notifications
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role));
