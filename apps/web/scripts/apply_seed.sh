#!/bin/bash

# Script to apply demo seed data to Supabase
# This creates a demo user and sample data for testing

echo "🌱 EverMed Demo Data Seeder"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "supabase/seed.sql" ]; then
    echo -e "${RED}❌ Error: seed.sql not found!${NC}"
    echo "Please run this script from the app directory"
    exit 1
fi

echo "📋 This script will create:"
echo "  • Demo user: demo@evermed.ai (password: 123456)"
echo "  • User profile: Sarah Chen"
echo "  • 4 family members with different statuses"
echo "  • Sample captures and AI insights"
echo "  • Check-in notifications"
echo ""

# Choose environment
echo "Select environment:"
echo "1) Local Supabase (supabase start required)"
echo "2) Remote Supabase (production/staging)"
echo -n "Enter choice [1-2]: "
read choice

case $choice in
    1)
        echo -e "${YELLOW}🔧 Applying to local Supabase...${NC}"
        
        # Check if local Supabase is running
        if ! supabase status 2>/dev/null | grep -q "Started"; then
            echo -e "${YELLOW}Starting local Supabase...${NC}"
            supabase start
            
            # Wait for services to be ready
            echo "Waiting for services to start..."
            sleep 10
        fi
        
        # Apply seed to local database
        supabase db reset --seed-only
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Seed data applied to local Supabase!${NC}"
            echo ""
            echo "📌 Local access details:"
            echo "  Studio URL: http://localhost:54323"
            echo "  API URL: http://localhost:54321"
            echo "  Demo login: demo@evermed.ai / 123456"
        else
            echo -e "${RED}❌ Failed to apply seed data${NC}"
            exit 1
        fi
        ;;
        
    2)
        echo -e "${YELLOW}🌐 Applying to remote Supabase...${NC}"
        
        # Get database URL
        echo -n "Enter your Supabase database URL (postgresql://...): "
        read -s DB_URL
        echo ""
        
        if [ -z "$DB_URL" ]; then
            # Try to use default from environment
            DB_URL="postgresql://postgres.jwarorrwgpqrksrxmesx:zwRCJH1K3rH78Wl7@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
            echo -e "${YELLOW}Using default database URL${NC}"
        fi
        
        # Apply seed using psql
        echo "Applying seed data..."
        psql "$DB_URL" -f supabase/seed.sql -q
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Seed data applied to remote Supabase!${NC}"
            echo ""
            echo "📌 Demo account created:"
            echo "  Email: demo@evermed.ai"
            echo "  Password: 123456"
            echo "  Name: Sarah Chen"
            echo ""
            echo "📊 Sample data includes:"
            echo "  • 4 family members"
            echo "  • Peace status tracking"
            echo "  • Photo captures with AI analysis"
            echo "  • Check-in notifications"
        else
            echo -e "${RED}❌ Failed to apply seed data${NC}"
            echo "Make sure:"
            echo "1. PostgreSQL client (psql) is installed"
            echo "2. Database URL is correct"
            echo "3. You have proper permissions"
            exit 1
        fi
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "🎯 Next steps:"
echo "1. Start the frontend: cd frontend && npm run dev"
echo "2. Visit http://localhost:3001/login"
echo "3. Click 'Try Demo Account' or use demo@evermed.ai / 123456"
echo ""
echo -e "${GREEN}Happy testing! 🚀${NC}"