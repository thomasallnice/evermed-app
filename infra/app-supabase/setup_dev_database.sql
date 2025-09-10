-- ================================================
-- EverMed Development Database Setup
-- Creates all tables, RLS policies, and demo data
-- ================================================

-- 1. CREATE FAMILY_MEMBERS TABLE
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

-- 2. CREATE INDEXES FOR PERFORMANCE
-- ================================================
CREATE INDEX IF NOT EXISTS idx_family_members_primary_user ON family_members(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_status ON family_members(status);

-- 3. ENABLE ROW LEVEL SECURITY
-- ================================================
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES (Simple, non-recursive)
-- ================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can insert their family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can update their family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can delete their family members" ON public.family_members;

-- Create new policies
CREATE POLICY "Users can view their family members"
    ON public.family_members FOR SELECT
    USING (
        auth.uid() = primary_user_id OR 
        auth.uid() = user_id
    );

CREATE POLICY "Users can insert their family members"
    ON public.family_members FOR INSERT
    WITH CHECK (
        auth.uid() = primary_user_id OR 
        auth.uid() = user_id
    );

CREATE POLICY "Users can update their family members"
    ON public.family_members FOR UPDATE
    USING (
        auth.uid() = primary_user_id OR 
        auth.uid() = user_id
    )
    WITH CHECK (
        auth.uid() = primary_user_id OR 
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete their family members"
    ON public.family_members FOR DELETE
    USING (
        auth.uid() = primary_user_id OR 
        auth.uid() = user_id
    );

-- 5. CREATE UPDATE TRIGGER FOR updated_at
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_family_members_updated_at ON public.family_members;
CREATE TRIGGER handle_family_members_updated_at
    BEFORE UPDATE ON public.family_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. CREATE DEMO USER ACCOUNT
-- ================================================
-- Note: This creates the user directly in auth.users
-- Password is '123456' encrypted with bcrypt

DO $$
DECLARE
    demo_user_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
BEGIN
    -- Check if user already exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = demo_user_id) THEN
        -- Insert into auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            demo_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'demo@evermed.ai',
            '$2a$10$PkfLtp7r1w6pXLPfRUXv1.FfmjqGLFhHwghBL4HpqZLqLp8qdXOle', -- bcrypt hash of '123456'
            NOW(),
            NOW(),
            NOW(),
            jsonb_build_object(
                'provider', 'email',
                'providers', ARRAY['email']
            ),
            jsonb_build_object(
                'first_name', 'Sarah',
                'last_name', 'Chen',
                'full_name', 'Sarah Chen'
            ),
            false,
            '',
            null,
            '',
            ''
        );
        
        -- Also create identity for the user
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            demo_user_id,
            demo_user_id,
            jsonb_build_object(
                'sub', demo_user_id,
                'email', 'demo@evermed.ai'
            ),
            'email',
            NOW(),
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created demo user: demo@evermed.ai';
    ELSE
        RAISE NOTICE 'Demo user already exists';
    END IF;
END $$;

-- 7. CREATE DEMO FAMILY MEMBERS
-- ================================================
-- Calculate birthdates based on current ages
-- Mum (75), Dad (78), Peter (15), Nelly (7)

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
    notes,
    phone,
    created_at,
    updated_at
) VALUES 
    (
        gen_random_uuid(),
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Margaret',
        'Thompson',
        'Mother',
        CURRENT_DATE - INTERVAL '75 years',
        'needs_attention',
        NOW() - INTERVAL '25 hours',
        'Mum needs her medication refilled. Doctor appointment on Friday.',
        '555-0101',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Robert',
        'Thompson',
        'Father',
        CURRENT_DATE - INTERVAL '78 years',
        'all_well',
        NOW() - INTERVAL '2 hours',
        'Dad is doing great. Daily walk completed.',
        '555-0102',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Peter',
        'Chen',
        'Son',
        CURRENT_DATE - INTERVAL '15 years',
        'all_well',
        NOW() - INTERVAL '5 hours',
        'Peter has soccer practice tomorrow at 4pm.',
        '555-0103',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Nelly',
        'Chen',
        'Daughter',
        CURRENT_DATE - INTERVAL '7 years',
        'all_well',
        NOW() - INTERVAL '3 hours',
        'Nelly''s school play is next Tuesday. She''s very excited!',
        '555-0104',
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    last_check_in = EXCLUDED.last_check_in,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- 8. CREATE OPTIONAL USERS TABLE (for profile data)
-- ================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Insert demo user profile
INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    created_at,
    updated_at
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'demo@evermed.ai',
    'Sarah',
    'Chen',
    'Sarah Chen',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 9. VERIFY SETUP
-- ================================================
DO $$
DECLARE
    user_count INTEGER;
    family_count INTEGER;
BEGIN
    -- Count demo users
    SELECT COUNT(*) INTO user_count 
    FROM auth.users 
    WHERE email = 'demo@evermed.ai';
    
    -- Count family members
    SELECT COUNT(*) INTO family_count 
    FROM public.family_members 
    WHERE primary_user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    
    RAISE NOTICE '✅ Setup complete!';
    RAISE NOTICE '   Demo users: %', user_count;
    RAISE NOTICE '   Family members: %', family_count;
    RAISE NOTICE '';
    RAISE NOTICE '📧 Login credentials:';
    RAISE NOTICE '   Email: demo@evermed.ai';
    RAISE NOTICE '   Password: 123456';
    RAISE NOTICE '';
    RAISE NOTICE '👨‍👩‍👧‍👦 Family members created:';
    RAISE NOTICE '   - Margaret Thompson (Mum, 75) - needs_attention';
    RAISE NOTICE '   - Robert Thompson (Dad, 78) - all_well';
    RAISE NOTICE '   - Peter Chen (Son, 15) - all_well';
    RAISE NOTICE '   - Nelly Chen (Daughter, 7) - all_well';
END $$;

-- 10. GRANT PERMISSIONS (if needed)
-- ================================================
GRANT ALL ON public.family_members TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
