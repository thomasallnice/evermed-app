-- Link chat messages to documents (persist attachments)
create table if not exists public.chat_message_docs (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (message_id, document_id)
);

alter table public.chat_message_docs enable row level security;

drop policy if exists "cmd_select" on public.chat_message_docs;
drop policy if exists "cmd_modify" on public.chat_message_docs;

create policy "cmd_select" on public.chat_message_docs
for select to authenticated
using (auth.uid() = user_id);

create policy "cmd_modify" on public.chat_message_docs
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_cmd_user_time on public.chat_message_docs(user_id, created_at);
create index if not exists idx_cmd_message on public.chat_message_docs(message_id);
create index if not exists idx_cmd_document on public.chat_message_docs(document_id);

