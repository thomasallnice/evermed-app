-- Ensure vector extension and fix rag_chunks embedding dimension to match 1536 (text-embedding-3-small)
create extension if not exists vector;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rag_chunks' and column_name = 'embedding'
  ) then
    execute 'alter table public.rag_chunks alter column embedding type vector(1536)';
  end if;
exception when others then
  -- Ignore if type is already correct or cannot be altered without manual drop
  null;
end $$;

-- Recreate IVFFLAT index if needed
drop index if exists idx_rag_chunks_embedding;
create index if not exists idx_rag_chunks_embedding on public.rag_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

