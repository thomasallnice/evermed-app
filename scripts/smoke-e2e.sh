#!/usr/bin/env bash
set -euo pipefail

echo "== EverMed Smoke E2E =="

# ---------- Config ----------
API="http://localhost:3000"
PSQL_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
PDF_PATH="${1:-tests/fixtures/documents/dummy-documents/SAMPLE-ALLERGY-TEST-REPORT.pdf}"

OWNER_ID="test-user"   # dev bypass for smoke tests
PASSCODE="1234"
COOKIE=/tmp/evermed_pack_cookie.txt

# ---------- Helpers ----------
need() { v="$1"; if [ -z "${!v:-}" ]; then echo "Missing env: $v"; exit 1; fi; }
need PSQL_URL

if [ ! -f "$PDF_PATH" ]; then
  echo "[error] PDF not found: $PDF_PATH"
  exit 1
fi

# ---------- Ensure Person ----------
echo "[db] resolving Person for $OWNER_ID"
PERSON_ID=$(psql "$PSQL_URL" -Atc "select id from \"Person\" where \"ownerId\"='${OWNER_ID}' limit 1" | tr -d '[:space:]')
if [ -z "$PERSON_ID" ]; then
  PERSON_ID=$(psql "$PSQL_URL" -Atc "insert into \"Person\"(id, \"ownerId\") values (gen_random_uuid(),'${OWNER_ID}') returning id" | tr -d '[:space:]')
fi
echo "[db] Person: $PERSON_ID"

# ---------- Upload ----------
echo "[upload] uploading $PDF_PATH"
UPLOAD_RAW=$(curl -s -w "\n%{http_code}" -X POST "$API/api/uploads" \
  -H "x-user-id: $OWNER_ID" \
  -F "personId=${PERSON_ID}" \
  -F "file=@${PDF_PATH}")
UPLOAD_STATUS=$(echo "$UPLOAD_RAW" | tail -n1)
UPLOAD_BODY=$(echo "$UPLOAD_RAW" | sed '$d')
[ "$UPLOAD_STATUS" -ne 200 ] && { echo "[upload] ERROR: $UPLOAD_BODY"; exit 1; }

DOC_ID=$(echo "$UPLOAD_BODY" | jq -r '.documentId // empty')
[ -z "$DOC_ID" ] && { echo "[upload] missing documentId"; exit 1; }
echo "[upload] DocumentId: $DOC_ID"

# ---------- Embedding check ----------
echo "[embedding] verifying embeddings for $DOC_ID"
EMBED_COUNT=$(psql "$PSQL_URL" -Atc "select count(*) from \"DocChunk\" where \"documentId\"='${DOC_ID}' and embedding is not null")
if [ "$EMBED_COUNT" -eq 0 ]; then
  echo "[embedding] ERROR: no embeddings found"
  exit 1
fi
echo "[embedding] $EMBED_COUNT chunks with embeddings found ✅"

# ---------- OCR + Embedding Preview ----------
echo "[ocr+embedding] fetching preview chunk for $DOC_ID"
PREVIEW=$(psql "$PSQL_URL" -Atc "
  select left(text, 80)
  from \"DocChunk\"
  where \"documentId\"='${DOC_ID}' and embedding is not null and length(text) > 0
  limit 1;
")
if [ -z "$PREVIEW" ]; then
  echo "[ocr+embedding] ERROR: no DocChunk with text+embedding found"
  exit 1
fi
echo "[ocr+embedding] sample chunk text: $PREVIEW"

# ---------- OCR text check ----------
echo "[ocr] verifying OCR text chunks exist for $DOC_ID"
OCR_COUNT=$(psql "$PSQL_URL" -Atc "select count(*) from \"DocChunk\" where \"documentId\"='${DOC_ID}' and length(text) > 0")
if [ "$OCR_COUNT" -eq 0 ]; then
  echo "[ocr] ERROR: no OCR text found in DocChunks"
  exit 1
fi
echo "[ocr] $OCR_COUNT chunks with OCR text found ✅"

# ---------- Document signed URL ----------
echo "[doc] fetching signed URL"
DOC_JSON=$(curl -s "$API/api/documents/${DOC_ID}" -H "x-user-id: $OWNER_ID")
echo "$DOC_JSON" | jq .
SIGNED_URL=$(echo "$DOC_JSON" | jq -r '.signedUrl // empty')
[ -z "$SIGNED_URL" ] && { echo "[doc] missing signedUrl"; exit 1; }
echo "[doc] signedUrl ok"

# ---------- Share Pack ----------
echo "[share] creating pack"
PACK_JSON=$(curl -s -X POST "$API/api/share-packs" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $OWNER_ID" \
  -d "{\"personId\":\"${PERSON_ID}\",\"title\":\"Allergy pack\",\"audience\":\"school\",\"items\":[\"${DOC_ID}\"],\"passcode\":\"${PASSCODE}\"}")
echo "$PACK_JSON" | jq .
PACK_ID=$(echo "$PACK_JSON" | jq -r '.shareId // empty')
[ -z "$PACK_ID" ] && { echo "[share] create failed"; exit 1; }
echo "[share] Pack: $PACK_ID"

# ---------- Chat ----------
echo "[chat] asking question"
CHAT_JSON=$(curl -s -X POST "$API/api/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $OWNER_ID" \
  -d "{\"question\":\"What is in my lab report?\",\"personId\":\"${PERSON_ID}\"}")
echo "$CHAT_JSON" | jq .
if echo "$CHAT_JSON" | jq -e '.error' >/dev/null; then
  echo "[chat] ERROR: $(echo "$CHAT_JSON" | jq -r '.error')"
  exit 1
fi
echo "[chat] response ok ✅"

# ---------- Revoke ----------
echo "[share] revoking pack"
curl -s -X POST "$API/api/share-packs/${PACK_ID}/revoke" -H "x-user-id: $OWNER_ID" | jq .
RETRY=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/share-packs/${PACK_ID}" -b "$COOKIE")
[ "$RETRY" -ne 403 ] && { echo "[share] revoke failed"; exit 1; }
echo "[share] revoked ok"

echo "== OK =="
echo "OwnerId:   $OWNER_ID"
echo "PersonId:  $PERSON_ID"
echo "DocumentId:$DOC_ID"
echo "PackId:    $PACK_ID"
echo "Embeddings:$EMBED_COUNT"

# ---------- ChatMessage relation test ----------
echo "[chatmsg] inserting a dummy ChatMessage for $DOC_ID"
CHATMSG_ID=$(psql "$PSQL_URL" -Atc "
  insert into \"ChatMessage\" (id, \"userId\", content, \"documentId\") 
  values (gen_random_uuid(), '${OWNER_ID}', 'Test message linked to doc', '${DOC_ID}')
  returning id;
")
if [ -z \"$CHATMSG_ID\" ]; then
  echo "[chatmsg] ERROR: failed to insert ChatMessage"
  exit 1
fi
echo "[chatmsg] Created ChatMessage: $CHATMSG_ID"

echo "[chatmsg] verifying ChatMessage is linked to Document"
MSG_CONTENT=$(psql "$PSQL_URL" -Atc "
  select content 
  from \"ChatMessage\" 
  where id='${CHATMSG_ID}' and \"documentId\"='${DOC_ID}'
  limit 1;
")
if [ -z \"$MSG_CONTENT\" ]; then
  echo "[chatmsg] ERROR: no ChatMessage found linked to $DOC_ID"
  exit 1
fi
echo "[chatmsg] Verified ChatMessage linked: $MSG_CONTENT"