
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ai_daily_usage'
  ) then
    execute 'alter publication supabase_realtime add table public.ai_daily_usage';
  end if;
end $$;
