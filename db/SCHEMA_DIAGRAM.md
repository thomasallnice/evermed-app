# EverMed Database Schema Diagram

**Last Updated:** 2025-10-04
**Schema Location:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/schema.prisma`

---

## Core Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION & OWNERSHIP                          │
│                                                                         │
│  Supabase Auth (auth.users)                                           │
│        │                                                               │
│        │ auth.uid()                                                    │
│        ▼                                                               │
│  ┌─────────────┐                                                      │
│  │   Person    │ ◄── Root Ownership Entity (all data belongs here)   │
│  ├─────────────┤                                                      │
│  │ id (PK)     │                                                      │
│  │ ownerId ⚠️   │ ⚠️ SHOULD BE UNIQUE (1:1 with auth.uid())          │
│  │ givenName   │                                                      │
│  │ familyName  │                                                      │
│  │ birthYear   │                                                      │
│  │ locale      │                                                      │
│  └─────────────┘                                                      │
│        │                                                               │
│        │ CASCADE DELETE (all child data deleted with Person)          │
│        ▼                                                               │
└─────────────────────────────────────────────────────────────────────────┘

                          ┌─────────┬──────────┬──────────┐
                          │         │          │          │
                          ▼         ▼          ▼          ▼

┌──────────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│    Document      │  │ Observation  │  │  SharePack  │  │  (future)    │
├──────────────────┤  ├──────────────┤  ├─────────────┤  │              │
│ id (PK)          │  │ id (PK)      │  │ id (PK)     │  │              │
│ personId (FK) ✅ │  │ personId ✅   │  │ personId ✅  │  │              │
│ kind             │  │ code (FHIR)  │  │ title       │  │              │
│ topic            │  │ display      │  │ audience    │  │              │
│ filename         │  │ valueNum     │  │ passcodeHash│  │              │
│ storagePath      │  │ unit         │  │ expiresAt   │  │              │
│ sha256           │  │ refLow/High  │  │ revokedAt   │  │              │
│ uploadedAt       │  │ effectiveAt  │  │ viewsCount  │  │              │
│ processedAt      │  │ sourceDocId ✅│  └─────────────┘  │              │
└──────────────────┘  │ sourceAnchor │         │          │              │
        │             └──────────────┘         │          │              │
        │ CASCADE ✅           ▲                │          │              │
        │                     │                │          │              │
        ▼                     │ CASCADE ✅      │          │              │
┌──────────────────┐          │                │          │              │
│    DocChunk      │──────────┘                │          │              │
├──────────────────┤                            │ CASCADE  │              │
│ id (PK)          │                            ▼          │              │
│ documentId (FK)🚨│                   ┌──────────────────┐│              │
│ chunkId          │                   │ SharePackItem    ││              │
│ text             │                   ├──────────────────┤│              │
│ sourceAnchor     │                   │ id (PK)          ││              │
│ embedding (vec)  │                   │ packId (FK) ✅   ││              │
└──────────────────┘                   │ documentId (FK)✅││              │
        │                              │ observationId ✅ ││              │
        │ SET NULL ✅                   └──────────────────┘│              │
        │                                       │           │              │
        ▼                                       │ CASCADE   │              │
┌──────────────────┐                            ▼           │              │
│  ChatMessage     │                   ┌──────────────────┐│              │
├──────────────────┤                   │   ShareEvent     ││              │
│ id (PK)          │                   ├──────────────────┤│              │
│ userId ✅        │                   │ id (PK)          ││              │
│ role             │                   │ packId (FK) ✅   ││              │
│ content          │                   │ kind             ││              │
│ documentId (FK)? │                   │ createdAt        ││              │
│ createdAt        │                   │ ipHash           ││              │
└──────────────────┘                   └──────────────────┘│              │
                                                            │              │

┌─────────────────────────────────────────────────────────────────────────┐
│                   ANALYTICS & TELEMETRY (Non-PHI)                       │
│                                                                         │
│  ┌──────────────┐              ┌──────────────────┐                   │
│  │ TokenUsage   │              │ AnalyticsEvent   │                   │
│  ├──────────────┤              ├──────────────────┤                   │
│  │ id (PK)      │              │ id (PK)          │                   │
│  │ userId       │              │ userId           │                   │
│  │ feature      │              │ name             │                   │
│  │ model        │              │ meta (JSON)      │                   │
│  │ tokensIn/Out │              │ createdAt        │                   │
│  │ costUsd      │              └──────────────────┘                   │
│  └──────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Foreign Key Cascade Rules

### ✅ Correct Cascades
| Parent Table | Child Table      | Column         | Delete Rule | Status |
|--------------|------------------|----------------|-------------|--------|
| Person       | Document         | personId       | CASCADE     | ✅ OK   |
| Person       | Observation      | personId       | CASCADE     | ✅ OK   |
| Person       | SharePack        | personId       | CASCADE     | ✅ OK   |
| Document     | Observation      | sourceDocId    | CASCADE     | ✅ OK   |
| Document     | SharePackItem    | documentId     | CASCADE     | ✅ OK   |
| Document     | ChatMessage      | documentId     | SET NULL    | ✅ OK   |
| Observation  | SharePackItem    | observationId  | CASCADE     | ✅ OK   |
| SharePack    | SharePackItem    | packId         | CASCADE     | ✅ OK   |
| SharePack    | ShareEvent       | packId         | CASCADE     | ✅ OK   |

### 🚨 BROKEN Cascade
| Parent Table | Child Table | Column      | Delete Rule      | Status      |
|--------------|-------------|-------------|------------------|-------------|
| Document     | DocChunk    | documentId  | RESTRICT (wrong!)| 🚨 CRITICAL |

**Expected:** CASCADE
**Actual:** RESTRICT (since migration 20250917074244_add_chat_messages)
**Impact:** Users cannot delete documents with chunks

---

## Index Strategy

### Primary Keys (Automatic)
All tables use UUID primary keys: `@id @default(uuid())`

### Composite Indexes (Performance)
```prisma
// Observation: Fast lookup by person, code, date
@@index([personId, code, effectiveAt])

