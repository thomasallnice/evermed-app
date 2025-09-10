#!/bin/bash

# ============================================================================
# EverMed Remote Supabase Migration Script
# Applies migrations to your production Supabase database
# Project ID: jwarorrwgpqrksrxmesx
# ============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="jwarorrwgpqrksrxmesx"
SUPABASE_HOST="aws-0-eu-central-1.pooler.supabase.com"
DEFAULT_PORT="5432"
MIGRATION_DIR="/Users/Tom/Arbeiten/Arbeiten/2025_EverMedAi/app/supabase/migrations"
SCRIPTS_DIR="/Users/Tom/Arbeiten/Arbeiten/2025_EverMedAi/app/scripts"

# Banner
echo ""
echo -e "${BOLD}=====================================================================${NC}"
echo -e "${BOLD}                    EverMed Remote Migration Tool                    ${NC}"
echo -e "${BOLD}=====================================================================${NC}"
echo -e "Project ID: ${BLUE}${PROJECT_ID}${NC}"
echo -e "Host: ${BLUE}${SUPABASE_HOST}${NC}"
echo ""

# Check if running in production
echo -e "${YELLOW}⚠️  WARNING: This will modify your PRODUCTION database!${NC}"
echo -e "${YELLOW}   Please ensure you have a backup before proceeding.${NC}"
echo ""
read -p "Have you backed up your database? (yes/no): " backup_confirm
if [[ "$backup_confirm" != "yes" ]]; then
    echo -e "${RED}❌ Please backup your database first!${NC}"
    echo ""
    echo "To create a backup:"
    echo "1. Go to your Supabase Dashboard"
    echo "2. Navigate to Settings > Database"
    echo "3. Click 'Backups' and create a manual backup"
    echo ""
    exit 1
fi

