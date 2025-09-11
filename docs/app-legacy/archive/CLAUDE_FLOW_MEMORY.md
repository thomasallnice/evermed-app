# Claude-Flow Memory Export - EverMed Project

## 📅 Session Timeline: August 12-13, 2025

## 🎯 Project Overview

**Original State**: Complex medical management system with 50+ tables
**Final State**: Simple peace-of-mind app with 1 table (family_members)
**Philosophy**: "Peace of mind, not productivity" - help overwhelmed caregivers

## 🔧 Major Problems Solved

### 1. Database Cleanup (50+ tables → 1 table)
**Problem**: Overly complex database with unused medical tables
**Commands Run**:
```sql
-- Dropped all unused tables
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS health_records CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
-- (and 47+ more tables)
```
**Result**: Single `family_members` table remaining

### 2. Vercel Deployment Issues
**Problem**: Build hanging at npm install, wrong root directory
**Solutions Applied**:
- Fixed `.npmrc` workspace configuration
- Added `package-lock.json` to frontend
- Set root directory to `frontend` in Vercel settings
- Fixed `vercel.json` at repository root

**Key Discovery**: Vercel needs lock file, can't handle npm workspaces well

### 3. Tailwind CSS v4 → v3 Downgrade
**Problem**: Native binding error with @tailwindcss/oxide on Vercel
**Fix Applied**:
```bash
npm uninstall tailwindcss @tailwindcss/postcss
npm install tailwindcss@^3.4.0 autoprefixer postcss
```
**PostCSS Config Fixed**:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 4. TypeScript Errors
**Fixes Applied**:
- Changed `member.peace_status` to `member.status`
- Fixed health route database property type
- Removed SIGNED_UP auth event
- Fixed Database type imports

### 5. RLS Infinite Recursion
**Problem**: "infinite recursion detected in policy for relation family_members"
**Solution**:
```sql
-- Simple non-recursive policies
CREATE POLICY "allow_select" 
ON family_members FOR SELECT 
USING (primary_user_id = auth.uid() OR user_id = auth.uid());
```

### 6. Multiple Environment Setup
**Implementation**:
- 3 Supabase projects (dev, staging, prod)
- 3 Vercel deployments
- 3 Git branches (development, staging, main)
- Frankfurt region for GDPR compliance

## 🏗️ Configuration Decisions Made

### Vercel Configuration
```json
{
  "regions": ["fra1"],
  "buildCommand": "cd frontend && npm run build",
  "installCommand": "cd frontend && npm install",
  "outputDirectory": ".next"
}
```
**Key Learning**: vercel.json must be at root, not in frontend/

### Environment Variables Structure
```
NEXT_PUBLIC_SUPABASE_URL        # Public, safe
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Public, safe
SUPABASE_SERVICE_ROLE_KEY       # Private, NO NEXT_PUBLIC_
SUPABASE_JWT_SECRET              # Private, NO NEXT_PUBLIC_
```

### Database Column Mappings
**Problem**: App expected different column names than database had
**Solution**: Created mapping utilities
- `name` → `first_name + last_name`
- `photo_url` → `profile_photo_url`
- `user_id` → `primary_user_id`

## 📋 Complete Command History

### Initial Assessment Commands
```bash
npm list --depth=0
git status
ls -la frontend/
cat package.json
```

### Database Cleanup
```bash
# Listed all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

# Cleaned up
DO $$ 
DECLARE obj RECORD;
BEGIN
    FOR obj IN (SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename != 'family_members')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(obj.tablename) || ' CASCADE';
    END LOOP;
END $$;
```

### Deployment Fixes
```bash
# Fixed lock file issue
cd frontend
rm -rf node_modules package-lock.json
npm install
cp ../package-lock.json .

# Fixed Vercel
git add vercel.json package-lock.json
git commit -m "fix: deployment configuration"
git push origin main
```

### Branch Setup
```bash
git checkout -b development
git push origin development

git checkout -b staging
git push origin staging
```

## 🚀 Deployment Procedures

### Development Workflow
1. Work in `development` branch
2. Auto-deploys to dev.evermed.ai
3. Uses dev Supabase project

### Staging Workflow
1. Merge development → staging
2. Auto-deploys to staging.evermed.ai
3. Uses staging Supabase project

### Production Workflow
1. Merge staging → main
2. Auto-deploys to app.evermed.ai
3. Uses production Supabase project

## 📁 File Structure Decisions

```
/app (git root)
├── frontend/          # Next.js app
│   ├── app/          # App router
│   ├── components/
│   └── package.json
├── backend/          # Minimal FastAPI
├── vercel.json       # At root, not in frontend
└── docs/
    └── archive/      # Old documentation
```

## 🎨 UI/UX Decisions

### Color Scheme
- Primary: #4CAF50 (Peace Green)
- Alert: Amber (never red)
- Background: #FAFAF8 (Warm white)

### Features Kept
- Peace dashboard with breathing indicator
- Family member status cards
- Camera capture placeholder
- Simple authentication

### Features Removed
- All medication tracking
- Health records
- Symptom checking
- Complex monitoring
- Admin dashboards

## 🔐 Security Decisions

### Email Verification
- Made optional (soft reminders)
- Users can use app immediately
- VerificationGuard for sensitive actions only

### JWT Keys
- Never use NEXT_PUBLIC_ prefix for secrets
- Service role key only for server-side
- Anon key for client-side

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module '@tailwindcss/postcss'"
**Solution**: Update postcss.config.js for Tailwind v3

### Issue: Build hangs at npm install
**Solution**: Remove .npmrc workspace config, add package-lock.json

### Issue: "column family_members.user_id does not exist"
**Solution**: Use primary_user_id or