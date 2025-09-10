-- Structured facts extracted from documents (per-document, per-user)
create table if not exists public.doc_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  facts jsonb not null default '{}'::jsonb,
  model text,
  provenance text,
  kind text, -- 'text' | 'pdf' | 'image'
  extracted_at timestamptz not null default now(),
  unique(user_id, document_id)
);

alter table public.doc_facts enable row level security;
drop policy if exists "doc_facts_select" on public.doc_facts;
drop policy if exists "doc_facts_modify" on public.doc_facts;
create policy "doc_facts_select" on public.doc_facts for select using (auth.uid() = user_id);
create policy "doc_facts_modify" on public.doc_facts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

