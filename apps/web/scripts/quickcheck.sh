#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:3000"
TOKEN=""
DOC_ID=""

usage() {
  cat <<EOF
Quick environment check for EverMed app.

Usage: $0 [-b base_url] [-t bypass_token] [-d document_id]
  -b  Base URL (default: $BASE)
  -t  Vercel Preview bypass token (adds header)
  -d  Document id to test Explain + RAG ingest

Examples:
  $0 -b http://localhost:3000
  $0 -b https://staging.evermed.ai -t $VERCEL_BYPASS_TOKEN -d <DOC_ID>
EOF
}

while getopts ":b:t:d:h" opt; do
  case $opt in
    b) BASE="$OPTARG" ;;
    t) TOKEN="$OPTARG" ;;
    d) DOC_ID="$OPTARG" ;;
    h) usage; exit 0 ;;
    *) usage; exit 1 ;;
  esac
done

HDR=("-sS")
[[ -n "$TOKEN" ]] && HDR+=("-H" "x-vercel-protection-bypass: $TOKEN")

echo "==> GET /api/health"
curl "${HDR[@]}" "$BASE/api/health" | (command -v jq >/dev/null 2>&1 && jq . || cat)

echo "\n==> GET /api/dev/status (cache-bust)"
TS=$(date +%s)
curl "${HDR[@]}" "$BASE/api/dev/status?ts=$TS" | (command -v jq >/dev/null 2>&1 && jq . || cat)

if [[ -n "$DOC_ID" ]]; then
  echo "\n==> POST /api/explain"
  curl "${HDR[@]}" -H 'Content-Type: application/json' -d "{\"documentId\":\"$DOC_ID\"}" "$BASE/api/explain" | (command -v jq >/dev/null 2>&1 && jq . || cat)

  echo "\n==> POST /api/rag/ingest"
  curl "${HDR[@]}" -H 'Content-Type: application/json' -d "{\"documentId\":\"$DOC_ID\"}" "$BASE/api/rag/ingest" | (command -v jq >/dev/null 2>&1 && jq . || cat)
fi

echo "\nDone."

