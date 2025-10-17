# Environment Variables Best Practices for React Native/Expo

## Current Setup (Development)

**File:** `apps/mobile/.env`
```bash
EXPO_PUBLIC_SUPABASE_URL=https://wukrnqifpgjwbqxpockm.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_API_URL=https://getclarimed.com
```

This works for local development and uses your production Supabase instance.

---

## Production Build Best Practices

### Option 1: Multiple .env Files (Recommended for Expo)

Expo supports environment-specific files:

```
apps/mobile/
  ├── .env                 # Default (used if no environment specified)
  ├── .env.development     # Development (expo start)
  ├── .env.staging         # Staging builds
  ├── .env.production      # Production builds (expo build, eas build)
```

**How Expo loads them:**
- Development: `.env.development` → `.env` → defaults
- Production build: `.env.production` → `.env` → defaults
- Staging build: `.env.staging` → `.env` → defaults

**Example Setup:**

**`.env.development`** (local development, use staging Supabase):
```bash
EXPO_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...staging-key
EXPO_PUBLIC_API_URL=http://localhost:3000
```

**`.env.production`** (production builds, use production Supabase):
```bash
EXPO_PUBLIC_SUPABASE_URL=https://wukrnqifpgjwbqxpockm.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...production-key
EXPO_PUBLIC_API_URL=https://getclarimed.com
```

### Option 2: EAS Build Secrets (Most Secure - Recommended for Sensitive Data)

For production builds with EAS (Expo Application Services):

**1. Store secrets in EAS:**
```bash
eas secret:create --scope project --name SUPABASE_URL --value "https://..."
eas secret:create --scope project --name SUPABASE_ANON_KEY --value "eyJ..."
eas secret:create --scope project --name API_URL --value "https://..."
```

**2. Reference in `eas.json`:**
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "@SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "@SUPABASE_ANON_KEY",
        "EXPO_PUBLIC_API_URL": "@API_URL"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "@STAGING_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "@STAGING_SUPABASE_ANON_KEY"
      }
    }
  }
}
```

**Benefits:**
- Secrets never committed to git
- Different secrets per build profile
- Secure storage in EAS servers
- Team members don't need access to production secrets

### Option 3: Build-Time Configuration (Advanced)

Use Expo's app config function (`app.config.js`) to dynamically set values:

**`app.config.js`:**
```javascript
export default ({ config }) => {
  const isProduction = process.env.APP_VARIANT === 'production'

  return {
    ...config,
    name: isProduction ? 'EverMed' : 'EverMed Dev',
    slug: 'evermed',
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      eas: {
        projectId: 'your-eas-project-id'
      }
    }
  }
}
```

**Access in code:**
```typescript
import Constants from 'expo-constants'

const supabaseUrl = Constants.expoConfig.extra.supabaseUrl
const supabaseAnonKey = Constants.expoConfig.extra.supabaseAnonKey
```

---

## Recommended Setup for EverMed

### Phase 1: Development (Current - What You Have Now)

**File:** `.env`
```bash
EXPO_PUBLIC_SUPABASE_URL=https://wukrnqifpgjwbqxpockm.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_URL=https://getclarimed.com
```

**When to use:** Local development, testing on simulator/device

### Phase 2: Pre-Production (When You Start Building for TestFlight)

**Add these files:**

**`.env.development`** (local dev with staging backend):
```bash
EXPO_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...staging-key
EXPO_PUBLIC_API_URL=https://staging.getclarimed.com
```

**`.env.production`** (production builds):
```bash
EXPO_PUBLIC_SUPABASE_URL=https://wukrnqifpgjwbqxpockm.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...production-key
EXPO_PUBLIC_API_URL=https://getclarimed.com
```

**Build commands:**
```bash
# Development build (uses .env.development)
expo start

# Production build (uses .env.production)
eas build --profile production
```

### Phase 3: Production (App Store Release)

**Use EAS Secrets for maximum security:**

```bash
# Store production secrets in EAS
eas secret:create --scope project --name PROD_SUPABASE_URL --value "https://wukrnqifpgjwbqxpockm.supabase.co"
eas secret:create --scope project --name PROD_SUPABASE_ANON_KEY --value "eyJ..."
eas secret:create --scope project --name PROD_API_URL --value "https://getclarimed.com"

