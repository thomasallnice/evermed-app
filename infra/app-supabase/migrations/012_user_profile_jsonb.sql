-- User profile (jsonb) to store demographics, vitals, habits, etc.
alter table public.user_graph
  add column if not exists profile jsonb default '{}'::jsonb;

