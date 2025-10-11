#!/bin/bash
set -e

echo "======================================================================"
echo "🚀 Deploying to PRODUCTION Environment"
echo "======================================================================"
echo ""
echo "⚠️  WARNING: This will modify the PRODUCTION database!"
echo ""

PRODUCTION_DB_URL="postgresql://postgres:FFr%23su46VK9mk%25EDu9LaJGMW@db.nqlxlkhbriqztkzwbdif.supabase.co:5432/postgres"

# Safety confirmation
read -p "Have you created a manual backup in Supabase dashboard? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
  echo "❌ Deployment cancelled."
  echo "   Create a manual backup in Supabase dashboard before proceeding."
  exit 1
fi

echo ""
read -p "Has staging deployment been tested and verified? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
  echo "❌ Deployment cancelled."
  echo "   Test staging deployment thoroughly before deploying to production."
  exit 1
fi

echo ""
echo "Proceeding with production deployment..."
echo ""

echo "Step 1: Verify local build..."
echo "----------------------------------------------------------------------"
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Local build failed. Fix errors before deploying."
  exit 1
fi
echo "✅ Local build passed"
echo ""

echo "Step 2: Apply migrations to production database..."
echo "----------------------------------------------------------------------"
DATABASE_URL="$PRODUCTION_DB_URL" npm run prisma:migrate:deploy
if [ $? -ne 0 ]; then
  echo "❌ Migration deployment failed. Check database connection and migration SQL."
  echo "   Production database may be in an inconsistent state!"
  echo "   Restore from backup if necessary."
  exit 1
fi
echo "✅ Migrations applied successfully"
echo ""

echo "Step 3: Verify production schema..."
echo "----------------------------------------------------------------------"
DATABASE_URL="$PRODUCTION_DB_URL" node scripts/test-schema.mjs
if [ $? -ne 0 ]; then
  echo "❌ Schema validation failed. Database schema does not match Prisma schema."
  echo "   Production database may be in an inconsistent state!"
  echo "   Restore from backup if necessary."
  exit 1
fi
echo "✅ Schema validated successfully"
echo ""

echo "======================================================================"
echo "✅ Production database is ready!"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "  1. Deploy code to Vercel production"
echo "  2. Monitor Vercel deployment logs"
echo "  3. Run smoke tests: ./scripts/smoke-e2e.sh --auth"
echo "  4. Monitor Supabase logs for errors"
echo "  5. Verify critical user flows work correctly"
echo ""
echo "If any issues occur:"
echo "  - Restore database from backup (Supabase dashboard)"
echo "  - Revert Vercel deployment to previous version"
echo "  - Investigate root cause before re-attempting"
echo ""
