#!/bin/bash
# =============================================================================
# GlucoLens Smart Pivot Execution Script
# =============================================================================
# This script executes Option B: Smart Simplification Pivot
# - Deletes health vault features only
# - Keeps metabolic insights (85% complete, working in dev)
# - Rebrands to GlucoLens
# - Timeline: 2-3 weeks to production
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# CONFIGURATION
# =============================================================================
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}GlucoLens Smart Pivot Execution${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# =============================================================================
# PRE-FLIGHT CHECKS
# =============================================================================
echo -e "${YELLOW}Step 1: Pre-flight Checks${NC}"

# Check we're on dev branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "dev" ]; then
  echo -e "${RED}ERROR: Must be on 'dev' branch. Currently on: $CURRENT_BRANCH${NC}"
  exit 1
fi
echo -e "${GREEN}✓ On dev branch${NC}"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo -e "${YELLOW}⚠ Warning: Uncommitted changes detected${NC}"
  echo "Commit or stash changes before proceeding?"
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
echo -e "${GREEN}✓ Git status OK${NC}"

# Check Supabase CLI installed
if ! command -v supabase &> /dev/null; then
  echo -e "${RED}ERROR: Supabase CLI not installed${NC}"
  echo "Install with: brew install supabase/tap/supabase"
  exit 1
fi
echo -e "${GREEN}✓ Supabase CLI installed${NC}"

# Check Node.js and npm
if ! command -v node &> /dev/null; then
  echo -e "${RED}ERROR: Node.js not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

echo ""

# =============================================================================
# STEP 1: DATABASE BACKUP
# =============================================================================
echo -e "${YELLOW}Step 2: Creating Database Backup${NC}"

# Create backups directory
mkdir -p "$BACKUP_DIR"

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${YELLOW}⚠ DATABASE_URL not set in environment${NC}"
  echo "Loading from .env.local..."

  if [ -f "$PROJECT_ROOT/.env.local" ]; then
    export $(grep "^DATABASE_URL=" "$PROJECT_ROOT/.env.local" | xargs)
  else
    echo -e "${RED}ERROR: .env.local not found${NC}"
    exit 1
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${RED}ERROR: DATABASE_URL not found${NC}"
  exit 1
fi

echo "Database: ${DATABASE_URL%%@*}@***"

# Create backup filename
BACKUP_FILE="$BACKUP_DIR/backup_before_glucolens_pivot_$TIMESTAMP.sql"

echo "Creating backup at: $BACKUP_FILE"
echo "This may take a few minutes..."

# Create backup (suppress password prompt by using DATABASE_URL)
if pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}✓ Backup created successfully ($BACKUP_SIZE)${NC}"
else
  echo -e "${RED}ERROR: Backup failed${NC}"
  echo "Check DATABASE_URL and network connectivity"
  exit 1
fi

echo ""

# =============================================================================
# STEP 2: APPLY SURGICAL MIGRATION
# =============================================================================
echo -e "${YELLOW}Step 3: Applying Surgical Database Migration${NC}"

MIGRATION_FILE="$PROJECT_ROOT/migrations/20251015_glucolens_smart_pivot.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo -e "${RED}ERROR: Migration file not found: $MIGRATION_FILE${NC}"
  exit 1
fi

echo "Migration: $MIGRATION_FILE"
echo ""
echo -e "${RED}⚠ WARNING: This will DROP health vault tables:${NC}"
echo "  - documents"
echo "  - doc_chunks"
echo "  - observations"
echo "  - share_packs"
echo "  - share_pack_items"
echo "  - share_events"
echo "  - chat_messages"
echo ""
echo -e "${GREEN}This will PRESERVE metabolic tables:${NC}"
echo "  - food_entries, food_photos, food_ingredients"
echo "  - glucose_readings, glucose_predictions"
echo "  - personal_models, metabolic_insights"
echo "  - All other GlucoLens core tables"
echo ""
echo "Backup location: $BACKUP_FILE"
echo ""

read -p "Apply migration? (yes/NO): " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
  echo "Migration cancelled"
  exit 0
fi

echo "Applying migration..."
if psql "$DATABASE_URL" < "$MIGRATION_FILE" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Migration applied successfully${NC}"
else
  echo -e "${RED}ERROR: Migration failed${NC}"
  echo "Database may be in inconsistent state"
  echo "Restore from backup: psql \$DATABASE_URL < $BACKUP_FILE"
  exit 1