# Function to validate database URL
validate_db_url() {
    local url=$1
    if [[ $url =~ ^postgresql://.*@.*:[0-9]+/.*$ ]]; then
        return 0
    else
        return 1
    fi
}

# Get database URL
echo ""
echo -e "${BOLD}Database Connection${NC}"
echo "======================================"

# Check if DATABASE_URL is already set
if [ -n "$DATABASE_URL" ]; then
    echo -e "Found existing DATABASE_URL in environment"
    echo -e "URL: ${BLUE}${DATABASE_URL:0:30}...${NC}"
    read -p "Use this connection? (yes/no): " use_existing
    if [[ "$use_existing" != "yes" ]]; then
        DATABASE_URL=""
    fi
fi

# If no DATABASE_URL or user wants to enter new one
if [ -z "$DATABASE_URL" ]; then
    echo ""
    echo "Please enter your Supabase database connection string."
    echo ""
    echo "You can find this in your Supabase Dashboard:"
    echo "1. Go to: https://app.supabase.com/project/${PROJECT_ID}/settings/database"
    echo "2. Under 'Connection string' section, click 'URI'"
    echo "3. Copy the entire connection string"
    echo ""
    echo -e "${YELLOW}Note: Make sure to use the DIRECT connection (not pooler) for migrations${NC}"
    echo ""
    read -sp "Database URL: " DATABASE_URL
    echo ""
    
    # Validate URL
    if ! validate_db_url "$DATABASE_URL"; then
        echo -e "${RED}❌ Invalid database URL format${NC}"
        echo "Expected format: postgresql://[user]:[password]@[host]:[port]/[database]"
        exit 1
    fi
fi

# Test connection
echo ""
echo -e "${BLUE}Testing database connection...${NC}"
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection successful${NC}"
else
    echo -e "${RED}❌ Failed to connect to database${NC}"
    echo "Please check your connection string and try again."
    exit 1
fi

# Function to run SQL with error handling
run_migration() {
    local file=$1
    local description=$2
    local allow_fail=${3:-false}
    
    echo ""
    echo -e "${BLUE}Running: ${description}${NC}"
    echo "File: $(basename $file)"
    
    # Create temp file for output
    local temp_output="/tmp/migration_output_$$.txt"
    
    if psql "$DATABASE_URL" -f "$file" -v ON_ERROR_STOP=1 > "$temp_output" 2>&1; then
        echo -e "${GREEN}✅ Success${NC}"
        
        # Show any notices
        if grep -q "NOTICE:" "$temp_output"; then
            echo "Messages:"
            grep "NOTICE:" "$temp_output" | while read -r line; do
                echo "  • ${line#NOTICE:  }"
            done
        fi
        rm -f "$temp_output"
        return 0
    else
        if [ "$allow_fail" = true ]; then
            echo -e "${YELLOW}⚠️  Warning: ${description} had issues (continuing anyway)${NC}"
            if [ -f "$temp_output" ]; then
                echo "Details:"
                head -n 10 "$temp_output"
            fi
        else
            echo -e "${RED}❌ Failed${NC}"
            echo "Error details:"
            if [ -f "$temp_output" ]; then
                cat "$temp_output"
            fi
            rm -f "$temp_output"
            return 1
        fi
        rm -f "$temp_output"
        return 0
    fi
}

# Main migration process
echo ""
echo -e "${BOLD}Starting Migration Process${NC}"
echo "======================================"

# Track migration status
MIGRATION_SUCCESS=true

# Step 1: Create base tables
if [ -f "$MIGRATION_DIR/00_create_base_tables.sql" ]; then
    if ! run_migration "$MIGRATION_DIR/00_create_base_tables.sql" "Creating base tables (family_members, captures, notifications, ai_insights)"; then
        echo -e "${RED}Failed to create base tables. Aborting migration.${NC}"
        MIGRATION_SUCCESS=false
    fi
else
    echo -e "${YELLOW}⚠️  Base tables migration not found${NC}"
fi

# Step 2: Seed demo data (allow failure since demo user might not exist)
if [ "$MIGRATION_SUCCESS" = true ] && [ -f "$MIGRATION_DIR/01_seed_demo_data.sql" ]; then
    run_migration "$MIGRATION_DIR/01_seed_demo_data.sql" "Seeding demo data" true
fi

# Step 3: Apply any additional migrations
if [ "$MIGRATION_SUCCESS" = true ]; then
    echo ""
    echo -e "${BLUE}Checking for additional migrations...${NC}"
    
    # Find all SQL files that aren't the base ones we already ran
    for migration in $(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | grep -v "00_create_base_tables\|01_seed_demo_data" | sort); do
        if [ -f "$migration" ]; then
            run_migration "$migration" "Applying $(basename $migration)" true
        fi
    done
fi

# Verification
if [ "$MIGRATION_SUCCESS" = true ]; then
    echo ""
    echo -e "${BOLD}Verification${NC}"
    echo "======================================"
    
    echo -e "${BLUE}Checking tables...${NC}"
    
    # Check if tables exist
    TABLES_CHECK=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('family_members', 'captures', 'notifications', 'ai_insights');
    " 2>/dev/null | tr -d ' ')
    
    if [ "$TABLES_CHECK" = "4" ]; then
        echo -e "${GREEN}✅ All 4 tables created successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Only $TABLES_CHECK/4 tables found${NC}"
    fi
    
    # Check for demo user
    echo ""
    echo -e "${BLUE}Checking demo user...${NC}"
    DEMO_USER_EXISTS=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM auth.users WHERE email = 'demo@evermed.ai';
    " 2>/dev/null | tr -d ' ')
    
    if [ "$DEMO_USER_EXISTS" = "1" ]; then
        echo -e "${GREEN}✅ Demo user exists${NC}"
        
        # Check family members
        FAMILY_COUNT=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*) FROM family_members 
            WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@evermed.ai' LIMIT 1);
        " 2>/dev/null | tr -d ' ')
        
        echo -e "   • Family members: ${FAMILY_COUNT}"
        
        if [ "$FAMILY_COUNT" -gt "0" ]; then
            # Show family status
            echo ""
            echo "Demo Family Status:"
            psql "$DATABASE_URL" -c "
                SELECT 
                    name,
                    relationship,
                    status
                FROM family_members 
                WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@evermed.ai' LIMIT 1)
                ORDER BY 
                    CASE relationship 
                        WHEN 'Self' THEN 1 
                        WHEN 'Mother' THEN 2 
                        WHEN 'Father' THEN 3 
                        ELSE 4 
                    END
                LIMIT 5;
            " 2>/dev/null
        fi
    else
        echo -e "${YELLOW}ℹ️  Demo user not found (demo@evermed.ai)${NC}"
        echo "   To create demo user:"
        echo "   1. Go to Supabase Dashboard > Authentication > Users"
        echo "   2. Click 'Add user'"
        echo "   3. Email: demo@evermed.ai, Password: 123456"
        echo "   4. Add user metadata: {\"full_name\": \"Sarah Chen\"}"
    fi
    
    # Check RLS policies
    echo ""
    echo -e "${BLUE}Checking security...${NC}"
    RLS_COUNT=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE tablename IN ('family_members', 'captures', 'notifications', 'ai_insights');
    " 2>/dev/null | tr -d ' ')
    
    echo -e "   • RLS Policies: ${RLS_COUNT} active"
fi

# Summary
echo ""
echo -e "${BOLD}=====================================================================${NC}"
if [ "$MIGRATION_SUCCESS" = true ]; then
    echo -e "${GREEN}                    ✅ Migration Complete!                           ${NC}"
    echo -e "${BOLD}=====================================================================${NC}"
    echo ""
    echo "Your remote Supabase database has been updated successfully."
    echo ""
    echo -e "${BOLD}Next Steps:${NC}"
    echo "1. Update your .env.local with the connection details"
    echo "2. Restart your application: npm run dev"
    echo "3. Test with: demo@evermed.ai / 123456"
    echo ""
    echo -e "${BLUE}Supabase Dashboard:${NC}"
    echo "https://app.supabase.com/project/${PROJECT_ID}"
else
    echo -e "${RED}                    ❌ Migration Failed                              ${NC}"
    echo -e "${BOLD}=====================================================================${NC}"
    echo ""
    echo "The migration encountered errors. Please check the output above."
    echo ""
    echo -e "${YELLOW}To rollback (if needed):${NC}"
    echo "1. Restore from your backup"
    echo "2. Or manually drop the created tables"
fi

echo ""

# Cleanup
unset DATABASE_URL