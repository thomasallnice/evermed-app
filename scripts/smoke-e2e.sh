#!/usr/bin/env bash
set -euo pipefail

echo "== EverMed Smoke E2E =="

# --- 0) Env checks ---
need() { v="$1"; if [ -z "${!v:-}" ]; then echo "Missing env: $v"; exit 1; fi; }
need SUPABASE_URL
need SUPABASE_ANON_KEY
need SUPABASE_SERVICE_ROLE_KEY
need SUPABASE_DB_URL
need SHARE_LINK_PEPPER

echo "[env] core vars present"

# --- 1) DB migrations ---
echo "[db] migrate deploy"
npx prisma migrate deploy --schema=db/schema.prisma >/dev/null
echo "[db] ok"

# --- 2) Start dev server if not running ---
PORT=3000
if ! nc -z localhost $PORT >/dev/null 2>&1; then
  echo "[web] starting Next dev on :$PORT"
  (cd apps/web && npm run dev >/tmp/evermed-dev.log 2>&1 &) 
  # wait for server
  for i in {1..30}; do
    sleep 1
    if nc -z localhost $PORT >/dev/null 2>&1; then break; fi
  done
fi

if ! nc -z localhost $PORT >/dev/null 2>&1; then
  echo "[web] server did not start; see /tmp/evermed-dev.log"; exit 1
fi
echo "[web] server up at http://localhost:$PORT"

# --- 3) Ensure a Person row (ownerId='test-user') exists ---
echo "[db] ensuring Person row"
PSQL="${DATABASE_URL:-${SUPABASE_DB_URL}}"
# Try to find an existing Person; otherwise create one
PERSON_ID=$(psql "$PSQL" -Atc "select id from \"Person\" where \"ownerId\"='test-user' limit 1" 2>/dev/null || echo "")
if [ -z "$PERSON_ID" ]; then
  PERSON_ID=$(psql "$PSQL" -Atc "insert into \"Person\"(id, \"ownerId\") values (gen_random_uuid(),'test-user') returning id" 2>/dev/null || echo "")
fi
if [ -z "$PERSON_ID" ]; then echo "[db] could not ensure Person row"; exit 1; fi
echo "[db] Person: $PERSON_ID"

# --- 4) Upload a sample PDF ---
PDF_PATH="tests/fixtures/documents/dummy-documents/SAMPLE-ALLERGY-TEST-REPORT.pdf"
if [ ! -f "$PDF_PATH" ]; then
  echo "[upload] missing $PDF_PATH"; exit 1;
fi
echo "[upload] uploading $PDF_PATH"
UPLOAD_JSON=$(curl -s -X POST "http://localhost:$PORT/api/uploads" \
  -H "x-user-id: test-user" \
  -F "personId=${PERSON_ID}" \
  -F "file=@${PDF_PATH}")
echo "$UPLOAD_JSON" | jq .
DOC_ID=$(echo "$UPLOAD_JSON" | jq -r '.documentId // empty')
if [ -z "$DOC_ID" ] || [ "$DOC_ID" = "null" ]; then echo "[upload] failed"; exit 1; fi
echo "[upload] Document: $DOC_ID"

# --- 5) Create a Share Pack with that document ---
echo "[share] create"
PASSCODE=1234
PACK_JSON=$(curl -s -X POST "http://localhost:$PORT/api/share-packs" \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d "{\"personId\":\"${PERSON_ID}\",\"title\":\"Allergy pack\",\"audience\":\"school\",\"items\":[\"${DOC_ID}\"],\"passcode\":\"${PASSCODE}\"}")
echo "$PACK_JSON" | jq .
PACK_ID=$(echo "$PACK_JSON" | jq -r '.shareId // .id // empty')
if [ -z "$PACK_ID" ] || [ "$PACK_ID" = "null" ]; then echo "[share] create failed"; exit 1; fi
echo "[share] Pack: $PACK_ID"

# --- 6) Verify passcode (sets cookie) ---
COOKIE=/tmp/evermed_pack_cookie.txt
VERIFY_JSON=$(curl -s -X POST "http://localhost:$PORT/api/share-packs/${PACK_ID}/verify" \
  -H "Content-Type: application/json" \
  -d "{\"passcode\":\"${PASSCODE}\"}" -c "$COOKIE")
echo "$VERIFY_JSON" | jq .

# --- 7) View pack (should list the doc) ---
VIEW_JSON=$(curl -s "http://localhost:$PORT/api/share-packs/${PACK_ID}" -b "$COOKIE")
echo "$VIEW_JSON" | jq .
DOCS_LEN=$(echo "$VIEW_JSON" | jq '.documents | length')
if [ "$DOCS_LEN" -lt 1 ]; then echo "[share] view had no documents"; exit 1; fi

# --- 8) Chat (simple, will refuse if no citations) ---
if [ -n "${OPENAI_API_KEY:-}" ]; then
  echo "[chat] asking a question"
  CHAT_JSON=$(curl -s -X POST "http://localhost:$PORT/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"question\":\"Summarize my latest lab result\",\"personId\":\"${PERSON_ID}\"}")
  echo "$CHAT_JSON" | jq .
else
  echo "[chat] OPENAI_API_KEY not set; skipping chat test"
fi

# --- 9) Logs & revoke ---
LOGS_JSON=$(curl -s "http://localhost:$PORT/api/share-packs/${PACK_ID}/logs" -H "x-user-id: test-user")
echo "$LOGS_JSON" | jq .
curl -s -X POST "http://localhost:$PORT/api/share-packs/${PACK_ID}/revoke" -H "x-user-id: test-user" | jq .
RETRY=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/share-packs/${PACK_ID}" -b "$COOKIE")
echo "[share] post-revoke view status: $RETRY (expected 403)"

echo "== OK =="