fi

echo ""

# =============================================================================
# STEP 3: DELETE HEALTH VAULT CODE
# =============================================================================
echo -e "${YELLOW}Step 4: Deleting Health Vault Code${NC}"

# Routes to delete
ROUTES_TO_DELETE=(
  "apps/web/src/app/vault"
  "apps/web/src/app/chat"
  "apps/web/src/app/packs"
  "apps/web/src/app/share"
)

for route in "${ROUTES_TO_DELETE[@]}"; do
  if [ -d "$PROJECT_ROOT/$route" ]; then
    echo "Deleting: $route"
    rm -rf "$PROJECT_ROOT/$route"
  fi
done

# API routes to delete
API_ROUTES_TO_DELETE=(
  "apps/web/src/app/api/documents"
  "apps/web/src/app/api/uploads"
  "apps/web/src/app/api/ocr"
  "apps/web/src/app/api/chat"
  "apps/web/src/app/api/explain"
  "apps/web/src/app/api/share-packs"
)

for route in "${API_ROUTES_TO_DELETE[@]}"; do
  if [ -d "$PROJECT_ROOT/$route" ] || [ -f "$PROJECT_ROOT/$route" ]; then
    echo "Deleting: $route"
    rm -rf "$PROJECT_ROOT/$route"
  fi
done

echo -e "${GREEN}✓ Health vault code deleted${NC}"
echo ""

# =============================================================================
# STEP 4: REBRANDING
# =============================================================================
echo -e "${YELLOW}Step 5: Rebranding EverMed → GlucoLens${NC}"

echo "This will be done in subsequent commits"
echo "Tasks:"
echo "  - Update package.json name and description"
echo "  - Update app manifest (PWA)"
echo "  - Update UI text and branding"
echo "  - Update color scheme to blue primary"
echo "  - Update README and documentation"
echo ""

# =============================================================================
# STEP 5: NPM CLEANUP
# =============================================================================
echo -e "${YELLOW}Step 6: Cleaning Up Unused Dependencies${NC}"

# Dependencies to remove (health vault specific)
DEPS_TO_REMOVE=(
  "pdf-parse"
  "pdfjs-dist"
  "canvas"
)

echo "Dependencies to remove:"
for dep in "${DEPS_TO_REMOVE[@]}"; do
  echo "  - $dep"
done
echo ""

read -p "Remove unused dependencies? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  cd "$PROJECT_ROOT"
  for dep in "${DEPS_TO_REMOVE[@]}"; do
    if npm list "$dep" &> /dev/null; then
      echo "Removing: $dep"
      npm uninstall "$dep"
    fi
  done
  echo -e "${GREEN}✓ Dependencies cleaned${NC}"
fi

echo ""

# =============================================================================
# STEP 6: REGENERATE PRISMA CLIENT
# =============================================================================
echo -e "${YELLOW}Step 7: Regenerating Prisma Client${NC}"

cd "$PROJECT_ROOT"
npm run prisma:generate
echo -e "${GREEN}✓ Prisma client regenerated${NC}"

echo ""

# =============================================================================
# STEP 7: BUILD TEST
# =============================================================================
echo -e "${YELLOW}Step 8: Testing Build${NC}"

cd "$PROJECT_ROOT"
if npm run build; then
  echo -e "${GREEN}✓ Build successful${NC}"
else
  echo -e "${RED}ERROR: Build failed${NC}"
  echo "Fix errors before deploying"
  exit 1
fi

echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Smart Pivot Execution Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Completed tasks:"
echo -e "${GREEN}✓${NC} Database backup created"
echo -e "${GREEN}✓${NC} Health vault tables dropped"
echo -e "${GREEN}✓${NC} Metabolic tables preserved"
echo -e "${GREEN}✓${NC} Health vault code deleted"
echo -e "${GREEN}✓${NC} Build test passed"
echo ""
echo "Next steps:"
echo "1. Review git changes: git status"
echo "2. Commit changes: git add . && git commit -m 'pivot: delete health vault, keep metabolic features'"
echo "3. Complete rebranding (EverMed → GlucoLens)"
echo "4. Fix admin authentication"
echo "5. Deploy to staging"
echo "6. Recruit beta users"
echo ""
echo "Backup location: $BACKUP_FILE"
echo ""
echo -e "${BLUE}Ready to continue? Next: Rebranding commit${NC}"
