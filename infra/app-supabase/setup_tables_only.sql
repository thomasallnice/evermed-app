-- ================================================
-- SIMPLE VERSION - Using Supabase Admin Functions
-- ================================================

-- 1. CREATE TABLES FIRST
-- ================================================
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    relationship TEXT,
    date_of_birth DATE,
    status TEXT DEFAULT 'all_well' CHECK (status IN ('all_well', 'needs_attention', 'checking')),
    last_check_in TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    profile_photo_url TEXT,
    notes TEXT,
    phone TEXT,
    email TEXT,
    emergency_contact BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Create simple policies
CREATE POLICY "Users can manage their family members"
    ON public.family_members 
    FOR ALL
    USING (auth.uid() = primary_user_id OR auth.uid() = user_id)
    WITH CHECK (auth.uid() = primary_user_id OR auth.uid() = user_id);

-- 2. CREATE DEMO USER USING SUPABASE'S ADMIN FUNCTION
-- ================================================
-- Note: After running this, create the user via Dashboard or use the Admin API

-- First, let's just prepare the family members for a user we'll create
-- We'll use a placeholder ID that we'll update after creating the user

-- 3. INSERT FAMILY MEMBERS (after you create the user)
-- ================================================
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID after creating via Dashboard

INSERT INTO public.family_members (
    primary_user_id,
    user_id,
    first_name,
    last_name,
    relationship,
    date_of_birth,
    status,
    last_check_in,
    notes,
    phone
) VALUES 
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- You'll create this user ID
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Margaret',
        'Thompson',
        'Mother',
        CURRENT_DATE - INTERVAL '75 years',
        'needs_attention',
        NOW() - INTERVAL '25 hours',
        'Mum needs her medication refilled. Doctor appointment on Friday.',
        '555-0101'
    ),
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Robert',
        'Thompson',
        'Father',
        CURRENT_DATE - INTERVAL '78 years',
        'all_well',
        NOW() - INTERVAL '2 hours',
        'Dad is doing great. Daily walk completed.',
        '555-0102'
    ),
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Peter',
        'Chen',
        'Son',
        CURRENT_DATE - INTERVAL '15 years',
        'all_well',
        NOW() - INTERVAL '5 hours',
        'Peter has soccer practice tomorrow at 4pm.',
        '555-0103'
    ),
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Nelly',
        'Chen',
        'Daughter',
        CURRENT_DATE - INTERVAL '7 years',
        'all_well',
        NOW() - INTERVAL '3 hours',
        'Nelly''s school play is next Tuesday. She''s very excited!',
        '555-0104'
    );

-- Verify
SELECT 'Created ' || COUNT(*) || ' family members' FROM family_members;
