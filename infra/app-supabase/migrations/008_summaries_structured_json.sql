-- Add structured JSON storage for Explain summaries
alter table public.summaries
  add column if not exists structured_json jsonb;

-- Optional index for existence checks or basic queries
create index if not exists idx_summaries_structured_json on public.summaries using gin (structured_json);

