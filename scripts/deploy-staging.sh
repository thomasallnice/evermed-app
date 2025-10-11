#!/bin/bash
set -e

echo "======================================================================"
echo "🚀 Deploying to STAGING Environment"
echo "======================================================================"
echo ""

STAGING_DB_URL="postgres://postgres:PX%3F%26onwW4n36d%3FCr3nHsnM7r@db.jwarorrwgpqrksrxmesx.supabase.co:5432/postgres"

echo "Step 1: Verify local build..."
echo "----------------------------------------------------------------------"
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Local build failed. Fix errors before deploying."
  exit 1
fi
echo "✅ Local build passed"
echo ""

echo "Step 2: Apply migrations to staging database..."
echo "----------------------------------------------------------------------"
DATABASE_URL="$STAGING_DB_URL" npm run prisma:migrate:deploy
if [ $? -ne 0 ]; then
  echo "❌ Migration deployment failed. Check database connection and migration SQL."
  exit 1
fi
echo "✅ Migrations applied successfully"
echo ""

echo "Step 3: Verify staging schema..."
echo "----------------------------------------------------------------------"
DATABASE_URL="$STAGING_DB_URL" node scripts/test-schema.mjs
if [ $? -ne 0 ]; then
  echo "❌ Schema validation failed. Database schema does not match Prisma schema."
  echo "   Review migration SQL and fix schema drift."
  exit 1
fi
echo "✅ Schema validated successfully"
echo ""

echo "======================================================================"
echo "✅ Staging database is ready!"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "  1. Deploy code to Vercel staging"
echo "  2. Run smoke tests: ./scripts/smoke-e2e.sh"
echo "  3. Verify critical user flows work correctly"
echo "  4. If successful, proceed to production deployment"
echo ""
