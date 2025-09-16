#!/usr/bin/env bash
set -euo pipefail

echo "== EverMed Smoke E2E (owner-aware) =="

# ---------- Config ----------
API="http://localhost:3000"
PSQL_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
PDF_PATH="${1:-tests/fixtures/documents/dummy-documents/SAMPLE-ALLERGY-TEST-REPORT.pdf}"

# Optionally preselect a Person or Owner via env:
#   SMOKE_PERSON_ID=...      # use an existing Person.id
#   SMOKE_OWNER_ID=...       # force ownerId (e.g., 'test-user' or a UUID)
# If neither provided, the script will prefer an existing Person and reuse its ownerId.

# ---------- Sanity ----------
need() { v="$1"; if [ -z "${!v:-}" ]; then echo "Missing env: $v"; exit 1; fi; }
need PSQL_URL

if [ ! -f "$PDF_PATH" ]; then
  echo "PDF not found: $PDF_PATH"
  echo "Usage: $0 [path/to/pdf]"; exit 1
fi

# ---------- Ensure Person & Owner ----------
echo "[db] resolving Person & ownerId"

# 1) If SMOKE_PERSON_ID provided, read its ownerId
PERSON_ID="${SMOKE_PERSON_ID:-}"
OWNER_ID="${SMOKE_OWNER_ID:-}"

if [ -n "$PERSON_ID" ]; then
  OWNER_ID=$(psql "$PSQL_URL" -Atc "select \"ownerId\" from \"Person\" where id='${PERSON_ID}' limit 1" 2>/dev/null || echo "")
fi

# 2) If still no PERSON_ID, try to reuse any existing Person (prefer one with non-null ownerId)
if [ -z "${PERSON_ID:-}" ]; then
  PERSON_ID=$(psql "$PSQL_URL" -Atc "select id from \"Person\" where \"ownerId\" is not null limit 1" 2>/dev/null || echo "")
  if [ -n "$PERSON_ID" ] && [ -z "${OWNER_ID:-}" ]; then
    OWNER_ID=$(psql "$PSQL_URL" -Atc "select \"ownerId\" from \"Person\" where id='${PERSON_ID}' limit 1" 2>/dev/null || echo "")
  fi
fi

# 3) If still missing either, create a Person with desired OWNER_ID (default to 'test-user')
if [ -z "${PERSON_ID:-}" ] || [ -z "${OWNER_ID:-}" ]; then
  OWNER_ID="${OWNER_ID:-test-user}"
  PERSON_ID=$(psql "$PSQL_URL" -Atc "insert into \"Person\"(id, \"ownerId\") values (gen_random_uuid(),'${OWNER_ID}') returning id" 2>/dev/null || echo "")
fi

if [ -z "$PERSON_ID" ] || [ -z "$OWNER_ID" ]; then
  echo "[db] could not ensure Person+ownerId"; exit 1
fi

echo "[db] Person:  $PERSON_ID"
echo "[db] OwnerId: $OWNER_ID  (will be sent as x-user-id)"

# ---------- Start dev server (if not up) ----------
PORT=3000
if ! nc -z localhost $PORT >/dev/null 2>&1; then
  echo "[web] starting Next dev on :$PORT"
  (cd apps/web && npm run dev >/tmp/evermed-dev.log 2>&1 &) 
  for i in {1..30}; do sleep 1; nc -z localhost $PORT >/dev/null 2>&1 && break; done
fi
nc -z localhost $PORT >/dev/null 2>&1 || { echo "[web] server did not start; see /tmp/evermed-dev.log"; exit 1; }
echo "[web] server up at $API"

# ---------- Upload ----------
echo "[upload] uploading $PDF_PATH"
UPLOAD_JSON=$(curl -s -X POST "$API/api/uploads" \
  -H "x-user-id: $OWNER_ID" \
  -F "personId=${PERSON_ID}" \
  -F "file=@${PDF_PATH}")
echo "$UPLOAD_JSON" | jq .
DOC_ID=$(echo "$UPLOAD_JSON" | jq -r '.documentId // empty')
[ -z "$DOC_ID" -o "$DOC_ID" = "null" ] && { echo "[upload] failed"; exit 1; }
echo "[upload] DocumentId: $DOC_ID"

# ---------- Document signed URL ----------
DOC_JSON=$(curl -s "$API/api/documents/${DOC_ID}" -H "x-user-id: $OWNER_ID")
echo "$DOC_JSON" | jq .
SIGNED_URL=$(echo "$DOC_JSON" | jq -r '.signedUrl // empty')
[ -z "$SIGNED_URL" -o "$SIGNED_URL" = "null" ] && { echo "[doc] missing signedUrl (forbidden or config?)"; exit 1; }
echo "[doc] signedUrl ok"

# ---------- Create Share Pack ----------
echo "[share] create"
PASSCODE="1234"
PACK_JSON=$(curl -s -X POST "$API/api/share-packs" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $OWNER_ID" \
  -d "{\"personId\":\"${PERSON_ID}\",\"title\":\"Allergy pack\",\"audience\":\"school\",\"items\":[\"${DOC_ID}\"],\"passcode\":\"${PASSCODE}\"}")
echo "$PACK_JSON" | jq .
PACK_ID=$(echo "$PACK_JSON" | jq -r '.shareId // .id // empty')
[ -z "$PACK_ID" -o "$PACK_ID" = "null" ] && { echo "[share] create failed"; exit 1; }
echo "[share] Pack: $PACK_ID"

# ---------- Verify (cookie) ----------
COOKIE=/tmp/evermed_pack_cookie.txt
VERIFY_JSON=$(curl -s -X POST "$API/api/share-packs/${PACK_ID}/verify" \
  -H "Content-Type: application/json" \
  -d "{\"passcode\":\"${PASSCODE}\"}" -c "$COOKIE")
echo "$VERIFY_JSON" | jq .

# ---------- View Pack ----------
VIEW_JSON=$(curl -s "$API/api/share-packs/${PACK_ID}" -b "$COOKIE")
echo "$VIEW_JSON" | jq .
DOCS_LEN=$(echo "$VIEW_JSON" | jq '.documents | length')
[ "$DOCS_LEN" -lt 1 ] && { echo "[share] view had no documents"; exit 1; }

# ---------- Logs & Revoke ----------
LOGS_JSON=$(curl -s "$API/api/share-packs/${PACK_ID}/logs" -H "x-user-id: $OWNER_ID")
echo "$LOGS_JSON" | jq .
curl -s -X POST "$API/api/share-packs/${PACK_ID}/revoke" -H "x-user-id: $OWNER_ID" | jq .
RETRY=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/share-packs/${PACK_ID}" -b "$COOKIE")
echo "[share] post-revoke view status: $RETRY (expected 403)"

echo "== OK =="
echo "OwnerId used: $OWNER_ID"
echo "PersonId used: $PERSON_ID"
echo "DocumentId: $DOC_ID"
echo "PackId:     $PACK_ID"