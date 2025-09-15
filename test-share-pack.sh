#!/usr/bin/env bash
set -euo pipefail

# --- Config ---
PERSON_ID="f1e295b8-b33d-42dc-bc0b-245131cf9aaa"   # replace with your actual Person.id
PASSCODE="1234"
COOKIE_FILE="/tmp/pack_cookie.txt"

echo "👉 Using PERSON_ID=$PERSON_ID"

# 1. Upload a test document
echo "📤 Uploading test document..."
UPLOAD=$(curl -s -X POST http://localhost:3000/api/uploads \
  -H "x-user-id: test-user" \
  -F "personId=${PERSON_ID}" \
  -F "file=@tests/fixtures/documents/dummy-documents/SAMPLE-ALLERGY-TEST-REPORT.pdf")

DOC_ID=$(echo "$UPLOAD" | jq -r '.documentId')
echo "✅ Uploaded DocumentId=$DOC_ID"

# 2. Create a share pack
echo "📦 Creating share pack..."
PACK=$(curl -s -X POST http://localhost:3000/api/share-packs \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d "{
    \"personId\":\"${PERSON_ID}\",
    \"title\":\"Allergy pack\",
    \"audience\":\"school\",
    \"items\":[\"${DOC_ID}\"],
    \"passcode\":\"${PASSCODE}\"
  }")

PACK_ID=$(echo "$PACK" | jq -r '.shareId')
echo "✅ Created SharePackId=$PACK_ID"

# 3. Verify passcode (sets cookie)
echo "🔑 Verifying pack with passcode..."
curl -s -X POST "http://localhost:3000/api/share-packs/${PACK_ID}/verify" \
  -H "Content-Type: application/json" \
  -d "{\"passcode\":\"${PASSCODE}\"}" \
  -c "$COOKIE_FILE" | jq
echo "✅ Verified, cookie saved to $COOKIE_FILE"

# 4. View pack (with cookie)
echo "👀 Viewing pack..."
curl -s "http://localhost:3000/api/share-packs/${PACK_ID}" \
  -b "$COOKIE_FILE" | jq

# 5. Fetch logs (owner-only)
echo "📑 Fetching logs..."
curl -s "http://localhost:3000/api/share-packs/${PACK_ID}/logs" \
  -H "x-user-id: test-user" | jq

# 6. Revoke the pack
echo "⛔ Revoking pack..."
curl -s -X POST "http://localhost:3000/api/share-packs/${PACK_ID}/revoke" \
  -H "x-user-id: test-user" | jq
echo "✅ Pack revoked"

# 7. Try to view again (should fail)
echo "👀 Trying to view revoked pack..."
curl -i "http://localhost:3000/api/share-packs/${PACK_ID}" \
  -b "$COOKIE_FILE"