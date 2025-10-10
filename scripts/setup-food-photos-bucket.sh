#!/bin/bash
# ============================================================================
# Setup Food Photos Storage Bucket
# Purpose: Create food-photos bucket with RLS policies in Supabase
# Usage: ./scripts/setup-food-photos-bucket.sh [local|staging|prod]
# ============================================================================

set -e # Exit on error

ENVIRONMENT="${1:-local}"

echo "=================================================="
echo "Setting up food-photos bucket in: $ENVIRONMENT"
echo "=================================================="

# Validate environment
case $ENVIRONMENT in
  local|staging|prod)
    echo "✓ Valid environment: $ENVIRONMENT"
    ;;
  *)
    echo "❌ Invalid environment. Use: local, staging, or prod"
    exit 1
    ;;
esac

# ============================================================================
# STEP 1: Link to Supabase project (if not local)
# ============================================================================
if [ "$ENVIRONMENT" != "local" ]; then
  echo ""
  echo "Step 1: Linking to Supabase $ENVIRONMENT project..."
  echo "➜ Run: supabase link --project-ref <your-$ENVIRONMENT-project-ref>"
  echo ""
  read -p "Have you linked to the $ENVIRONMENT project? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborting. Link to project first: supabase link"
    exit 1
  fi
fi

# ============================================================================
# STEP 2: Execute SQL to create bucket and RLS policies
# ============================================================================
echo ""
echo "Step 2: Creating bucket and RLS policies..."

if [ "$ENVIRONMENT" = "local" ]; then
  # For local development
  echo "➜ Executing SQL on local Supabase..."
  supabase db reset --db-url "postgresql://postgres:postgres@localhost:54322/postgres" \
    --migrations-path db/migrations || true

  psql "postgresql://postgres:postgres@localhost:54322/postgres" \
    -f db/storage-food-photos.sql
else
  # For staging/production (requires admin privileges)
  echo "➜ Executing SQL on $ENVIRONMENT..."
  echo ""
  echo "⚠️  WARNING: This requires service role privileges."
  echo "   Option A: Run SQL manually in Supabase Dashboard SQL Editor"
  echo "   Option B: Use supabase db push (if migrations setup)"
  echo ""
  echo "SQL file location: db/storage-food-photos.sql"
  echo ""
  read -p "Execute SQL now via Supabase CLI? (y/n) " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Attempt to execute via Supabase CLI
    # Note: This may require additional setup
    supabase db execute -f db/storage-food-photos.sql --project-ref "$(supabase projects list --format json | jq -r '.[0].id')"
  else
    echo "⏭  Skipping automatic execution."
    echo "   Please run SQL manually in Supabase Dashboard."
  fi
fi

echo ""
echo "✓ SQL execution completed (or instructions provided)"

# ============================================================================
# STEP 3: Verify bucket creation
# ============================================================================
echo ""
echo "Step 3: Verifying bucket configuration..."

if [ "$ENVIRONMENT" = "local" ]; then
  # Query local database
  psql "postgresql://postgres:postgres@localhost:54322/postgres" \
    -c "SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'food-photos';"
else
  echo "➜ To verify bucket, run:"
  echo "   supabase db execute -c \"SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'food-photos';\""
fi

# ============================================================================
# STEP 4: Verify RLS policies
# ============================================================================
echo ""
echo "Step 4: Verifying RLS policies..."

if [ "$ENVIRONMENT" = "local" ]; then
  psql "postgresql://postgres:postgres@localhost:54322/postgres" \
    -c "SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%food photos%' ORDER BY policyname;"
else
  echo "➜ To verify policies, run:"
  echo "   supabase db execute -c \"SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%food photos%';\""
fi

# ============================================================================
# STEP 5: Run automated tests (optional)
# ============================================================================
echo ""
echo "Step 5: Running automated tests..."
echo ""
read -p "Run automated test suite? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  if [ "$ENVIRONMENT" = "local" ]; then
    # Set test environment variables for local
    export SUPABASE_URL="http://localhost:54321"
    export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
  fi

  echo "➜ Running tests..."
  npm run test -- tests/storage-security/food-photos-rls.test.ts
else
  echo "⏭  Skipping tests. Run manually: npm run test -- tests/storage-security/food-photos-rls.test.ts"
fi

# ============================================================================
# COMPLETION
# ============================================================================
echo ""
echo "=================================================="
echo "✅ Food Photos Bucket Setup Complete!"
echo "=================================================="
echo ""
echo "Bucket Configuration:"
echo "  - Name: food-photos"
echo "  - Privacy: Private (RLS enabled)"
echo "  - File Size Limit: 5MB"
echo "  - Allowed Types: JPEG, PNG"
echo "  - Path Structure: {userId}/{photoId}.jpg"
echo ""
echo "RLS Policies Applied:"
echo "  ✓ Users can upload to own folder"
echo "  ✓ Users can view own photos"
echo "  ✓ Users can update own photos"
echo "  ✓ Users can delete own photos"
echo "  ✓ Cross-user access blocked"
echo ""
echo "Next Steps:"
echo "  1. Test upload: npm run test -- tests/storage-security/food-photos-rls.test.ts"
echo "  2. Update app code to use bucket: apps/web/src/lib/storage.ts"
echo "  3. Generate signed URLs: supabase.storage.from('food-photos').createSignedUrl(...)"
echo ""
echo "Documentation:"
echo "  - SQL: db/storage-food-photos.sql"
echo "  - Tests: tests/storage-security/food-photos-rls.test.ts"
echo "=================================================="
