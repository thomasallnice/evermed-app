#!/bin/bash

# =============================================================================
# Delete ALL Environment Variables from ALL Vercel Environments
# =============================================================================
# WARNING: This will delete ALL environment variables from production, preview, and development
# Make sure you have a backup before running this script!
# =============================================================================

echo "🚨 WARNING: This will delete ALL environment variables from ALL environments"
echo "Environments: production, preview, development"
echo ""
read -p "Have you backed up your variables? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Aborted. Backup your variables first with: vercel env pull .env.backup"
  exit 1
fi

echo ""
read -p "Type 'DELETE ALL' to confirm: " final_confirm

if [ "$final_confirm" != "DELETE ALL" ]; then
  echo "❌ Aborted."
  exit 1
fi

echo ""
echo "🗑️  Starting bulk deletion..."
echo ""

# Get list of all environment variable names
# This extracts just the variable names from vercel env ls
ENV_VARS=$(vercel env ls 2>/dev/null | grep -E "^[A-Z_]" | awk '{print $1}' | sort -u)

if [ -z "$ENV_VARS" ]; then
  echo "✅ No environment variables found (or vercel CLI not authenticated)"
  exit 0
fi

# Count total variables
TOTAL=$(echo "$ENV_VARS" | wc -l | xargs)
echo "📊 Found $TOTAL unique environment variables"
echo ""

# Counter
COUNT=0

# Delete from all environments
for var in $ENV_VARS; do
  COUNT=$((COUNT + 1))
  echo "[$COUNT/$TOTAL] Deleting: $var"

  # Delete from production
  vercel env rm "$var" production --yes 2>/dev/null

  # Delete from preview
  vercel env rm "$var" preview --yes 2>/dev/null

  # Delete from development
  vercel env rm "$var" development --yes 2>/dev/null

  echo "  ✅ Deleted from all environments"
done

echo ""
echo "✅ Bulk deletion complete!"
echo "📊 Deleted $COUNT environment variables from all environments"
echo ""
echo "Next steps:"
echo "1. Import new variables: cat .env.staging | while IFS='=' read -r key value; do [[ ! \"\$key\" =~ ^# && -n \"\$key\" ]] && echo \"\$value\" | vercel env add \"\$key\" preview; done"
echo "2. Redeploy staging: git commit --allow-empty -m 'chore: trigger redeploy' && git push"
