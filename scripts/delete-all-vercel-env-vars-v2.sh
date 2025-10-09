#!/bin/bash

# =============================================================================
# Delete ALL Environment Variables from ALL Vercel Environments (v2)
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

# Get unique variable names from vercel env ls output
# Skip header rows and extract just the variable names (first column)
ENV_VARS=$(vercel env ls 2>&1 | tail -n +2 | grep -v "^>" | grep -v "^Vercel" | grep -v "^Retrieving" | awk '{print $1}' | grep -v "^$" | sort -u)

if [ -z "$ENV_VARS" ]; then
  echo "❌ No environment variables found"
  exit 1
fi

# Count total unique variables
TOTAL=$(echo "$ENV_VARS" | wc -l | xargs)
echo "📊 Found $TOTAL unique environment variables"
echo ""

# Counter
COUNT=0
DELETED=0

# Delete from all environments
for var in $ENV_VARS; do
  COUNT=$((COUNT + 1))
  echo "[$COUNT/$TOTAL] Deleting: $var"

  # Track if at least one deletion succeeded
  SUCCESS=false

  # Delete from production
  if vercel env rm "$var" production --yes 2>/dev/null; then
    SUCCESS=true
  fi

  # Delete from preview
  if vercel env rm "$var" preview --yes 2>/dev/null; then
    SUCCESS=true
  fi

  # Delete from development
  if vercel env rm "$var" development --yes 2>/dev/null; then
    SUCCESS=true
  fi

  if [ "$SUCCESS" = true ]; then
    echo "  ✅ Deleted from all environments"
    DELETED=$((DELETED + 1))
  else
    echo "  ⚠️  Variable not found or already deleted"
  fi
done

echo ""
echo "✅ Bulk deletion complete!"
echo "📊 Successfully deleted $DELETED out of $COUNT environment variables"
echo ""
echo "Next steps:"
echo "1. Import staging variables:"
echo "   cat .env.staging | while IFS='=' read -r key value; do"
echo "     [[ ! \"\$key\" =~ ^# && -n \"\$key\" ]] && echo \"\$value\" | vercel env add \"\$key\" preview --yes"
echo "   done"
echo ""
echo "2. Redeploy staging:"
echo "   git commit --allow-empty -m 'chore: trigger redeploy' && git push origin staging"
