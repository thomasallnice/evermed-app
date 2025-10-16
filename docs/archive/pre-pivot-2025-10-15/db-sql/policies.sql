-- RLS policies for Supabase. Safe to apply on Postgres; guards will skip if auth.uid() is unavailable.

-- Enable RLS on key tables
alter table "Person"        enable row level security;
alter table "Document"      enable row level security;
alter table "Observation"   enable row level security;
alter table "SharePack"     enable row level security;
alter table "SharePackItem" enable row level security;
alter table "ShareEvent"    enable row level security;
alter table "ChatMessage"   enable row level security;
alter table "storage"."objects" enable row level security;

-- Apply policies only if auth.uid() exists (Supabase)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'uid' AND n.nspname = 'auth'
  ) THEN

    -- Person: owner-only
    CREATE POLICY IF NOT EXISTS person_owner_select ON "Person"
      FOR SELECT USING (ownerId = auth.uid());
    CREATE POLICY IF NOT EXISTS person_owner_mod ON "Person"
      FOR ALL USING (ownerId = auth.uid()) WITH CHECK (ownerId = auth.uid());

    -- Document: via owning Person
    CREATE POLICY IF NOT EXISTS doc_owner_select ON "Document"
      FOR SELECT USING (EXISTS (SELECT 1 FROM "Person" p WHERE p.id = "Document".personId AND p.ownerId = auth.uid()));
    CREATE POLICY IF NOT EXISTS doc_owner_mod ON "Document"
      FOR ALL USING (EXISTS (SELECT 1 FROM "Person" p WHERE p.id = "Document".personId AND p.ownerId = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM "Person" p WHERE p.id = "Document".personId AND p.ownerId = auth.uid()));
    CREATE POLICY IF NOT EXISTS doc_owner_insert ON "Document"
      FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM "Person" p WHERE p.id = "Document".personId AND p.ownerId = auth.uid()));

    -- Observation: via owning Person
    CREATE POLICY IF NOT EXISTS obs_owner_select ON "Observation"
      FOR SELECT USING (EXISTS (SELECT 1 FROM "Person" p WHERE p.id = "Observation".personId AND p.ownerId = auth.uid()));
    CREATE POLICY IF NOT EXISTS obs_owner_mod ON "Observation"
      FOR ALL USING (EXISTS (SELECT 1 FROM "Person" p WHERE p.id = "Observation".personId AND p.ownerId = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM "Person" p WHERE p.id = "Observation".personId AND p.ownerId = auth.uid()));

    -- SharePack: owner via Person
    CREATE POLICY IF NOT EXISTS pack_owner_select ON "SharePack"
      FOR SELECT USING (EXISTS (SELECT 1 FROM "Person" p WHERE p.id = "SharePack".personId AND p.ownerId = auth.uid()));
    CREATE POLICY IF NOT EXISTS pack_owner_mod ON "SharePack"
      FOR ALL USING (EXISTS (SELECT 1 FROM "Person" p WHERE p.id = "SharePack".personId AND p.ownerId = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM "Person" p WHERE p.id = "SharePack".personId AND p.ownerId = auth.uid()));

    -- SharePackItem: through SharePack
    CREATE POLICY IF NOT EXISTS item_owner_select ON "SharePackItem"
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM "SharePack" sp JOIN "Person" p ON sp.personId = p.id
          WHERE sp.id = "SharePackItem".packId AND p.ownerId = auth.uid()
        )
      );
    CREATE POLICY IF NOT EXISTS item_owner_mod ON "SharePackItem"
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM "SharePack" sp JOIN "Person" p ON sp.personId = p.id
          WHERE sp.id = "SharePackItem".packId AND p.ownerId = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM "SharePack" sp JOIN "Person" p ON sp.personId = p.id
          WHERE sp.id = "SharePackItem".packId AND p.ownerId = auth.uid()
        )
      );

    -- ShareEvent: select via pack; inserts are server-only
    CREATE POLICY IF NOT EXISTS event_owner_select ON "ShareEvent"
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM "SharePack" sp JOIN "Person" p ON sp.personId = p.id
          WHERE sp.id = "ShareEvent".packId AND p.ownerId = auth.uid()
        )
      );

    -- ChatMessage: user-owned
    CREATE POLICY IF NOT EXISTS chat_owner_select ON "ChatMessage"
      FOR SELECT USING ("userId" = auth.uid());
    CREATE POLICY IF NOT EXISTS chat_owner_insert ON "ChatMessage"
      FOR INSERT WITH CHECK ("userId" = auth.uid());
    CREATE POLICY IF NOT EXISTS chat_owner_mod ON "ChatMessage"
      FOR ALL USING ("userId" = auth.uid()) WITH CHECK ("userId" = auth.uid());

    -- Storage objects: bucket path `documents/<ownerId>/...`
    CREATE POLICY IF NOT EXISTS storage_documents_manage ON "storage"."objects"
      FOR ALL USING (
        bucket_id = 'documents' AND split_part(name, '/', 1) = auth.uid()::text
      ) WITH CHECK (
        bucket_id = 'documents' AND split_part(name, '/', 1) = auth.uid()::text
      );
  ELSE
    RAISE NOTICE 'auth.uid() missing; skipping policy creation (non-Supabase environment)';
  END IF;
END
$$;
