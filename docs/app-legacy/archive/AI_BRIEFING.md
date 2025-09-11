# EverMed AI Assistant Briefing

## 🎯 Project Overview

### Core Concept
- **Name**: EverMed (formerly EverMed.ai)
- **Mission**: Peace-of-mind app for overwhelmed family caregivers
- **Target Users**: Primary caregivers managing family health information
- **MVP Focus**: Simple family health status tracking (NOT complex medical management)
- **Key Differentiator**: Simplicity over complexity - "peace of mind, not medical records"

### Tech Stack
- **Frontend**: Next.js 15.4.4 with App Router
- **Styling**: Tailwind CSS v4 with PostCSS
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth
- **Type Safety**: TypeScript 5
- **Deployment**: Vercel
- **Package Manager**: npm (single lockfile at root)

## 🏗️ Architecture Decisions

### Database Simplification
**Evolution**: Started with 50+ complex medical tables → Simplified to 1 core table

**Current Schema**:
```sql
-- Single table approach
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  relationship TEXT,
  date_of_birth DATE,
  status TEXT DEFAULT 'green', -- green, yellow, red
  last_status_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  profile_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**RLS Policies**: Simple user isolation without complex recursion
```sql
-- Users can only see their own family members
CREATE POLICY "Users can view own family members" ON family_members
  FOR SELECT USING (auth.uid() = primary_user_id);
```

### API Architecture
- **Direct Supabase Client**: No complex backend required for MVP
- **Server-Side Admin**: Separate admin client for server-only operations
- **Real-time**: Supabase subscriptions for live updates (future)

### Monorepo Structure
```
app/
├── frontend/          # Next.js application
│   ├── app/          # App Router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities and configs
│   └── public/       # Static assets
├── backend/          # Python backend (future use)
├── docs/             # Documentation
└── vercel.json       # Deployment config (at root!)
```

## 🚀 Deployment Infrastructure

### Platform: Vercel
- **Region**: Frankfurt (fra1) - GDPR compliance for European users
- **Runtime**: Node.js 20.x
- **Function Duration**: 10 seconds max

### Environment Strategy
| Environment | Domain | Branch | Supabase Project |
|------------|--------|--------|------------------|
| Development | dev.evermed.ai | development | wukrnqifpgjwbqxpockm |
| Staging | staging.evermed.ai | staging | [pending setup] |
| Production | app.evermed.ai | main | [pending setup] |

### Build Configuration
```json
// vercel.json (at root, NOT in frontend/)
{
  "regions": ["fra1"],
  "buildCommand": "cd frontend && npm run build",
  "installCommand": "cd frontend && npm install",
  "outputDirectory": ".next"  // Relative to frontend, not root!
}
```

## 🔐 Environment Variables Structure

### Public Variables (Client-safe)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
NEXT_PUBLIC_ENVIRONMENT=development|staging|production
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Private Variables (Server-only, NO NEXT_PUBLIC_ prefix!)
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # Admin access, bypasses RLS
SUPABASE_JWT_SECRET=xxx...           # Token verification
```

### Environment Files
- `.env.development` - Development settings (committed with dev keys)
- `.env.staging` - Staging settings (committed with staging keys)
- `.env.production` - Production placeholders (real keys in Vercel)
- `.env.local` - Local overrides (gitignored)

## ✅ Key Features Implemented

### 1. Peace Dashboard
- **Breathing Animation**: Calming green circle that pulses
- **Family Status Overview**: At-a-glance family health status
- **Quick Actions**: Add family member, update status

### 2. Family Member Management
- **Status Cards**: Visual cards with green/yellow/red status
- **Profile Photos**: Support for avatar uploads
- **Quick Status Updates**: One-click status changes

### 3. Smart Camera Capture
- **Placeholder Implementation**: Ready for AI integration
- **Mobile-Optimized**: Full-screen camera on mobile
- **Future**: Medicine scanning, document capture

