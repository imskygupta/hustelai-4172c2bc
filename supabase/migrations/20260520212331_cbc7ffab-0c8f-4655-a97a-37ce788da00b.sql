
-- Phase 7D: stop fanning chat_messages over primary websockets. AI chat
-- history is fetched on demand; realtime social workloads live on the
-- realtime/event-fabric DB (qeswhaytgvosfzzgraef).
do $$
begin
  begin
    alter publication supabase_realtime drop table public.chat_messages;
  exception
    when undefined_object then null; -- already absent
    when undefined_table then null;
  end;
end $$;
