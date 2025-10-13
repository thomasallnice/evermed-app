-- ============================================================================
-- Admin Users Table
-- Purpose: Store list of admin users for role-based access control
-- Security: Only service role can modify this table
-- ============================================================================

-- Create admin_users table
CREATE TABLE IF NOT EXISTS "admin_users" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT
    -- Note: Cannot add foreign key to auth.users from public schema
    -- Constraint is enforced at application level
);

-- Create index on email for lookups
CREATE INDEX IF NOT EXISTS "admin_users_email_idx" ON "admin_users"("email");

-- Enable RLS (only service role can access)
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can read admin_users
-- This prevents regular users from checking who is admin
CREATE POLICY "Service role can read admin_users"
ON "admin_users" FOR SELECT
USING (auth.role() = 'service_role');

-- Policy: Only service role can insert admin_users
CREATE POLICY "Service role can insert admin_users"
ON "admin_users" FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Policy: Only service role can delete admin_users
CREATE POLICY "Service role can delete admin_users"
ON "admin_users" FOR DELETE
USING (auth.role() = 'service_role');

-- Comment
COMMENT ON TABLE "admin_users" IS 'Admin users for role-based access control. Only service role can access.';

-- Insert initial admin user (replace with actual admin email)
-- This will be done manually after deployment
-- Example: INSERT INTO admin_users (user_id, email, created_by) VALUES ('uuid', 'admin@evermed.ai', 'system');
