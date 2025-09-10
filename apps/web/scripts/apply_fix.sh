#!/bin/bash

# Apply schema fix and demo data
# This script applies the migration to fix missing fields and add demo data

echo "🔧 Applying schema fix and demo data..."
echo "====================================="
echo ""

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable not set"
    echo "Please set it to your Supabase database URL"
    echo "Example: export DATABASE_URL='postgresql://...''"
    exit 1
fi

# Apply the migration
echo "📝 Applying migration..."
psql "$DATABASE_URL" < /Users/Tom/Arbeiten/Arbeiten/2025_EverMedAi/app/supabase/migrations/20250112_fix_schema_and_add_demo_data.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📊 Verifying changes..."
    
    # Check if fields were added
    psql "$DATABASE_URL" -c "\d family_members" | grep -E "peace_status|last_check_in"
    
    # Check if demo data was created
    echo ""
    echo "👥 Demo family members:"
    psql "$DATABASE_URL" -c "SELECT name, relationship, peace_status, last_check_in FROM family_members WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@evermed.ai' LIMIT 1);"
    
    echo ""
    echo "✅ Fix applied successfully!"
    echo ""
    echo "You can now:"
    echo "1. Start the app: npm run dev"
    echo "2. Login with: demo@evermed.ai / 123456"
    echo "3. You should see Sarah Chen and family members with proper statuses"
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi