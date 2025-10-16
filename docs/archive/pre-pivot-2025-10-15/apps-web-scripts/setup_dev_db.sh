#!/bin/bash

# Setup Development Database Script
# This creates all tables and demo data for EverMed

echo "🚀 Setting up EverMed Development Database..."
echo ""

# Check if we have a database URL
if [ -z "$1" ]; then
    echo "Usage: ./setup_dev_db.sh <DATABASE_URL>"
    echo ""
    echo "You can find your database URL in Supabase Dashboard:"
    echo "Settings → Database → Connection String (URI)"
    echo ""
    echo "Example:"
    echo "./setup_dev_db.sh 'postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres'"
    exit 1
fi

DATABASE_URL=$1

# Run the SQL file
echo "📦 Creating tables and demo data..."
psql "$DATABASE_URL" -f supabase/setup_dev_database.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup complete!"
    echo ""
    echo "You can now log in with:"
    echo "📧 Email: demo@evermed.ai"
    echo "🔑 Password: 123456"
    echo ""
    echo "Family members created:"
    echo "👵 Margaret Thompson (Mum, 75) - needs attention"
    echo "👴 Robert Thompson (Dad, 78) - all well"
    echo "👦 Peter Chen (Son, 15) - all well"
    echo "👧 Nelly Chen (Daughter, 7) - all well"
else
    echo ""
    echo "❌ Setup failed. Please check your database URL and try again."
    exit 1
fi
