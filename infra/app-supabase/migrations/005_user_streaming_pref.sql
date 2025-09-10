-- Per-user streaming default preference
alter table public.user_graph
  add column if not exists streaming_default boolean default true;

-- RLS already restricts updates/inserts to auth.uid() = user_id