// ChatMessage: Fast user chat history retrieval
@@index([userId, createdAt])

// AnalyticsEvent: Fast event type queries
@@index([name, createdAt])
```

### Unique Constraints
```prisma
// DocChunk: Prevent duplicate chunk IDs per document
@@unique([documentId, chunkId])

// Person: ⚠️ MISSING - should have @unique on ownerId
```

### RLS Performance Indexes (from supabase_rls_policies.sql)
```sql
-- Critical for RLS policy performance (prevent table scans)
idx_person_owner_id         → Person(ownerId)
idx_document_person_id      → Document(personId)
idx_observation_person_id   → Observation(personId)
idx_sharepack_person_id     → SharePack(personId)
idx_sharepackitem_pack_id   → SharePackItem(packId)
idx_shareevent_pack_id      → ShareEvent(packId)
idx_docchunk_document_id    → DocChunk(documentId)
idx_chatmessage_user_id     → ChatMessage(userId)
idx_tokenusage_user_id      → TokenUsage(userId)
idx_analyticsevent_user_id  → AnalyticsEvent(userId)
```

### Vector Indexes (Future)
```sql
-- ⚠️ NOT YET CREATED - required when DocChunk > 5K rows
CREATE INDEX docchunk_embedding_cosine_idx
ON "DocChunk" USING hnsw (embedding vector_cosine_ops);
```

---

## Data Flow & Ownership Model

### Ownership Hierarchy
```
Supabase Auth User (auth.uid())
    ↓ 1:1 (⚠️ should be enforced with @unique)
Person (ownerId = auth.uid())
    ↓ 1:N
Document, Observation, SharePack
    ↓ 1:N
DocChunk, SharePackItem, ShareEvent
```

### RLS Enforcement
**Direct Ownership:**
- Person: `auth.uid()::text = ownerId`
- ChatMessage: `auth.uid()::text = userId`

**Transitive Ownership (via Person):**
- Document: `EXISTS(SELECT 1 FROM Person WHERE id = Document.personId AND ownerId = auth.uid())`
- Observation: Same pattern through Person
- SharePack: Same pattern through Person

**Double Transitive (via SharePack → Person):**
- SharePackItem: `EXISTS(SELECT 1 FROM SharePack → Person WHERE ownerId = auth.uid())`
- ShareEvent: Same pattern

**Triple Transitive (via Document → Person):**
- DocChunk: `EXISTS(SELECT 1 FROM Document → Person WHERE ownerId = auth.uid())`

---

## Storage Buckets

### Documents Bucket (Private)
```sql
bucket_id: 'documents'
public: false
file_size_limit: 52428800 (50 MB)
allowed_mime_types: [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif',
  'image/webp', 'image/tiff', 'image/bmp'
]

Path structure: {personId}/{timestamp}_{filename}
RLS: User can only access files in their Person folders
```

### Avatars Bucket (Public Read, Authenticated Write)
```sql
bucket_id: 'avatars'
public: true (read-only)
file_size_limit: 5242880 (5 MB)
allowed_mime_types: [
  'image/jpeg', 'image/jpg', 'image/png',
  'image/gif', 'image/webp'
]

