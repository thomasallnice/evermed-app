-- Chat message persistence per user (single default thread)
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;

drop policy if exists "chat_select" on public.chat_messages;
drop policy if exists "chat_modify" on public.chat_messages;

create policy "chat_select" on public.chat_messages
for select to authenticated
using (auth.uid() = user_id);

create policy "chat_modify" on public.chat_messages
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_chat_messages_user_time on public.chat_messages(user_id, created_at);