# Store staging secrets
eas secret:create --scope project --name STAGING_SUPABASE_URL --value "https://staging.supabase.co"
eas secret:create --scope project --name STAGING_SUPABASE_ANON_KEY --value "eyJ..."
```

**Update `eas.json`:**
```json
{
  "build": {
    "production": {
      "ios": {
        "bundleIdentifier": "com.evermed.mobile"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "@PROD_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "@PROD_SUPABASE_ANON_KEY",
        "EXPO_PUBLIC_API_URL": "@PROD_API_URL"
      }
    },
    "preview": {
      "ios": {
        "bundleIdentifier": "com.evermed.mobile.staging"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "@STAGING_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "@STAGING_SUPABASE_ANON_KEY",
        "EXPO_PUBLIC_API_URL": "@STAGING_API_URL"
      }
    }
  }
}
```

---

## Security Best Practices

### 1. Never Commit .env Files (Already Configured)

**`.gitignore`** (verify this exists):
```gitignore
# Environment variables
.env
.env.local
.env.development
.env.production
.env.staging

# BUT keep the example
!.env.example
```

### 2. Use EXPO_PUBLIC_ Prefix Carefully

**⚠️ Warning:** Variables with `EXPO_PUBLIC_` prefix are embedded in the app bundle and can be extracted by anyone who downloads your app.

**Safe to expose (already public):**
- ✅ `EXPO_PUBLIC_SUPABASE_URL` - Public URL
- ✅ `EXPO_PUBLIC_SUPABASE_ANON_KEY` - **Public** anon key (row-level security enforced)
- ✅ `EXPO_PUBLIC_API_URL` - Public API URL

**NEVER expose:**
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - Bypasses RLS, full admin access
- ❌ `JWT_SECRET` - Can forge authentication tokens
- ❌ Private API keys with admin privileges

### 3. Environment Variable Validation

Add runtime validation in your Supabase client:

**`apps/mobile/src/api/supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// Validation
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please check your .env file.\n' +
    'Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY'
  )
}

if (!supabaseUrl.includes('.supabase.co')) {
  throw new Error('Invalid EXPO_PUBLIC_SUPABASE_URL format')
}

if (!supabaseAnonKey.startsWith('eyJ')) {
  throw new Error('Invalid EXPO_PUBLIC_SUPABASE_ANON_KEY format (should be a JWT)')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

---

## Common Pitfalls to Avoid

### 1. ❌ Hardcoding Production Secrets
```typescript
// NEVER DO THIS
const supabaseUrl = 'https://wukrnqifpgjwbqxpockm.supabase.co'
```

### 2. ❌ Using .env Files in Production Builds
```bash
# Bad: .env files get committed or shared via Slack
# Good: Use EAS Secrets for production builds
```

### 3. ❌ Forgetting to Restart Metro After .env Changes
```bash
# Always restart Metro when you change .env
lsof -ti:8081 | xargs kill -9
npm start -- --clear
```

### 4. ❌ Mixing Development and Production Credentials
```bash
# Bad: Using production Supabase in development
# Good: Use staging Supabase for development
```

### 5. ❌ Exposing Service Role Keys
```bash
# NEVER use EXPO_PUBLIC_ prefix for service role keys
# Service role keys should NEVER be in mobile apps
```

---

## Migration Path for EverMed

### Step 1: Current State (What You Have Now)
- ✅ Single `.env` file with production credentials
- ✅ Works for local development
- ⚠️ No separation between dev/staging/production

### Step 2: Add Environment-Specific Files (Next Sprint)
```bash
# Create these files (do not commit to git)
cp .env .env.development
cp .env .env.production

# Update .env.development to use staging (when available)
# Keep .env.production with production values
```

### Step 3: Set Up EAS Build (Before TestFlight)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Initialize EAS in your project
cd apps/mobile
eas build:configure

# Store secrets
eas secret:create --scope project --name PROD_SUPABASE_URL --value "..."
eas secret:create --scope project --name PROD_SUPABASE_ANON_KEY --value "..."
```

### Step 4: First Production Build
```bash
# Build for TestFlight (uses .env.production or EAS secrets)
eas build --profile production --platform ios

# Submit to App Store Connect
eas submit --platform ios
```

---

## Summary: What to Do Right Now

**For Development (Current Phase):**
1. ✅ Keep using your current `.env` file (already set up)
2. ✅ Credentials are loaded (Metro confirmed: "env: export EXPO_PUBLIC_SUPABASE_URL...")
3. ✅ Reload the app in simulator (Cmd+R)
4. ✅ You should now see the login screen!

**Before TestFlight (Week 13-14):**
1. Create `.env.development` and `.env.production`
2. Set up EAS Build account
3. Store production secrets in EAS
4. Test builds with both environments

**For Production Release (Week 15):**
1. Use EAS Secrets exclusively
2. Remove hardcoded credentials from `.env.production`
3. Verify secrets are loaded correctly in production builds
4. Submit to App Store with production configuration

---

## Resources

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [EAS Build Secrets](https://docs.expo.dev/build-reference/variables/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/api/api-keys)
- [React Native Security](https://reactnative.dev/docs/security)

---

**Next Step:** Reload your iOS app in the simulator (Cmd+R) - you should now see the login screen! 🎉
