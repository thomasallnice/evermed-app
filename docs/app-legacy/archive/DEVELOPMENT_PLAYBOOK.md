# EverMed Development Playbook

## 🚀 Quick Start Guide

### Starting Fresh Claude Conversation
When starting a new conversation with Claude or another AI assistant, use this context:

```
I have an existing Next.js/Supabase app called EverMed. It's a peace-of-mind app for family caregivers.
Tech: Next.js 15.4.4, Supabase, Tailwind v4, TypeScript 5, deployed on Vercel to Frankfurt.
Structure: Monorepo with frontend/ folder, 3 environments (dev/staging/prod).
Database: Single family_members table, 3 separate Supabase projects.
Files: vercel.json at root, .env files in frontend/.
See docs/AI_BRIEFING.md and docs/TECHNICAL_SPEC.md for full context.
```

### Environment URLs & Projects
| Environment | URL | Branch | Supabase Project ID |
|------------|-----|--------|-------------------|
| Development | dev.evermed.ai | development | wukrnqifpgjwbqxpockm |
| Staging | staging.evermed.ai | staging | [to be configured] |
| Production | app.evermed.ai | main | [to be configured] |

## 📁 Project Structure Essentials

```
/app (repository root)
├── frontend/          # Next.js application
│   ├── app/          # App Router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities
│   ├── .env.*        # Environment files
│   └── package.json  # Dependencies
├── docs/             # Documentation
├── vercel.json       # MUST be at root!
└── .gitignore
```

## 🛠️ Common Development Tasks

### 1. Local Development Setup

#### First Time Setup
```bash
# Clone repository
git clone [repo-url]
cd app/frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

#### Daily Development
```bash
cd frontend

# Start with development environment
npm run dev                 # Port 3001, uses .env.development

# Test with different environments
npm run dev:staging         # Uses staging Supabase
npm run dev:production      # Uses production Supabase (BE CAREFUL!)

# Development with backend (if needed)
npm run dev:all             # Runs both frontend and backend
```

### 2. Adding New Features

#### Feature Development Workflow
```bash
# 1. Create feature branch from development
git checkout development
git pull origin development
git checkout -b feature/your-feature-name

# 2. Start development server
cd frontend
npm run dev

# 3. Make changes following patterns
# - Check components/ for existing patterns
# - Use existing UI components from components/ui/
# - Keep it simple - MVP mindset
# - Test locally first

# 4. Build and test
npm run build               # Check for build errors
npm run type-check          # TypeScript validation
npm run lint                # Linting

# 5. Commit and push
git add .
git commit -m "feat: description of feature"
git push origin feature/your-feature-name

# 6. Create PR to development branch
```

#### Component Creation Pattern
```typescript
// Always follow existing patterns from components/
// Example: components/features/YourFeature.tsx

'use client'  // If client-side interactivity needed

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function YourFeature() {
  // Keep state simple
  const [state, setState] = useState()
  
  // Use existing utilities
  return (
    <Card className="p-6">
      {/* Use existing UI components */}
      <Button>Action</Button>
    </Card>
  )
}
```

### 3. Database Operations

#### Making Database Changes
```bash
# 1. ALWAYS start with development environment
# Go to: https://supabase.com/dashboard/project/wukrnqifpgjwbqxpockm

# 2. Test changes thoroughly in dev
# - Create tables/columns
# - Test RLS policies
# - Verify with test data

# 3. Apply to staging (when ready)
# Manually recreate changes in staging project

# 4. Apply to production (after staging verification)
# Manually recreate changes in production project
```

#### Common Database Queries
```sql
-- Check family members for a user
SELECT * FROM family_members 
WHERE primary_user_id = 'user-uuid-here';

-- Update member status
UPDATE family_members 
SET status = 'yellow', 
    last_status_update = NOW()
WHERE id = 'member-uuid-here';

-- Simple RLS policy pattern
CREATE POLICY "policy_name" ON family_members
FOR ALL USING (auth.uid() = primary_user_id);
```

### 4. Authentication Management

#### Testing Auth Flows
```javascript
// Check auth settings
node frontend/scripts/check-auth-settings.js

