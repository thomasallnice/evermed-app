-- ============================================================================
-- EverMed RLS Policy Testing Scenarios
-- ============================================================================
-- These tests verify multi-tenant isolation and proper access control
-- Run these after deploying the RLS policies
-- ============================================================================

-- ============================================================================
-- SETUP: Create Test Users and Data
-- ============================================================================

-- Test users (you'll need to create these in Supabase Auth UI first)
-- User 1 ID: 'user-1111-1111-1111-111111111111'
-- User 2 ID: 'user-2222-2222-2222-222222222222'

-- Clean up any existing test data
DELETE FROM "Person" WHERE id IN ('test-person-user1', 'test-person-user2');

-- Create test persons
INSERT INTO "Person" (id, "ownerId", "givenName", "familyName", "birthYear", "sexAtBirth")
VALUES
  ('test-person-user1', 'user-1111-1111-1111-111111111111', 'Alice', 'Smith', 1990, 'F'),
  ('test-person-user2', 'user-2222-2222-2222-222222222222', 'Bob', 'Jones', 1985, 'M');

-- Create test documents
INSERT INTO "Document" (id, "personId", kind, topic, filename, "storagePath", sha256)
VALUES
  ('test-doc-user1', 'test-person-user1', 'pdf', 'Lab Results', 'labs.pdf', 'test-person-user1/1234-labs.pdf', 'abc123'),
  ('test-doc-user2', 'test-person-user2', 'pdf', 'X-Ray', 'xray.pdf', 'test-person-user2/5678-xray.pdf', 'def456');

-- Create test observations
INSERT INTO "Observation" (id, "personId", code, display, "valueNum", unit, "sourceDocId")
VALUES
  ('test-obs-user1', 'test-person-user1', 'glucose', 'Glucose', 95.0, 'mg/dL', 'test-doc-user1'),
  ('test-obs-user2', 'test-person-user2', 'cholesterol', 'Cholesterol', 180.0, 'mg/dL', 'test-doc-user2');

-- ============================================================================
-- TEST SUITE 1: Person Table Isolation
-- ============================================================================

-- TEST 1.1: User can view their own person
-- Expected: 1 row (test-person-user1)
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
SELECT id, "givenName" FROM "Person" WHERE id = 'test-person-user1';
RESET role;

-- TEST 1.2: User CANNOT view another user's person
-- Expected: 0 rows
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
SELECT id, "givenName" FROM "Person" WHERE id = 'test-person-user2';
RESET role;

-- TEST 1.3: User can insert a person for themselves
-- Expected: Success
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
INSERT INTO "Person" (id, "ownerId", "givenName")
VALUES ('test-person-insert', 'user-1111-1111-1111-111111111111', 'Charlie');
RESET role;

-- TEST 1.4: User CANNOT insert a person for another user
-- Expected: Policy violation error
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
-- This should fail
INSERT INTO "Person" (id, "ownerId", "givenName")
VALUES ('test-person-insert-fail', 'user-2222-2222-2222-222222222222', 'Dave');
RESET role;

-- Cleanup
DELETE FROM "Person" WHERE id = 'test-person-insert';

-- ============================================================================
-- TEST SUITE 2: Document Table (Transitive Ownership)
-- ============================================================================

-- TEST 2.1: User can view documents of their person
-- Expected: 1 row (test-doc-user1)
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
SELECT id, filename FROM "Document" WHERE "personId" = 'test-person-user1';
RESET role;

-- TEST 2.2: User CANNOT view documents of another user's person
-- Expected: 0 rows
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
SELECT id, filename FROM "Document" WHERE "personId" = 'test-person-user2';
RESET role;

-- TEST 2.3: User can insert document for their person
-- Expected: Success
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
INSERT INTO "Document" (id, "personId", kind, filename, "storagePath", sha256)
VALUES ('test-doc-insert', 'test-person-user1', 'pdf', 'test.pdf', 'test-person-user1/test.pdf', 'hash123');
RESET role;

-- TEST 2.4: User CANNOT insert document for another user's person
-- Expected: Policy violation error
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
-- This should fail
INSERT INTO "Document" (id, "personId", kind, filename, "storagePath", sha256)
VALUES ('test-doc-insert-fail', 'test-person-user2', 'pdf', 'hack.pdf', 'test-person-user2/hack.pdf', 'hash456');
RESET role;

-- Cleanup
DELETE FROM "Document" WHERE id = 'test-doc-insert';

-- ============================================================================
-- TEST SUITE 3: Observation Table (Transitive Ownership)
-- ============================================================================

-- TEST 3.1: User can view observations of their person
-- Expected: 1 row (test-obs-user1)
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
SELECT id, code, display FROM "Observation" WHERE "personId" = 'test-person-user1';
RESET role;

-- TEST 3.2: User CANNOT view observations of another user's person
-- Expected: 0 rows
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
SELECT id, code, display FROM "Observation" WHERE "personId" = 'test-person-user2';
RESET role;

-- ============================================================================
-- TEST SUITE 4: DocChunk Table (Multi-Level Transitive)
-- ============================================================================

-- Setup: Create test chunks
INSERT INTO "DocChunk" (id, "documentId", "chunkId", text)
VALUES
  ('test-chunk-user1', 'test-doc-user1', 0, 'Test chunk for user 1 document'),
  ('test-chunk-user2', 'test-doc-user2', 0, 'Test chunk for user 2 document');

-- TEST 4.1: User can view chunks of their documents
-- Expected: 1 row (test-chunk-user1)
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
SELECT id, text FROM "DocChunk" WHERE "documentId" = 'test-doc-user1';
RESET role;

-- TEST 4.2: User CANNOT view chunks of another user's documents
-- Expected: 0 rows
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
SELECT id, text FROM "DocChunk" WHERE "documentId" = 'test-doc-user2';
RESET role;

-- Cleanup
DELETE FROM "DocChunk" WHERE id IN ('test-chunk-user1', 'test-chunk-user2');

-- ============================================================================
-- TEST SUITE 5: ChatMessage Table (Direct User Ownership)
-- ============================================================================

-- Setup: Create test messages
INSERT INTO "ChatMessage" (id, "userId", role, content)
VALUES
  ('test-msg-user1', 'user-1111-1111-1111-111111111111', 'user', 'Hello from user 1'),
  ('test-msg-user2', 'user-2222-2222-2222-222222222222', 'user', 'Hello from user 2');

-- TEST 5.1: User can view their own messages
-- Expected: 1 row (test-msg-user1)
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
SELECT id, content FROM "ChatMessage" WHERE "userId" = 'user-1111-1111-1111-111111111111';
RESET role;

-- TEST 5.2: User CANNOT view another user's messages
-- Expected: 0 rows
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
SELECT id, content FROM "ChatMessage" WHERE "userId" = 'user-2222-2222-2222-222222222222';
RESET role;

-- Cleanup
DELETE FROM "ChatMessage" WHERE id IN ('test-msg-user1', 'test-msg-user2');

-- ============================================================================
-- TEST SUITE 6: SharePack and Related Tables
-- ============================================================================

-- Setup: Create test share pack
INSERT INTO "SharePack" (id, "personId", title, audience, "passcodeHash", "expiresAt")
VALUES ('test-pack-user1', 'test-person-user1', 'Test Share', 'clinician', 'hash', NOW() + INTERVAL '1 day');

INSERT INTO "SharePackItem" (id, "packId", "documentId")
VALUES ('test-item-user1', 'test-pack-user1', 'test-doc-user1');

-- TEST 6.1: User can view their own share packs
-- Expected: 1 row
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
SELECT id, title FROM "SharePack" WHERE id = 'test-pack-user1';
RESET role;

-- TEST 6.2: User can view items in their share packs
-- Expected: 1 row
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
SELECT id FROM "SharePackItem" WHERE "packId" = 'test-pack-user1';
RESET role;

-- Cleanup
DELETE FROM "SharePack" WHERE id = 'test-pack-user1';

-- ============================================================================
-- TEST SUITE 7: Service Role Bypass
-- ============================================================================

-- TEST 7.1: Service role can view all persons
-- Expected: At least 2 rows (all test persons)
SET LOCAL role = service_role;
SELECT id, "givenName" FROM "Person" WHERE id IN ('test-person-user1', 'test-person-user2');
RESET role;

-- TEST 7.2: Service role can view all documents
-- Expected: At least 2 rows
SET LOCAL role = service_role;
SELECT id, filename FROM "Document" WHERE id IN ('test-doc-user1', 'test-doc-user2');
RESET role;

-- ============================================================================
-- TEST SUITE 8: Edge Cases
-- ============================================================================

-- TEST 8.1: NULL userId in optional fields
-- TokenUsage can have NULL userId - verify user can't see it
INSERT INTO "TokenUsage" (id, "userId", feature, model, "tokensIn", "tokensOut")
VALUES ('test-token-null', NULL, 'test', 'gpt-4', 100, 50);

SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
-- Should not return the NULL userId row
SELECT id FROM "TokenUsage" WHERE id = 'test-token-null';
RESET role;

DELETE FROM "TokenUsage" WHERE id = 'test-token-null';

-- TEST 8.2: Attempting to update ownerId (security critical)
-- User should NOT be able to change ownership of their person
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-1111-1111-1111-111111111111';
-- This should fail the WITH CHECK clause
UPDATE "Person"
SET "ownerId" = 'user-2222-2222-2222-222222222222'
WHERE id = 'test-person-user1';
RESET role;

-- Verify ownership didn't change
SELECT id, "ownerId" FROM "Person" WHERE id = 'test-person-user1';

-- ============================================================================
-- CLEANUP: Remove Test Data
-- ============================================================================

-- Clean up all test data
DELETE FROM "Observation" WHERE id IN ('test-obs-user1', 'test-obs-user2');
DELETE FROM "Document" WHERE id IN ('test-doc-user1', 'test-doc-user2');
DELETE FROM "Person" WHERE id IN ('test-person-user1', 'test-person-user2');

-- ============================================================================
-- STORAGE POLICY TESTS (Run via Supabase Client SDK)
-- ============================================================================

-- These tests should be run via JavaScript/TypeScript using Supabase client:

/*
// TEST S1: User can upload to their person's folder
const { data, error } = await supabase.storage
  .from('documents')
  .upload('test-person-user1/test.pdf', file);
// Expected: Success

// TEST S2: User CANNOT upload to another person's folder
const { data, error } = await supabase.storage
  .from('documents')
  .upload('test-person-user2/hack.pdf', file);
// Expected: Policy violation error

// TEST S3: User can read their own files
const { data, error } = await supabase.storage
  .from('documents')
  .download('test-person-user1/test.pdf');
// Expected: Success

// TEST S4: User CANNOT read another user's files
const { data, error } = await supabase.storage
  .from('documents')
  .download('test-person-user2/xray.pdf');
// Expected: Policy violation error

// TEST S5: User can delete their own files
const { data, error } = await supabase.storage
  .from('documents')
  .remove(['test-person-user1/test.pdf']);
// Expected: Success

// TEST S6: User CANNOT delete another user's files
const { data, error } = await supabase.storage
  .from('documents')
  .remove(['test-person-user2/xray.pdf']);
// Expected: Policy violation error

// TEST S7: Service role can read all files (for signed URLs)
const { data, error } = await supabaseAdmin.storage
  .from('documents')
  .createSignedUrl('test-person-user2/xray.pdf', 3600);
// Expected: Success
*/

-- ============================================================================
-- PERFORMANCE TESTS
-- ============================================================================

-- Verify indexes exist for policy performance
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Analyze query plans for policy checks
-- (Run with actual data to see if policies cause table scans)
EXPLAIN ANALYZE
SELECT * FROM "Document" WHERE "personId" = 'test-person-user1';

EXPLAIN ANALYZE
SELECT * FROM "Observation" WHERE "personId" = 'test-person-user1';

-- ============================================================================
-- TEST RESULTS SUMMARY
-- ============================================================================

-- All tests should:
-- 1. Allow users to access their own data
-- 2. Prevent users from accessing other users' data
-- 3. Allow service role to access all data
-- 4. Prevent ownership transfer attacks
-- 5. Handle NULL values correctly
-- 6. Perform efficiently with proper indexes
-- ============================================================================
