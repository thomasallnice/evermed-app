-- Basic per-user usage counters
alter table public.user_graph
  add column if not exists chat_requests_today int default 0,
  add column if not exists image_requests_today int default 0,
  add column if not exists last_usage_reset date default current_date;

-- RLS already restricts updates/inserts to auth.uid() = user_id

