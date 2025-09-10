-- Storage bucket `documents` and per-user RLS
-- Safe to run multiple times; uses on conflict or drops existing policies first.

-- Ensure bucket exists (private)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Note: Do NOT alter table ownership/RLS here to avoid permission issues
-- RLS on storage.objects is enabled by default in Supabase

-- Drop old policies if they exist
drop policy if exists "documents_auth_select_own" on storage.objects;
drop policy if exists "documents_auth_insert_own" on storage.objects;
drop policy if exists "documents_auth_update_own" on storage.objects;
drop policy if exists "documents_auth_delete_own" on storage.objects;

-- Select own objects under `${auth.uid()}/...` within `documents` bucket
create policy "documents_auth_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'documents'
  and name like auth.uid()::text || '/%'
);

-- Insert own objects under `${auth.uid()}/...` within `documents` bucket
create policy "documents_auth_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documents'
  and name like auth.uid()::text || '/%'
);

-- Update own objects within `documents` bucket
create policy "documents_auth_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'documents'
  and name like auth.uid()::text || '/%'
)
with check (
  bucket_id = 'documents'
  and name like auth.uid()::text || '/%'
);

-- Delete own objects within `documents` bucket
create policy "documents_auth_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'documents'
  and name like auth.uid()::text || '/%'
);
