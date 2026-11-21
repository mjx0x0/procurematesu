-- Gab AI semantic retrieval uses the existing Xenova/all-MiniLM-L6-v2
-- embeddings (384 dimensions). The small capstone corpus uses exact cosine search;
-- an approximate-nearest-neighbor index is intentionally unnecessary at this size.

drop function if exists public.match_documents(extensions.vector, double precision, integer);

create function public.match_documents(
  query_embedding extensions.vector(384),
  match_threshold double precision,
  match_count integer
)
returns table(
  id uuid,
  document_name text,
  document_type text,
  chunk_text text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    dc.id,
    dc.document_name,
    dc.document_type,
    dc.chunk_text,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding asc
  limit greatest(1, least(coalesce(match_count, 8), 50));
$$;

grant execute on function public.match_documents(extensions.vector, double precision, integer)
  to anon, authenticated, service_role;
