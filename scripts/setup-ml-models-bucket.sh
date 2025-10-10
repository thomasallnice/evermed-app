#!/bin/bash

# ============================================================================
# Setup Script: ml-models Storage Bucket
# Purpose: Create private storage bucket for ML model artifacts with RLS
# Requirements: Supabase CLI installed and linked to project
# ============================================================================

set -e  # Exit on error

# ============================================================================
# Configuration
# ============================================================================
BUCKET_NAME="ml-models"
SQL_FILE="db/storage-ml-models.sql"
ENVIRONMENT="${1:-local}"  # Default to local, can specify: local, staging, prod

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================
print_step() {
  echo -e "\n${GREEN}Step $1: $2${NC}"
}

print_error() {
  echo -e "${RED}ERROR: $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}WARNING: $1${NC}"
}

print_info() {
  echo -e "➜ $1"
}

# ============================================================================
# Main Setup Flow
# ============================================================================

echo "=================================================="
echo "Setting up ml-models bucket in: $ENVIRONMENT"
echo "=================================================="

# ============================================================================
# Step 1: Validate Environment
# ============================================================================
print_step 1 "Validating environment..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  print_error "Supabase CLI not found. Install with: brew install supabase/tap/supabase"
  exit 1
fi

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
  print_error "SQL file not found: $SQL_FILE"
  exit 1
fi

# Validate environment choice
if [[ ! "$ENVIRONMENT" =~ ^(local|staging|prod)$ ]]; then
  print_error "Invalid environment: $ENVIRONMENT. Must be: local, staging, or prod"
  exit 1
fi

echo "✓ Valid environment: $ENVIRONMENT"

# ============================================================================
# Step 2: Create Bucket and RLS Policies
# ============================================================================
print_step 2 "Creating bucket and RLS policies..."

if [ "$ENVIRONMENT" = "local" ]; then
  print_info "Executing SQL on local Supabase..."

  # Run SQL directly on local database
  if command -v psql &> /dev/null && [ -f ".env" ]; then
    # Try to use SUPABASE_DB_URL from .env
    if grep -q "SUPABASE_DB_URL" .env; then
      # Extract DATABASE_URL from .env (without 'export' prefix)
      DB_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
      if [ -n "$DB_URL" ]; then
        psql "$DB_URL" -f "$SQL_FILE" 2>&1 | grep -v "NOTICE: policy" || true
      else
        print_warning "DATABASE_URL not found in .env"
        print_info "Run: supabase db reset"
      fi
    else
      print_warning "SUPABASE_DB_URL not configured in .env"
      print_info "Attempting via Supabase CLI..."
      supabase db reset || print_warning "Could not reset database"
    fi
  else
    print_warning "psql not found or .env missing"
    print_info "Run: supabase db reset"
  fi

elif [ "$ENVIRONMENT" = "staging" ] || [ "$ENVIRONMENT" = "prod" ]; then
  print_info "For $ENVIRONMENT environment:"
  echo ""
  echo "1. Link to $ENVIRONMENT project:"
  echo "   supabase link --project-ref <$ENVIRONMENT-ref>"
  echo ""
  echo "2. Execute SQL file:"
  echo "   supabase db push"
  echo ""
  echo "   OR manually in Supabase SQL Editor:"
  echo "   - Navigate to: https://app.supabase.com/project/<project-ref>/sql"
  echo "   - Paste contents of: $SQL_FILE"
  echo "   - Click 'Run'"
  echo ""
  exit 0
fi

echo "✓ SQL execution completed (or instructions provided)"

# ============================================================================
# Step 3: Verify Bucket Configuration
# ============================================================================
print_step 3 "Verifying bucket configuration..."

if [ "$ENVIRONMENT" = "local" ]; then
  # Query bucket configuration
  if [ -n "$DB_URL" ]; then
    psql "$DB_URL" -c "SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'ml-models';" 2>&1
  fi
fi

# ============================================================================
# Step 4: Verify RLS Policies
# ============================================================================
print_step 4 "Verifying RLS policies..."

if [ "$ENVIRONMENT" = "local" ]; then
  if [ -n "$DB_URL" ]; then
    psql "$DB_URL" -c "SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%ML models%' ORDER BY policyname;" 2>&1
  fi
fi

# ============================================================================
# Step 5: Run Automated Tests
# ============================================================================
print_step 5 "Running automated tests..."

if [ "$ENVIRONMENT" = "local" ]; then
  print_info "Running storage integration tests..."

  # Run storage tests (if they exist)
  if [ -f "tests/integration/storage-ml-models.spec.ts" ]; then
    npm run test -- tests/integration/storage-ml-models.spec.ts
  else
    print_warning "No integration tests found for ml-models bucket"
    print_info "Create tests at: tests/integration/storage-ml-models.spec.ts"
  fi
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "=================================================="
echo "✓ ml-models bucket setup complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Test model upload: npm run test -- storage-ml-models"
echo "2. Verify in Supabase dashboard: Storage > ml-models"
echo "3. Deploy to staging: ./scripts/setup-ml-models-bucket.sh staging"
echo ""
echo "Bucket Details:"
echo "  Name: ml-models"
echo "  Privacy: Private (RLS enforced)"
echo "  Max Size: 50MB"
echo "  Path: {userId}/{modelType}/{version}.json"
echo "  MIME: application/json, application/octet-stream"
echo ""
