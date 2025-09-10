-- EverMed.ai MVP schema
-- Documents, Summaries, User Graph, Shares

-- DANGER: Reset public app tables (drops data). Adjust as needed.
drop table if exists public.summaries cascade;
drop table if exists public.documents cascade;
drop table if exists public.user_graph cascade;
drop table if exists public.shares cascade;

-- Enable extensions
create extension if not exists pgcrypto;

-- Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_type text,
  tags jsonb default '[]'::jsonb,
  uploaded_at timestamptz default now()
);
create index if not exists idx_documents_user on public.documents(user_id);
alter table public.documents enable row level security;
drop policy if exists "docs_select" on public.documents;
drop policy if exists "docs_modify" on public.documents;
create policy "docs_select" on public.documents for select using (auth.uid() = user_id);
create policy "docs_modify" on public.documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Summaries (one per document)
create table if not exists public.summaries (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade unique,
  user_id uuid references auth.users(id) on delete cascade,
  model text,
  summary_text text,
  created_at timestamptz default now()
);
create index if not exists idx_summaries_user on public.summaries(user_id);
alter table public.summaries enable row level security;
drop policy if exists "sum_select" on public.summaries;
drop policy if exists "sum_modify" on public.summaries;
create policy "sum_select" on public.summaries for select using (auth.uid() = user_id);
create policy "sum_modify" on public.summaries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- User Graph
create table if not exists public.user_graph (
  user_id uuid primary key references auth.users(id) on delete cascade,
  conditions jsonb default '[]',
  medications jsonb default '[]',
  notes text,
  updated_at timestamptz default now()
);
alter table public.user_graph enable row level security;
drop policy if exists "graph_select" on public.user_graph;
drop policy if exists "graph_modify" on public.user_graph;
create policy "graph_select" on public.user_graph for select using (auth.uid() = user_id);
create policy "graph_modify" on public.user_graph for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shares (resolved server-side)
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_shares_user on public.shares(user_id);
alter table public.shares enable row level security;
drop policy if exists "shares_select" on public.shares;
drop policy if exists "shares_modify" on public.shares;
create policy "shares_select" on public.shares for select using (auth.uid() = user_id);
create policy "shares_modify" on public.shares for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Note: Create a Storage bucket named `documents` in Supabase UI.
-- Add RLS policy to allow authenticated users to read/write objects under their folder prefix `${auth.uid()}/*`.
