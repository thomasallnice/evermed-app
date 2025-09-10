-- RAG schema using pgvector
create extension if not exists vector;

-- Documents tracked for RAG (one row per app document)
create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  file_name text,
  created_at timestamptz default now(),
  unique(document_id)
);

-- Chunks with embeddings (1536 dims for text-embedding-3-small)
create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  tokens int,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index if not exists idx_rag_chunks_doc on public.rag_chunks(document_id);
create index if not exists idx_rag_chunks_embedding on public.rag_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- RLS
alter table public.rag_documents enable row level security;
alter table public.rag_chunks enable row level security;

drop policy if exists "rag_docs_select" on public.rag_documents;
drop policy if exists "rag_docs_modify" on public.rag_documents;
create policy "rag_docs_select" on public.rag_documents for select using (auth.uid() = user_id);
create policy "rag_docs_modify" on public.rag_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "rag_chunks_select" on public.rag_chunks;
drop policy if exists "rag_chunks_modify" on public.rag_chunks;
create policy "rag_chunks_select" on public.rag_chunks for select using (exists (select 1 from public.rag_documents d where d.id = document_id and d.user_id = auth.uid()));
create policy "rag_chunks_modify" on public.rag_chunks for all using (exists (select 1 from public.rag_documents d where d.id = document_id and d.user_id = auth.uid())) with check (exists (select 1 from public.rag_documents d where d.id = document_id and d.user_id = auth.uid()));

-- Helper: upsert document row and return id
create or replace function public.upsert_rag_document(p_user uuid, p_document uuid, p_file_name text)
returns uuid
language plpgsql
as $$
declare rid uuid;
begin
  insert into public.rag_documents(user_id, document_id, file_name)
  values (p_user, p_document, p_file_name)
  on conflict (document_id) do update set file_name = excluded.file_name
  returning id into rid;
  return rid;
end; $$;

-- Helper: insert chunk with embedding provided as text cast to vector
create or replace function public.insert_rag_chunk(p_doc uuid, p_index int, p_content text, p_tokens int, p_embedding_text text)
returns uuid
language plpgsql
as $$
declare cid uuid;
begin
  insert into public.rag_chunks(document_id, chunk_index, content, tokens, embedding)
  values (p_doc, p_index, p_content, p_tokens, (p_embedding_text)::vector)
  returning id into cid;
  return cid;
end; $$;

-- Search top-k chunks for a user by embedding
create or replace function public.match_rag_chunks(p_user uuid, p_query_embedding text, p_match_count int default 8)
returns table(document_id uuid, chunk_id uuid, content text, similarity float4, file_name text, chunk_index int)
language sql stable
as $$
  select c.document_id,
         c.id as chunk_id,
         c.content,
         (1 - (c.embedding <=> (p_query_embedding)::vector))::float4 as similarity,
         d.file_name,
         c.chunk_index
  from public.rag_chunks c
  join public.rag_documents d on d.id = c.document_id
  where d.user_id = p_user
  order by c.embedding <=> (p_query_embedding)::vector asc
  limit p_match_count
$$;

