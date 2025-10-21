#!/bin/bash
set -e

# Sync .env.production to Vercel production environment
# Uses printf instead of echo to avoid newline corruption

echo "======================================================================"
echo "Syncing .env.production to Vercel production environment"
echo "======================================================================"
echo ""
echo "⚠️  Using printf (NOT echo) to avoid newline corruption"
echo ""

ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: $ENV_FILE not found"
  exit 1
fi

# Counter for tracking progress
TOTAL=0
SUCCESS=0
SKIPPED=0
FAILED=0

# Read .env.production line by line
while IFS= read -r line || [ -n "$line" ]; do
  # Skip empty lines and comments
  if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
    continue
  fi

  # Parse KEY=VALUE
  if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
    KEY="${BASH_REMATCH[1]}"
    VALUE="${BASH_REMATCH[2]}"

    TOTAL=$((TOTAL + 1))

    echo "[$TOTAL] Setting $KEY..."

    # Use printf to avoid newline corruption
    if printf '%s' "$VALUE" | vercel env add "$KEY" production --force > /dev/null 2>&1; then
      echo "    ✅ $KEY set successfully"
      SUCCESS=$((SUCCESS + 1))
    else
      echo "    ❌ Failed to set $KEY"
      FAILED=$((FAILED + 1))
    fi
  fi
done < "$ENV_FILE"

echo ""
echo "======================================================================"
echo "Sync Summary"
echo "======================================================================"
echo "Total variables processed: $TOTAL"
echo "✅ Successfully set: $SUCCESS"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 All environment variables synced successfully!"
  exit 0
else
  echo "⚠️  Some variables failed to sync. Please check the errors above."
  exit 1
fi
