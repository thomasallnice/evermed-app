-- Extend match_rag_chunks to include original app document id for linking
-- Need to drop existing function due to changed OUT type signature
drop function if exists public.match_rag_chunks(uuid, text, int);

create function public.match_rag_chunks(
  p_user uuid,
  p_query_embedding text,
  p_match_count int default 8
)
returns table(
  document_id uuid,          -- rag_documents.id
  chunk_id uuid,
  content text,
  similarity float4,
  file_name text,
  chunk_index int,
  app_document_id uuid       -- public.documents.id
)
language sql stable
as $$
  select c.document_id,
         c.id as chunk_id,
         c.content,
         (1 - (c.embedding <=> (p_query_embedding)::vector))::float4 as similarity,
         d.file_name,
         c.chunk_index,
         d.document_id as app_document_id
  from public.rag_chunks c
  join public.rag_documents d on d.id = c.document_id
  where d.user_id = p_user
  order by c.embedding <=> (p_query_embedding)::vector asc
  limit p_match_count
$$;
