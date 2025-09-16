#!/usr/bin/env bash
set -euo pipefail

echo "== EverMed Smoke E2E (owner-aware) =="

# ---------- Config ----------
API="http://localhost:3000"
PSQL_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
PDF_PATH="${1:-tests/fixtures/documents/dummy-documents/SAMPLE-ALLERGY-TEST-REPORT.pdf}"

OWNER_ID="test-user"   # force to test-user in dev/demo
PASSCODE="1234"
COOKIE=/tmp/evermed_pack_cookie.txt

# ---------- Sanity ----------
need() { v="$1"; if [ -z "${!v:-}" ]; then echo "Missing env: $v"; exit 1; fi; }
need PSQL_URL

if [ ! -f "$PDF_PATH" ]; then
  echo "[error] PDF not found: $PDF_PATH"
  echo "Usage: $0 [path/to/pdf]"; exit 1
fi

# ---------- Ensure Person ----------
echo "[db] resolving Person & ownerId=${OWNER_ID}"

PERSON_ID=$(psql "$PSQL_URL" -Atc "select id from \"Person\" where \"ownerId\"='${OWNER_ID}' limit 1" | tr -d '[:space:]')

if [ -z "$PERSON_ID" ]; then
  echo "[db] no Person found, creating one..."
  PERSON_ID=$(psql "$PSQL_URL" -Atc "insert into \"Person\"(id, \"ownerId\") values (gen_random_uuid(),'${OWNER_ID}') returning id" | tr -d '[:space:]')
fi

if [ -z "$PERSON_ID" ]; then
  echo "[db] ERROR: failed to ensure Person"; exit 1
fi

echo "[db] Person:  $PERSON_ID"
echo "[db] OwnerId: $OWNER_ID"

# ---------- Ensure server ----------
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
DOC_RAW=$(curl -s -w "\n%{http_code}" "$API/api/documents/${DOC_ID}" -H "x-user-id: $OWNER_ID")
DOC_STATUS=$(printf '%s' "$DOC_RAW" | tail -n 1)
DOC_BODY=$(printf '%s' "$DOC_RAW" | sed '$d')

if ! echo "$DOC_BODY" | jq . 2>/dev/null; then
  echo "[doc] non-JSON response: $DOC_BODY"
fi

if [ "$DOC_STATUS" -ne 200 ]; then
  echo "[doc] ERROR: /api/documents returned HTTP $DOC_STATUS"
  exit 1
fi

SIGNED_URL=$(echo "$DOC_BODY" | jq -r '.signedUrl // empty' 2>/dev/null || echo '')
[ -z "$SIGNED_URL" -o "$SIGNED_URL" = "null" ] && { echo "[doc] missing signedUrl (forbidden or config?)"; exit 1; }
echo "[doc] signedUrl ok"

# ---------- Create Share Pack ----------
echo "[share] create"
PACK_JSON=$(curl -s -X POST "$API/api/share-packs" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $OWNER_ID" \
  -d "{\"personId\":\"${PERSON_ID}\",\"title\":\"Allergy pack\",\"audience\":\"school\",\"items\":[\"${DOC_ID}\"],\"passcode\":\"${PASSCODE}\"}")
echo "$PACK_JSON" | jq .
PACK_ID=$(echo "$PACK_JSON" | jq -r '.shareId // .id // empty')
[ -z "$PACK_ID" -o "$PACK_ID" = "null" ] && { echo "[share] create failed"; exit 1; }
echo "[share] Pack: $PACK_ID"

# ---------- Verify (cookie) ----------
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
echo "DocumentId:   $DOC_ID"
echo "PackId:       $PACK_ID"