### 4. Authentication Flow
- **Email/Password**: Standard Supabase auth
- **Email Verification**: Soft/optional (doesn't block access)
- **Auto-login**: After signup, attempts immediate login
- **Protected Routes**: Automatic redirects for auth pages

### 5. Mobile Responsiveness
- **Collapsible Sidebar**: Desktop sidebar, mobile bottom nav
- **Touch Optimized**: Large touch targets for mobile
- **PWA Ready**: Manifest and icons configured

## 🐛 Common Issues & Solutions

### 1. Vercel Deployment Paths
**Issue**: Looking for `/frontend/frontend/.next`
**Solution**: Set `outputDirectory: ".next"` (not `"frontend/.next"`)

### 2. Tailwind CSS v4
**Issue**: Standard Tailwind config doesn't work
**Solution**: Use `@tailwindcss/postcss` package with PostCSS

### 3. Multiple Lock Files
**Issue**: Conflicting package-lock.json files
**Solution**: Single lockfile at root, none in subdirectories

### 4. RLS Infinite Recursion
**Issue**: Policies referencing themselves
**Solution**: Simple, direct policies without subqueries

### 5. TypeScript Import Errors
**Issue**: Missing types for Supabase
**Solution**: Comment out Database type until generated

### 6. React.lazy() Webpack Errors
**Issue**: Dynamic imports failing in monitoring components
**Solution**: Use static imports instead of React.lazy()

### 7. Missing Manifest Icons
**Issue**: PWA icons not found
**Solution**: Create icons in `public/icons/` with proper purpose attribute

### 8. Email Confirmation Blocking
**Issue**: Users can't access app without email verification
**Solution**: Implement soft verification with in-app reminders

## 🔄 Development Workflow

### Local Development
```bash
cd frontend
npm run dev              # Uses .env.development
npm run dev:staging      # Test with staging data
npm run dev:production   # Test with prod data (careful!)
```

### Git Workflow
```
feature/xxx → development → staging → main
     ↓            ↓            ↓         ↓
  Local Dev   dev.evermed  staging   app.evermed
```

### Deployment Process
1. **Feature Development**: Create feature branch from development
2. **Testing**: Merge to development → auto-deploy to dev.evermed.ai
3. **Staging**: Merge to staging → auto-deploy to staging.evermed.ai
4. **Production**: Merge to main → auto-deploy to app.evermed.ai

### Build Commands
```bash
npm run build           # Standard build
npm run build:staging   # Build with staging env
npm run build:production # Build with production env
npm run vercel-build    # Vercel-specific build
```

## 📝 Configuration Files

### Essential Files at Root
- `vercel.json` - Deployment configuration
- `.gitignore` - Excludes .env files, node_modules, .next
- `package.json` - Root dependencies (if any)

### Frontend Configuration
- `next.config.js` - Next.js settings, disabled optimizeCss
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS v4 setup
- `postcss.config.js` - PostCSS with Tailwind

## 🎨 Design System

### Colors
- **Primary**: Green (#4CAF50) - Peace, health, calm
- **Status Colors**:
  - Green: #10B981 - All good
  - Yellow: #F59E0B - Needs attention
  - Red: #EF4444 - Urgent
- **Background**: #FAFAF8 - Soft, warm white

### Typography
- **Font**: Geist Sans (primary), Geist Mono (code)
- **Sizes**: Responsive, mobile-first

### Components
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Green primary, outline variants
- **Forms**: Large touch targets, clear labels

## 🔮 Future Enhancements

### Phase 2 Features
- AI-powered medicine scanning
- Voice notes transcription
- Appointment reminders
- Document storage
- Family sharing

### Technical Improvements
- Redis caching layer
- WebSocket real-time updates
- Offline support with PWA
- End-to-end encryption
- HIPAA compliance

## 🚨 Critical Notes

### Security
- **Never** add `NEXT_PUBLIC_` to service role keys
- **Always** use `.env.local` for local sensitive data
- **Rotate** keys if exposed in git history
- **Validate** all user inputs
- **Sanitize** all database queries

### Performance
- Use static imports, not dynamic
- Implement proper loading states
- Optimize images with Next.js Image
- Enable caching headers
- Monitor Core Web Vitals

### GDPR Compliance
- Data stored in EU (Frankfurt)
- User data deletion on request
- Clear privacy policy required
- Cookie consent needed
- Data portability features

## 📚 Resources

### Documentation
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Vercel Deployment](https://vercel.com/docs)

### Project Files
- `/docs/AI_BRIEFING.md` - This file
- `/VERCEL_DEPLOYMENT_FIX.md` - Deployment troubleshooting
- `/frontend/ENV_MANAGEMENT.md` - Environment variables guide
- `/frontend/SUPABASE_KEYS_SECURITY.md` - Security best practices

## 🎯 MVP Success Criteria

1. ✅ Users can sign up and log in
2. ✅ Users can add family members
3. ✅ Users can update family member status
4. ✅ Dashboard shows family overview
5. ✅ Mobile-responsive design
6. ✅ Deployed to production
7. ⏳ Basic PWA functionality
8. ⏳ Email notifications (optional)

## 📞 Support & Troubleshooting

### Common Commands
```bash
# Clear Next.js cache
rm -rf .next

# Reset node modules
rm -rf node_modules package-lock.json
npm install

# Check Supabase connection
node scripts/check-auth-settings.js

# Test deployment locally
vercel dev
```

### Debug Checklist
- [ ] Check browser console for errors
- [ ] Verify environment variables loaded
- [ ] Check Supabase RLS policies
- [ ] Review Vercel function logs
- [ ] Test in incognito mode
- [ ] Clear browser cache

---

**Last Updated**: January 2025
**Version**: 1.0.0 (MVP)
**Status**: Ready for production deployment