// Test signup flow
// 1. Email confirmation is OPTIONAL
// 2. Users can access app immediately
// 3. Auto-login attempt after signup
```

#### Demo Account (Development Only)
```
Email: demo@evermed.ai
Password: Demo123456!
```

## 🔧 Fixing Common Issues

### Build & Deployment Issues

#### Issue: Build Fails Locally
```bash
# Solution 1: Clear Next.js cache
rm -rf .next
npm run build

# Solution 2: Check PostCSS config for Tailwind v4
# Ensure postcss.config.js has:
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}
  }
}

# Solution 3: TypeScript errors
npm run type-check
# Fix any type errors before building
```

#### Issue: Vercel Deployment Fails
```bash
# Check 1: vercel.json MUST be at repository root
ls -la vercel.json  # Should show file at /app/vercel.json

# Check 2: Correct outputDirectory in vercel.json
# Should be: "outputDirectory": ".next"
# NOT: "outputDirectory": "frontend/.next"

# Check 3: Environment variables in Vercel dashboard
# Ensure all NEXT_PUBLIC_* variables are set
```

#### Issue: Webpack/Lazy Loading Errors
```typescript
// Replace dynamic imports with static imports
// ❌ WRONG
const Component = React.lazy(() => import('./Component'))

// ✅ CORRECT
import Component from './Component'
```

### Database & RLS Issues

#### Issue: RLS Policy Errors
```sql
-- Check current policies
SELECT * FROM pg_policies 
WHERE tablename = 'family_members';

-- Simple fix: Avoid complex recursion
-- ❌ WRONG: Complex subqueries
CREATE POLICY "complex" ON family_members
FOR SELECT USING (
  id IN (SELECT member_id FROM complex_join WHERE ...)
);

-- ✅ CORRECT: Direct comparison
CREATE POLICY "simple" ON family_members
FOR SELECT USING (auth.uid() = primary_user_id);
```

#### Issue: Cannot Access Data
```bash
# 1. Check if user is authenticated
# 2. Verify RLS policies
# 3. Check Supabase service status
# 4. Verify environment variables
```

### Frontend Issues

#### Issue: Tailwind Styles Not Working
```bash
# Tailwind v4 requires special configuration
# Check postcss.config.js and tailwind.config.ts
# Restart dev server after changes
```

#### Issue: Hydration Errors
```typescript
// Common causes:
// 1. Date/time rendering - use consistent formatting
// 2. Random values - move to useEffect
// 3. Conditional rendering based on window object
```

## 🚨 Emergency Procedures

### Production Rollback

#### Immediate Rollback via Vercel
```bash
# Option 1: Via Vercel CLI
vercel rollback [deployment-url]

# Option 2: Via Vercel Dashboard
# 1. Go to Vercel dashboard
# 2. Select project
# 3. Go to Deployments
# 4. Find previous working deployment
# 5. Click "..." menu → "Promote to Production"
```

#### Git Revert for Code Issues
```bash
# Revert last commit on main
git checkout main
git revert HEAD
git push origin main

# Revert specific commit
git revert [commit-hash]
git push origin main
```

### Database Emergency Recovery

#### Restore from Supabase Backup
```bash
# 1. Go to Supabase dashboard
# 2. Settings → Backups
# 3. Select point-in-time recovery
# 4. Choose timestamp before issue
# 5. Restore to new database
# 6. Update connection string in Vercel
```

#### Emergency RLS Disable (TEMPORARY!)
```sql
-- DANGER: Only for emergency debugging
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;

-- After fixing issue, IMMEDIATELY:
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
```

### Performance Issues

#### High Load Mitigation
```bash
# 1. Enable Vercel Edge Config rate limiting
# 2. Temporarily disable real-time features
# 3. Scale Supabase instance if needed
# 4. Check for infinite loops in code
```

#### Memory Leaks
```typescript
// Common patterns to check:
// 1. Unsubscribed event listeners
// 2. Unclosed Supabase subscriptions
// 3. Large state objects not being cleared
```

## 📝 Git Workflow & Commands

### Branch Strategy
```
main (production)
  ↑
staging
  ↑  
development
  ↑
feature/xxx
```

### Common Git Commands
```bash
# Create feature branch
git checkout -b feature/name

# Update from development
git checkout development
git pull origin development
git checkout feature/name
git merge development

# Interactive rebase (clean history)
git rebase -i development

# Stash changes temporarily
git stash
git stash pop

# Check branch status
git status
git log --oneline -10
```

### Commit Message Convention
```bash
# Format: type: description

feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

## 🔍 Debugging & Testing

### Local Debugging
```bash
# Enable debug mode
NEXT_PUBLIC_ENABLE_DEBUG=true npm run dev

# Check browser console for:
# - Auth state changes
# - API calls
# - Error messages

# Node debugging
NODE_OPTIONS='--inspect' npm run dev
# Open chrome://inspect
```

### Testing Commands
```bash
# Run tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage

# Specific test file
npm test -- path/to/test.spec.ts
```

### Supabase Testing
```javascript
// Test connection
const { data, error } = await supabase
  .from('family_members')
  .select('count')
  
console.log('Connection test:', { data, error })
```

## 📦 Dependency Management

### Adding Dependencies
```bash
# Add to frontend
cd frontend
npm install package-name

# Add dev dependency
npm install -D package-name

# Add specific version
npm install package-name@1.2.3
```

### Updating Dependencies
```bash
# Check outdated
npm outdated

# Update single package
npm update package-name

# Update all (be careful!)
npm update

# Major version updates
npm install package-name@latest
```

### Security Audits
```bash
# Check for vulnerabilities
npm audit

# Auto-fix if possible
npm audit fix

# Force fixes (careful!)
npm audit fix --force
```

## 🚀 Deployment Commands

### Manual Deployment
```bash
# Deploy to Vercel (from project root)
vercel

# Deploy to production
vercel --prod

# Deploy specific branch
vercel --branch staging
```

### Build Optimization
```bash
# Analyze bundle size
npm run build:analyze

# Check build output
npm run build 2>&1 | tee build.log

# Production build test
npm run build && npm run start
```

## 📊 Monitoring & Logs

### Vercel Logs
```bash
# View function logs
vercel logs

# Follow logs
vercel logs --follow

# Filter by function
vercel logs --filter="api/auth"
```

### Supabase Logs
```
1. Go to Supabase dashboard
2. Navigate to Logs → API
3. Filter by endpoint or time
4. Check for RLS policy violations
```

## 🔐 Security Checklist

### Environment Variables
- [ ] Never commit .env.local
- [ ] Service role keys have NO NEXT_PUBLIC_ prefix
- [ ] Different keys for each environment
- [ ] Rotate keys if exposed

### Code Security
- [ ] Validate all user inputs
- [ ] Sanitize database queries
- [ ] Use HTTPS only in production
- [ ] Enable CORS properly
- [ ] Check for XSS vulnerabilities

### Deployment Security
- [ ] Enable Vercel DDoS protection
- [ ] Set up rate limiting
- [ ] Configure CSP headers
- [ ] Enable audit logging

## 🛟 Support Resources

### Documentation
- **Project Docs**: `/docs/AI_BRIEFING.md`, `/docs/TECHNICAL_SPEC.md`
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Vercel**: https://vercel.com/docs
- **Tailwind v4**: https://tailwindcss.com/docs

### Common File Locations
- **Auth Logic**: `/frontend/lib/auth/AuthContext.tsx`
- **Supabase Client**: `/frontend/lib/supabase/client.ts`
- **Admin Client**: `/frontend/lib/supabase/admin.ts`
- **Main Layout**: `/frontend/components/layout/MainLayout.tsx`
- **Environment Files**: `/frontend/.env.*`

### Quick Debug Commands
```bash
# Clear all caches
rm -rf .next node_modules package-lock.json
npm install
npm run dev

# Check current environment
node -e "console.log(process.env.NEXT_PUBLIC_ENVIRONMENT)"

# Verify Supabase connection
curl https://[your-project].supabase.co/rest/v1/

# Test build locally
npm run build && npm run start
```

## 📅 Daily Workflow Checklist

### Morning Setup
- [ ] Pull latest from development branch
- [ ] Check for dependency updates
- [ ] Review open PRs and issues
- [ ] Start dev server with correct environment

### Before Committing
- [ ] Run `npm run build` locally
- [ ] Run `npm run type-check`
- [ ] Run `npm run lint`
- [ ] Test feature in browser
- [ ] Check mobile responsiveness

### End of Day
- [ ] Commit and push changes
- [ ] Create/update PR if needed
- [ ] Document any blockers
- [ ] Update todo list/issues

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Quick Help**: For immediate assistance, check `/docs/AI_BRIEFING.md` or ask in team chat