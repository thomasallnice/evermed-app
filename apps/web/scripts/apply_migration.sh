#!/bin/bash

# Script to apply simplification migration to Supabase
# This will transform the database from complex medical management to simple peace-of-mind MVP

echo "🚀 Starting EverMed database simplification..."
echo "⚠️  WARNING: This will remove complex medical features and simplify the schema"
echo ""

# Get database connection URL
DB_URL="postgresql://postgres.jwarorrwgpqrksrxmesx:zwRCJH1K3rH78Wl7@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ psql command not found. Please install PostgreSQL client tools."
    echo "   On macOS: brew install postgresql"
    echo "   On Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

echo "📋 Migration will perform the following:"
echo "  1. Remove medication-related tables (6 tables)"
echo "  2. Remove health_records table"
echo "  3. Simplify family_members table"
echo "  4. Rename documents to captures for photos/videos"
echo "  5. Add new peace_status tracking"
echo "  6. Add notifications system"
echo "  7. Add AI insights storage"
echo ""

read -p "Do you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "🔄 Applying migration..."

# Apply the migration
psql "$DB_URL" -f supabase/migrations/20250112000000_simplify_for_mvp.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📊 Database has been simplified for MVP:"
    echo "  - Complex medical tracking removed"
    echo "  - Simple peace-of-mind tracking added"
    echo "  - AI-ready capture system implemented"
    echo ""
    echo "🎯 Next steps:"
    echo "  1. Update frontend types to match new schema"
    echo "  2. Update API endpoints"
    echo "  3. Test the simplified functionality"
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi