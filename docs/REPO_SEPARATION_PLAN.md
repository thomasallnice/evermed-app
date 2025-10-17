# Carbly Repository Separation Plan

**Date:** October 17, 2025
**Status:** Recommended Architecture
**Author:** Claude Code

## Current Problems

### 1. Deployment Conflicts
- Vercel deployment fails due to React version conflicts (Web: React 18, Mobile: React 19)
- 387MB uploads to Vercel (includes unnecessary mobile dependencies)
- Build failures when trying to deploy web app with mobile app in monorepo

### 2. Development Complexity
- Mobile app dependencies interfere with web app builds
- Had to create `/carbly-mobile-standalone` workaround to build mobile app
- Cannot use `npm ci` - must use `--force` or `--legacy-peer-deps`
- Confusing workspace structure for new developers

### 3. CI/CD Issues
- Single CI pipeline tries to handle both platforms
- Mobile and web have different release cycles
- TestFlight releases shouldn't block web deployments

---

## Proposed New Structure

### Repository Split

```
carbly-web/                    # Main web application
├── apps/
│   └── web/                   # Next.js 14 web app
├── db/                        # Prisma schema & migrations
│   ├── schema.prisma
│   └── migrations/
├── docs/                      # Product specs, architecture
├── tests/                     # Vitest unit tests
├── scripts/                   # Database scripts, admin tools
├── .github/
│   └── workflows/
│       └── ci.yml             # Web CI/CD only
├── vercel.json                # Clean Vercel config
└── package.json               # No mobile dependencies

carbly-mobile/                 # Mobile application (iOS/Android)
├── app/                       # Expo app directory
├── assets/                    # Icons, splash screens
├── src/
│   ├── screens/
│   ├── components/
│   └── lib/
├── .expo/
├── eas.json                   # EAS Build config
├── app.json                   # Expo config
└── package.json               # Only mobile dependencies

carbly-types/ (optional)       # Shared TypeScript types
├── src/
│   ├── api/                   # API request/response types
│   ├── database/              # Prisma-generated types
│   └── shared/                # Common types
└── package.json               # Published to npm or GitHub Packages
```

---

## Migration Steps

### Phase 1: Create Mobile Repo (Immediate)

**1. Create new GitHub repo:**
```bash
# On GitHub: Create "carbly-mobile" repo
# Then locally:
cd /Users/Tom/Arbeiten/Arbeiten
git clone git@github.com:thomasgnahm/carbly-mobile.git
cd carbly-mobile
```

**2. Copy mobile app:**
```bash
# Copy from standalone directory (already working!)
cp -r /Users/Tom/Arbeiten/Arbeiten/carbly-mobile-standalone/* .

# Add .gitignore
cat > .gitignore << 'EOF'
node_modules/
.expo/
.expo-shared/
dist/
npm-debug.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
.env.local
EOF

# Initialize git
git add .
git commit -m "Initial commit: Carbly mobile app"
git push -u origin main
```

**3. Configure EAS:**
- ✅ Already have credentials set up
- ✅ Already have provisioning profiles
- ✅ Just need to link to new repo

**4. Test build from new repo:**
```bash
cd carbly-mobile
npx eas-cli build --platform ios --profile production
```

### Phase 2: Clean Up Web Repo (After mobile works)

**1. Remove mobile app from monorepo:**
```bash
cd /Users/Tom/Arbeiten/Arbeiten/2025_Carbly
git rm -r apps/mobile/
git rm -r carbly-mobile-standalone/
git rm app.json
git rm eas.json
```

**2. Update package.json:**
```json
{
  "name": "carbly-web",
  "workspaces": [
    "apps/web",
    "packages/config"
  ],
  "dependencies": {
    // Remove Expo dependencies
    // Remove React Native dependencies
  }
}
```

**3. Simplify Vercel config:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "npm ci"
}
```

**4. Test web deployment:**
```bash
vercel --prod
```

### Phase 3: Shared Types (Optional, Later)

**Only if you need shared types:**
```bash
# Create shared package
npm init -y carbly-types
npm publish carbly-types

# Then in both repos:
npm install carbly-types
```

---

## Benefits

### Development
- ✅ **No dependency conflicts** - Each repo has its own dependencies
- ✅ **Faster installs** - Web doesn't need mobile deps, mobile doesn't need Next.js
- ✅ **Clearer ownership** - Mobile team owns mobile repo, web team owns web repo
- ✅ **Independent testing** - Mobile tests don't affect web CI

### Deployment
- ✅ **Faster Vercel builds** - No mobile dependencies to install/scan
- ✅ **Independent releases** - Web can deploy without waiting for mobile builds
- ✅ **Smaller uploads** - ~50MB for web vs 387MB for monorepo
- ✅ **No build conflicts** - React versions don't interfere

### CI/CD
- ✅ **Separate pipelines** - Web CI runs on web changes only
- ✅ **Parallel builds** - Web and mobile build simultaneously
- ✅ **Faster feedback** - Web builds don't wait for mobile tests

### Team Scaling
- ✅ **Easier onboarding** - New developers clone only what they need
- ✅ **Clear responsibilities** - Frontend, mobile, backend roles
- ✅ **Better PR reviews** - Smaller, focused PRs per repo

---

## Shared Code Strategy

### API Contracts
**Keep in sync with OpenAPI spec:**
```typescript
// In web repo: apps/web/src/app/api/
// Mobile repo consumes via fetch

// Option A: Share via documentation
// docs/API.md defines the contract

// Option B: Generate TypeScript types
// Use openapi-typescript to generate from spec
```

### Database Schema
**Mobile doesn't need Prisma:**
```typescript
// Web: Direct Prisma access
// Mobile: API calls only

// Share types if needed:
export type Person = {
  id: string
  email: string
  // ...
}
```

### Environment Variables
**Each repo has its own .env:**
```bash
# Web (.env)
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...

# Mobile (.env)
EXPO_PUBLIC_API_URL=https://app.getcarbly.app
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Rollback Plan

If separation doesn't work:
1. Mobile repo already exists and works (standalone directory proved it)
2. Web repo is just a cleanup of current monorepo
3. Can always merge back if needed (unlikely)

---

## Next Steps

### Immediate (Today):
1. ✅ Mobile app working in standalone directory
2. ✅ TestFlight submission completed
3. 🔄 Create `carbly-mobile` GitHub repo
4. 🔄 Copy standalone to new repo
5. 🔄 Test build from new repo

### This Week:
1. Remove mobile from monorepo
2. Clean up web dependencies
3. Test web deployment
4. Update documentation

### Later:
1. Add Android support to mobile repo
2. Consider shared types package (if needed)
3. Set up separate CI/CD pipelines

---

## Questions & Decisions

**Q: What about shared UI components?**
A: Keep separate for now. Web uses Tailwind + shadcn, Mobile uses React Native components. Very different.

**Q: How do we keep API contracts in sync?**
A: Document in `docs/API.md` or use OpenAPI spec. Mobile team reviews web API changes.

**Q: What about database migrations?**
A: Stay in web repo. Mobile only consumes API, never touches database directly.

**Q: How do we share business logic?**
A: Most logic lives in API. Mobile is mostly UI + API calls. Minimal duplication.

---

## Conclusion

**Recommended:** Separate repos immediately.

**Why:**
- Mobile already works in standalone directory
- Web deployment currently blocked by conflicts
- Simple separation, big benefits
- Industry standard for multi-platform apps

**Timeline:** 1-2 hours to complete migration

**Risk:** Low (standalone proves mobile works independently)
