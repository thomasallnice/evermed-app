#!/bin/bash

# ============================================================================
# Create Demo User Script for Supabase
# Creates the demo@evermed.ai user with proper metadata
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
PROJECT_ID="jwarorrwgpqrksrxmesx"
DEMO_EMAIL="demo@evermed.ai"
DEMO_PASSWORD="123456"
DEMO_NAME="Sarah Chen"

echo ""
echo -e "${BOLD}=====================================================================${NC}"
echo -e "${BOLD}                    Create Demo User for EverMed                     ${NC}"
echo -e "${BOLD}=====================================================================${NC}"
echo ""

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set${NC}"
    echo ""
    echo "Please run this after setting your database URL:"
    echo "export DATABASE_URL='your-supabase-url'"
    echo ""
    echo "Or run apply_remote.sh first which will set it up."
    exit 1
fi

echo -e "${BLUE}Checking for existing demo user...${NC}"

# Check if demo user already exists
USER_EXISTS=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) FROM auth.users WHERE email = '$DEMO_EMAIL';
" 2>/dev/null | tr -d ' ')

if [ "$USER_EXISTS" = "1" ]; then
    echo -e "${YELLOW}ℹ️  Demo user already exists${NC}"
    echo ""
    
    # Get user details
    echo "Current demo user details:"
    psql "$DATABASE_URL" -c "
        SELECT 
            email,
            raw_user_meta_data->>'full_name' as full_name,
            created_at::date as created_date
        FROM auth.users 
        WHERE email = '$DEMO_EMAIL';
    " 2>/dev/null
    
    echo ""
    read -p "Do you want to update the user metadata? (yes/no): " update_user
    
    if [[ "$update_user" == "yes" ]]; then
        echo -e "${BLUE}Updating user metadata...${NC}"
        
        psql "$DATABASE_URL" <<EOF
            UPDATE auth.users 
            SET 
                raw_user_meta_data = jsonb_build_object(
                    'full_name', '$DEMO_NAME',
                    'updated_at', NOW()
                )
            WHERE email = '$DEMO_EMAIL';
EOF
        
        echo -e "${GREEN}✅ User metadata updated${NC}"
    fi
else
    echo -e "${BLUE}Creating demo user...${NC}"
    echo ""
    
    # Note: Direct user creation in auth.users requires special handling
    echo -e "${YELLOW}⚠️  Note: Creating users directly in the database requires admin access${NC}"
    echo ""
    echo "The recommended way to create the demo user is:"
    echo ""
    echo -e "${BOLD}Option 1: Via Supabase Dashboard (Recommended)${NC}"
    echo "1. Go to: https://app.supabase.com/project/${PROJECT_ID}/auth/users"
    echo "2. Click 'Add user' button"
    echo "3. Enter:"
    echo "   • Email: ${DEMO_EMAIL}"
    echo "   • Password: ${DEMO_PASSWORD}"
    echo "   • User metadata: {\"full_name\": \"${DEMO_NAME}\"}"
    echo "4. Click 'Create user'"
    echo ""
    echo -e "${BOLD}Option 2: Via SQL (Requires service_role key)${NC}"
    
    # Try to create user via SQL (this might fail without proper permissions)
    read -p "Try to create user via SQL? (yes/no): " try_sql
    
    if [[ "$try_sql" == "yes" ]]; then
        echo -e "${BLUE}Attempting to create user...${NC}"
        
        # Create the SQL command
        cat > /tmp/create_demo_user.sql <<EOF
-- Create demo user
-- Note: This requires the pgcrypto extension and proper permissions

DO \$\$
DECLARE
    user_id UUID;
BEGIN
    -- Generate a new UUID for the user
    user_id := gen_random_uuid();
    
    -- Insert the user
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        raw_app_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    ) VALUES (
        user_id,
        '00000000-0000-0000-0000-000000000000',
        '$DEMO_EMAIL',
        crypt('$DEMO_PASSWORD', gen_salt('bf')),
        NOW(),
        jsonb_build_object('full_name', '$DEMO_NAME'),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );
    
    -- Create a self family member
    INSERT INTO family_members (
        user_id,
        name,
        relationship,
        status,
        peace_status,
        emergency_contact
    ) VALUES (
        user_id,
        '$DEMO_NAME',
        'Self',
        'all_well',
        '{"confidence": 0.95, "last_ai_check": null}'::jsonb,
        true
    );
    
    RAISE NOTICE 'Demo user created successfully with ID: %', user_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create user: %', SQLERRM;
        RAISE NOTICE 'Please create the user manually via Supabase Dashboard';
END \$\$;
EOF
        
        if psql "$DATABASE_URL" -f /tmp/create_demo_user.sql 2>/dev/null; then
            echo -e "${GREEN}✅ Demo user created successfully${NC}"
            rm -f /tmp/create_demo_user.sql
        else
            echo -e "${RED}❌ Failed to create user via SQL${NC}"
            echo ""
            echo "Please create the user manually via the Supabase Dashboard:"
            echo "https://app.supabase.com/project/${PROJECT_ID}/auth/users"
            rm -f /tmp/create_demo_user.sql
        fi
    fi
fi

# Now populate family members if user exists
echo ""
echo -e "${BLUE}Checking family members...${NC}"

USER_ID=$(psql "$DATABASE_URL" -t -c "
    SELECT id FROM auth.users WHERE email = '$DEMO_EMAIL' LIMIT 1;
" 2>/dev/null | tr -d ' ')

if [ -n "$USER_ID" ] && [ "$USER_ID" != "" ]; then
    FAMILY_COUNT=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM family_members WHERE user_id = '$USER_ID';
    " 2>/dev/null | tr -d ' ')
    
    if [ "$FAMILY_COUNT" = "0" ] || [ "$FAMILY_COUNT" -lt "5" ]; then
        echo -e "${BLUE}Creating demo family members...${NC}"
        
        # Apply the seed data
        if [ -f "/Users/Tom/Arbeiten/Arbeiten/2025_EverMedAi/app/supabase/migrations/01_seed_demo_data.sql" ]; then
            psql "$DATABASE_URL" -f "/Users/Tom/Arbeiten/Arbeiten/2025_EverMedAi/app/supabase/migrations/01_seed_demo_data.sql" > /dev/null 2>&1
            echo -e "${GREEN}✅ Family members created${NC}"
        fi
    else
        echo -e "${GREEN}✅ Family members already exist (${FAMILY_COUNT} members)${NC}"
    fi
    
    # Show family status
    echo ""
    echo "Demo Family Status:"
    psql "$DATABASE_URL" -c "
        SELECT 
            name,
            relationship,
            status,
            CASE 
                WHEN last_check_in > NOW() - INTERVAL '1 hour' THEN 'Just now'
                WHEN last_check_in > NOW() - INTERVAL '24 hours' THEN 'Today'
                ELSE 'Yesterday'
            END as last_check
        FROM family_members 
        WHERE user_id = '$USER_ID'
        ORDER BY 
            CASE relationship 
                WHEN 'Self' THEN 1 
                WHEN 'Mother' THEN 2 
                WHEN 'Father' THEN 3 
                ELSE 4 
            END;
    " 2>/dev/null
fi

echo ""
echo -e "${BOLD}=====================================================================${NC}"
echo -e "${GREEN}                           Complete!                                 ${NC}"
echo -e "${BOLD}=====================================================================${NC}"
echo ""
echo "Demo user setup is complete."
echo "Login credentials:"
echo "  Email: ${DEMO_EMAIL}"
echo "  Password: ${DEMO_PASSWORD}"
echo ""