Path structure: {userId}/avatar.{extension}
RLS: User can only upload/update/delete their own avatar
Public: Anyone can view avatars (for profile pictures)
```

---

## pgvector Integration

### Embedding Column
```prisma
model DocChunk {
  embedding Unsupported("vector")?
  // Dimension set at runtime (typically 1536 for OpenAI text-embedding-3-small)
}
```

### SQL Type
```sql
embedding vector
-- No dimension specified in schema (flexible for different models)
```

### Vector Operations (Raw SQL via Prisma)
```sql
-- Cosine similarity search (most common for embeddings)
SELECT id, text, 1 - (embedding <=> '[...]'::vector) AS similarity
FROM "DocChunk"
WHERE embedding IS NOT NULL
ORDER BY embedding <=> '[...]'::vector
LIMIT 10;

-- L2 distance (Euclidean)
SELECT id, text, embedding <-> '[...]'::vector AS distance
FROM "DocChunk"
WHERE embedding IS NOT NULL
ORDER BY embedding <-> '[...]'::vector
LIMIT 10;

-- Inner product (dot product)
SELECT id, text, (embedding <#> '[...]'::vector) * -1 AS score
FROM "DocChunk"
WHERE embedding IS NOT NULL
ORDER BY embedding <#> '[...]'::vector
LIMIT 10;
```

### Distance Operators
- `<=>` Cosine distance (1 - cosine similarity)
- `<->` L2 distance (Euclidean)
- `<#>` Negative inner product (for max similarity, multiply by -1)

---

## Critical Data Constraints

### NOT NULL Fields (Must Be Provided)
**Person:** ownerId (Supabase auth.uid)
**Document:** personId, kind, filename, storagePath, sha256
**Observation:** personId, code, display, sourceDocId
**SharePack:** personId, title, audience, passcodeHash, expiresAt
**ChatMessage:** userId, role, content

### Optional Fields (Can Be NULL)
**Person:** givenName, familyName, birthYear, sexAtBirth
**Document:** topic, processedAt
**Observation:** valueNum, unit, refLow, refHigh, effectiveAt, sourceAnchor
**SharePack:** revokedAt
**ChatMessage:** documentId (can be NULL if document deleted)
**DocChunk:** sourceAnchor, embedding (NULL until processed)

### Default Values
```prisma
Person.locale:             'de-DE'
SharePack.viewsCount:      0
*.createdAt:               now()
*.uploadedAt:              now()
```

---

## Security Guarantees

### Multi-Tenant Isolation
✅ **Enforced at Database Level (RLS Policies)**
- User A CANNOT see User B's data (even with SQL injection)
- Service role bypasses RLS (used by API routes with authorization)
- All policies verified in `db/supabase_rls_policies.sql`

### Storage Security
✅ **Documents Bucket:** Private, RLS-enforced file access
✅ **Avatars Bucket:** Public read (for display), authenticated write (own avatar only)
✅ **Path Isolation:** Files stored in user-specific folders

### Cascade Deletion Safety
✅ **Person Deleted → All Data Deleted** (complete user removal)
🚨 **Document Deleted → DocChunks SHOULD Delete** (currently BROKEN)
✅ **Document Deleted → ChatMessage.documentId SET NULL** (preserve chat history)
✅ **SharePack Deleted → Items & Events Deleted** (complete pack removal)

---

## Known Issues & Fixes

### 🚨 CRITICAL: DocChunk Cascade Broken
**Issue:** Cannot delete documents with chunks (FK violation)
**Fix:** See `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/DEPLOYMENT_FIX_PLAN.md`

### ⚠️ RECOMMENDED: Person.ownerId Not Unique
**Issue:** One Supabase user could create multiple Person records
**Fix:** Add `@unique` to `Person.ownerId` in schema

### ⚠️ RECOMMENDED: No Vector Index
**Issue:** Slow vector searches (full table scan)
**Fix:** Add HNSW index when DocChunk > 5K rows

---

## Migration History

1. **20250911081240_init** - Initial schema, all tables, pgvector
2. **20250911160708_add_source_anchor** - Added DocChunk.sourceAnchor
3. **20250912120000_add_chat_messages_backref** - Prisma-only (no SQL)
4. **20250917074244_add_chat_messages** - ChatMessage table, **BROKE DocChunk CASCADE**
5. **20250225120000_add_chat_message.sql** - ⚠️ LOOSE FILE (obsolete, archive)
6. **20251004000000_create_avatars_bucket.sql** - ⚠️ LOOSE FILE (convert to proper migration)

---

**Legend:**
- ✅ Working correctly
- 🚨 Critical issue (blocking)
- ⚠️ Warning/recommendation
- FK = Foreign Key
- RLS = Row Level Security
- CASCADE = Delete child records when parent deleted
- RESTRICT = Prevent parent deletion if child exists (usually wrong for our use case)
- SET NULL = Set child FK to NULL when parent deleted (correct for optional relations)

---

**See Also:**
- Full Report: `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/DEPLOYMENT_VALIDATION_REPORT.md`
- Fix Plan: `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/DEPLOYMENT_FIX_PLAN.md`
- Quick Summary: `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/VALIDATION_SUMMARY.md`
