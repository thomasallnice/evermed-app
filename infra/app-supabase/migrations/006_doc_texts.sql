-- Cache for extracted document text to avoid repeated parsing/extraction
create table if not exists public.doc_texts (
  document_id uuid primary key references public.documents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  text text,
  extracted_at timestamptz default now()
);

alter table public.doc_texts enable row level security;

drop policy if exists "doc_texts_select" on public.doc_texts;
drop policy if exists "doc_texts_modify" on public.doc_texts;

create policy "doc_texts_select" on public.doc_texts
for select to authenticated
using (auth.uid() = user_id);

create policy "doc_texts_modify" on public.doc_texts
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

