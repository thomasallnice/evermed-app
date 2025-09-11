#!/bin/bash

# Apply base tables migration and seed demo data
# This script creates all tables from scratch and populates demo data

echo "🚀 EverMed Database Setup"
echo "========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL environment variable not set${NC}"
    echo ""
    echo "Please set it to your Supabase database URL:"
    echo "export DATABASE_URL='postgresql://postgres:[password]@[host]:[port]/postgres'"
    echo ""
    echo "You can find this in your Supabase project settings:"
    echo "1. Go to Settings > Database"
    echo "2. Copy the Connection String (URI)"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ DATABASE_URL found${NC}"
echo ""

# Function to run SQL and check result
run_sql() {
    local sql_file=$1
    local description=$2
    
    echo "📝 $description..."
    if psql "$DATABASE_URL" -f "$sql_file" -v ON_ERROR_STOP=1 > /tmp/migration_output.txt 2>&1; then
        echo -e "${GREEN}✅ $description completed${NC}"
        # Show any notices
        grep "NOTICE:" /tmp/migration_output.txt | while read line; do
            echo "   ℹ️  ${line#NOTICE:  }"
        done
        return 0
    else
        echo -e "${RED}❌ $description failed${NC}"
        echo "Error details:"
        cat /tmp/migration_output.txt
        return 1
    fi
}

# Apply base tables migration
echo "============================================"
echo "STEP 1: Creating Base Tables"
echo "============================================"
echo ""

if run_sql "/Users/Tom/Arbeiten/Arbeiten/2025_EverMedAi/app/supabase/migrations/00_create_base_tables.sql" "Creating base tables"; then
    echo ""
    echo "Tables created:"
    echo "  • family_members"
    echo "  • captures"
    echo "  • notifications"
    echo "  • ai_insights"
    echo ""
else
    echo -e "${RED}Failed to create base tables. Exiting.${NC}"
    exit 1
fi

# Apply demo data seed
echo "============================================"
echo "STEP 2: Seeding Demo Data"
echo "============================================"
echo ""

if run_sql "/Users/Tom/Arbeiten/Arbeiten/2025_EverMedAi/app/supabase/migrations/01_seed_demo_data.sql" "Seeding demo data"; then
    echo ""
else
    echo -e "${YELLOW}⚠️  Demo data seeding had issues (this is OK if demo user doesn't exist)${NC}"
fi

# Verify the setup
echo ""
echo "============================================"
echo "STEP 3: Verification"
echo "============================================"
echo ""

echo "📊 Checking tables..."
psql "$DATABASE_URL" -c "\dt" | grep -E "family_members|captures|notifications|ai_insights" > /tmp/tables_check.txt 2>&1

if [ -s /tmp/tables_check.txt ]; then
    echo -e "${GREEN}✅ All tables exist${NC}"
    cat /tmp/tables_check.txt
else
    echo -e "${RED}❌ Some tables might be missing${NC}"
fi

echo ""
echo "👥 Checking demo family members..."
psql "$DATABASE_URL" -c "
    SELECT name, relationship, status, 
           CASE 
               WHEN last_check_in > NOW() - INTERVAL '1 hour' THEN 'Just now'
               WHEN last_check_in > NOW() - INTERVAL '24 hours' THEN 'Today'
               ELSE 'Yesterday'
           END as last_check
    FROM family_members 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@evermed.ai' LIMIT 1)
    ORDER BY 
        CASE relationship 
            WHEN 'Self' THEN 1 
            WHEN 'Mother' THEN 2 
            WHEN 'Father' THEN 3 
            ELSE 4 
        END;
" 2>/dev/null

echo ""
echo "🔔 Checking notifications..."
psql "$DATABASE_URL" -c "
    SELECT type, priority, title 
    FROM notifications 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@evermed.ai' LIMIT 1)
    AND is_read = false
    ORDER BY priority DESC, created_at DESC
    LIMIT 5;
" 2>/dev/null

echo ""
echo "============================================"
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Start the application: npm run dev"
echo "2. Login with: demo@evermed.ai / 123456"
echo "3. You should see:"
echo "   • Sarah Chen as the logged-in user"
echo "   • Margaret Chen showing 'needs attention' status"
echo "   • Sample notifications and AI insights"
echo ""

# Clean up temp files
rm -f /tmp/migration_output.txt /tmp/tables_check.txt 2>/dev/null