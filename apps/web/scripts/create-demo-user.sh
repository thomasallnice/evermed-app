#!/bin/bash

# Create Demo User Script for Dev Environment
# This creates the demo@evermed.ai user with test data

echo "🚀 Creating demo user for development environment..."

# Check if we have the dev database URL
if [ -z "$DEV_DATABASE_URL" ]; then
    echo "❌ Please set DEV_DATABASE_URL environment variable"
    echo "You can find it in your Supabase dashboard under Settings > Database"
    echo "Export it like: export DEV_DATABASE_URL='postgresql://...'"
    exit 1
fi

# SQL to create demo user and family members
cat << 'EOF' | psql $DEV_DATABASE_URL

-- Create demo user (if not exists)
DO $$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo@evermed.ai') THEN
        -- Create user using Supabase auth functions
        -- Note: This is a simplified version, you might need to use Supabase Admin API
        INSERT INTO auth.users (
            id,
            email,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            email_confirmed_at,
            confirmation_token,
            encrypted_password
        ) VALUES (
            'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            'demo@evermed.ai',
            '{"provider": "email", "providers": ["email"]}',
            '{"first_name": "Sarah", "last_name": "Chen"}',
            NOW(),
            NOW(),
            NOW(),
            '',
            crypt('123456', gen_salt('bf'))
        );
        
        RAISE NOTICE 'Created demo user: demo@evermed.ai';
    ELSE
        RAISE NOTICE 'Demo user already exists';
    END IF;
END $$;

-- Create demo family members
INSERT INTO public.family_members (
    id,
    primary_user_id,
    user_id,
    first_name,
    last_name,
    relationship,
    date_of_birth,
    status,
    last_check_in,
    created_at,
    updated_at
) VALUES 
    (
        '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Margaret',
        'Chen',
        'Mother',
        '1952-03-15',
        'needs_attention',
        NOW() - INTERVAL '25 hours',
        NOW(),
        NOW()
    ),
    (
        '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Robert',
        'Chen',
        'Father',
        '1950-07-22',
        'all_well',
        NOW() - INTERVAL '2 hours',
        NOW(),
        NOW()
    ),
    (
        '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Jake',
        'Chen',
        'Son',
        '1995-11-08',
        'all_well',
        NOW() - INTERVAL '5 hours',
        NOW(),
        NOW()
    ),
    (
        '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f90',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Emma',
        'Chen',
        'Daughter',
        '1998-04-30',
        'all_well',
        NOW() - INTERVAL '3 hours',
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    last_check_in = EXCLUDED.last_check_in,
    updated_at = NOW();

-- Verify the setup
SELECT 'Demo user created with ' || COUNT(*) || ' family members' 
FROM family_members 
WHERE primary_user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

EOF

echo "✅ Demo setup complete!"
echo ""
echo "You can now log in with:"
echo "Email: demo@evermed.ai"
echo "Password: 123456"
