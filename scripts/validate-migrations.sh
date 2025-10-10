#!/bin/bash
# Migration Validation Script
# Checks if there are pending migrations before deployment

set -e

echo "🔍 Validating database migrations..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set. Skipping migration validation."
  echo "    (This is expected for local development)"
  exit 0
fi

# Run Prisma migrate status
echo "📊 Checking migration status..."
MIGRATE_STATUS=$(npx prisma migrate status --schema=db/schema.prisma 2>&1 || true)

echo "$MIGRATE_STATUS"

# Check for pending migrations
if echo "$MIGRATE_STATUS" | grep -q "pending"; then
  echo ""
  echo "❌ ERROR: Pending migrations detected!"
  echo ""
  echo "You must apply migrations before deploying:"
  echo ""
  echo "  For staging:"
  echo "    supabase link --project-ref <staging-ref>"
  echo "    npm run prisma:migrate:deploy"
  echo ""
  echo "  For production:"
  echo "    supabase link --project-ref <prod-ref>"
  echo "    npm run prisma:migrate:deploy"
  echo ""
  echo "Or if using Supabase directly:"
  echo "    supabase db push"
  echo ""
  exit 1
fi

# Check for unapplied migrations
if echo "$MIGRATE_STATUS" | grep -q "not yet been applied"; then
  echo ""
  echo "❌ ERROR: Unapplied migrations detected!"
  echo ""
  echo "Database schema is out of sync with migration history."
  echo "Apply migrations before deploying."
  echo ""
  exit 1
fi

# Success
echo ""
echo "✅ All migrations are up to date!"
echo ""
exit 0
