# EverMed Configuration Export

**Export Date**: 2025-08-13 15:42:25
**Export Version**: 1.0.0

## Table of Contents
1. [Environment Variables](#environment-variables)
2. [Package Dependencies](#package-dependencies)
3. [Vercel Configuration](#vercel-configuration)
4. [Database Schema](#database-schema)
5. [Project Structure](#project-structure)
6. [Git Configuration](#git-configuration)
7. [Build Configuration](#build-configuration)

---

## Environment Variables

### Public Variables (Client-safe)
```bash
# Development Environment (.env.development)
NEXT_PUBLIC_SUPABASE_URL=<VALUE>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<VALUE>
NEXT_PUBLIC_ENVIRONMENT=<VALUE>
NEXT_PUBLIC_APP_ENV=<VALUE>
NEXT_PUBLIC_API_URL=<VALUE>
NEXT_PUBLIC_WS_URL=<VALUE>
NEXT_PUBLIC_ENABLE_ANALYTICS=<VALUE>
NEXT_PUBLIC_ENABLE_DEBUG=<VALUE>
NEXT_PUBLIC_ENABLE_MOCK_DATA=<VALUE>
NEXT_PUBLIC_SHOW_DEV_TOOLS=<VALUE>
NEXT_PUBLIC_LOG_LEVEL=<VALUE>
NEXT_PUBLIC_MONITORING_WS=<VALUE>

# Staging Environment (.env.staging)
NEXT_PUBLIC_SUPABASE_URL=<VALUE>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<VALUE>
NEXT_PUBLIC_ENVIRONMENT=<VALUE>
NEXT_PUBLIC_APP_ENV=<VALUE>
NEXT_PUBLIC_API_URL=<VALUE>
NEXT_PUBLIC_WS_URL=<VALUE>
NEXT_PUBLIC_ENABLE_ANALYTICS=<VALUE>
NEXT_PUBLIC_ENABLE_DEBUG=<VALUE>
NEXT_PUBLIC_ENABLE_MOCK_DATA=<VALUE>
NEXT_PUBLIC_SHOW_DEV_TOOLS=<VALUE>
NEXT_PUBLIC_LOG_LEVEL=<VALUE>
NEXT_PUBLIC_MONITORING_WS=<VALUE>

# Production Environment (.env.production)
NEXT_PUBLIC_SUPABASE_URL=<VALUE>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<VALUE>
NEXT_PUBLIC_ENVIRONMENT=<VALUE>
NEXT_PUBLIC_APP_ENV=<VALUE>
NEXT_PUBLIC_API_URL=<VALUE>
NEXT_PUBLIC_WS_URL=<VALUE>
NEXT_PUBLIC_ENABLE_ANALYTICS=<VALUE>
NEXT_PUBLIC_ENABLE_DEBUG=<VALUE>
NEXT_PUBLIC_ENABLE_MOCK_DATA=<VALUE>
NEXT_PUBLIC_SHOW_DEV_TOOLS=<VALUE>
NEXT_PUBLIC_LOG_LEVEL=<VALUE>
NEXT_PUBLIC_MONITORING_WS=<VALUE>
```

### Private Variables (Server-only, keys hidden)
```bash
SUPABASE_SERVICE_ROLE_KEY=<HIDDEN>
SUPABASE_JWT_SECRET=<HIDDEN>
```

## Package Dependencies

### Frontend Dependencies (package.json)
```json
{
  "dependencies": {
    "@next/bundle-analyzer": "^15.4.4",
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.2",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-radio-group": "^1.3.7",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-slider": "^1.3.5",
    "@radix-ui/react-switch": "^1.2.5",
    "@radix-ui/react-tabs": "^1.1.12",
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.55.0",
    "@tailwindcss/typography": "^0.5.16",
    "@tanstack/react-query": "^5.83.0",
    "@tanstack/react-query-devtools": "^5.83.0",
    "@tensorflow/tfjs": "^4.22.0",
    "@types/canvas-confetti": "^1.9.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/react-syntax-highlighter": "^15.5.13",
    "@types/uuid": "^10.0.0",
    "@vercel/analytics": "^1.5.0",
    "@vercel/speed-insights": "^1.2.0",
    "buffer": "^6.0.3",
    "canvas-confetti": "^1.9.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "critters": "^0.0.23",
    "crypto-browserify": "^3.12.1",
    "date-fns": "^4.1.0",
    "dexie": "^4.0.11",
    "dexie-react-hooks": "^1.1.7",
    "framer-motion": "^12.23.11",
    "jwt-decode": "^4.0.0",
    "lodash-es": "^4.17.21",
    "lucide-react": "^0.525.0",
    "next": "15.4.4",
    "next-pwa": "^5.6.0",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-dropzone": "^14.3.8",
    "react-markdown": "^10.1.0",
    "react-syntax-highlighter": "^15.6.1",
    "react-use-measure": "^2.1.7",
    "recharts": "^3.1.0",
    "rehype-raw": "^7.0.0",
    "remark-gfm": "^4.0.1",
    "sonner": "^2.0.6",
    "stream-browserify": "^3.0.0",
    "tailwind-merge": "^3.3.1",
    "typescript": "^5",
    "uuid": "^11.1.0",
    "web-vitals": "^3.5.2",
    "zustand": "^5.0.6"
  },
  "devDependencies": {
    "@faker-js/faker": "^9.9.0",
    "@playwright/test": "^1.54.2",
    "@tailwindcss/postcss": "^4.1.11",
    "@testing-library/jest-dom": "^6.6.4",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/jest": "^30.0.0",
    "@types/lodash-es": "^4.17.12",
    "autoprefixer": "^10.4.21",
    "dotenv-cli": "^10.0.0",
    "fake-indexeddb": "^6.0.1",
    "jest": "^30.0.5",
    "jest-environment-jsdom": "^30.0.5",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.11",
    "ts-jest": "^29.4.1",
    "webpack-bundle-analyzer": "^4.10.1"
  }
}
```

### Package Scripts
```json
{
  "dev": "NEXT_TELEMETRY_DISABLED=1 dotenv -e .env.development -- next dev -p 3001",
  "dev:local": "NEXT_TELEMETRY_DISABLED=1 next dev -p 3001",
  "dev:staging": "NEXT_TELEMETRY_DISABLED=1 dotenv -e .env.staging -- next dev -p 3001",
  "dev:production": "NEXT_TELEMETRY_DISABLED=1 dotenv -e .env.production -- next dev -p 3001",
  "dev:frontend": "NEXT_TELEMETRY_DISABLED=1 dotenv -e .env.development -- next dev -p 3001",
  "dev:backend": "cd backend && python -m uvicorn app.main:app --reload --port 8000",
  "dev:all": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
  "dev:turbo": "NEXT_TELEMETRY_DISABLED=1 next dev --turbopack",
  "build": "NEXT_TELEMETRY_DISABLED=1 next build",
  "build:staging": "NEXT_TELEMETRY_DISABLED=1 dotenv -e .env.staging -- next build",
  "build:production": "NEXT_TELEMETRY_DISABLED=1 dotenv -e .env.production -- next build",
  "build:analyze": "NEXT_TELEMETRY_DISABLED=1 ANALYZE=true next build",
  "start": "NEXT_TELEMETRY_DISABLED=1 next start",
  "start:staging": "NEXT_TELEMETRY_DISABLED=1 dotenv -e .env.staging -- next start -p 3000",
  "start:production": "NEXT_TELEMETRY_DISABLED=1 dotenv -e .env.production -- next start -p 3000",
  "backend:start": "cd backend && python -m uvicorn app.main:app --port 8000",
  "lint": "next lint",
  "lint:fix": "next lint --fix",
  "type-check": "tsc --noEmit",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:prioritization": "jest --testPathPatterns=\"prioritization\"",
  "test:prioritization:coverage": "jest --testPathPatterns=\"prioritization\" --coverage",
  "vercel-build": "NEXT_TELEMETRY_DISABLED=1 next build",
  "deploy:dev": "git checkout development && git push origin development",
  "deploy:staging": "git checkout staging && git push origin staging",
  "deploy:prod": "git checkout main && git push origin main",
  "deploy:vercel:dev": "vercel --env development",
  "deploy:vercel:staging": "vercel --env preview",
  "deploy:vercel:prod": "vercel --prod",
  "postbuild-disabled": "node scripts/patch-sw.js"
}
```

## Vercel Configuration

### vercel.json
```json
{
  "regions": ["fra1"],
  "functions": {
    "frontend/app/**/*.{js,jsx,ts,tsx}": {
      "runtime": "nodejs20.x",
      "maxDuration": 10
    }
  },
  "buildCommand": "cd frontend && npm run build",
  "installCommand": "cd frontend && npm install",
  "outputDirectory": ".next"
}
```

### Deployment Settings
- **Framework**: Next.js
- **Node Version**: 20.x
- **Region**: Frankfurt (fra1)
- **Build Command**: `cd frontend && npm run build`
- **Output Directory**: `.next`
- **Install Command**: `cd frontend && npm install`

## Database Schema

### Tables
```sql
-- family_members table
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  relationship TEXT,
  date_of_birth DATE,
  status TEXT DEFAULT 'all_well',
  last_status_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_family_members_user_id ON family_members(primary_user_id);
CREATE INDEX idx_family_members_status ON family_members(status);
```

### Row Level Security (RLS) Policies
```sql
-- Enable RLS
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own family members" 
  ON family_members FOR SELECT 
  USING (auth.uid() = primary_user_id);

CREATE POLICY "Users can insert own family members" 
  ON family_members FOR INSERT 
  WITH CHECK (auth.uid() = primary_user_id);

CREATE POLICY "Users can update own family members" 
  ON family_members FOR UPDATE 
  USING (auth.uid() = primary_user_id);

CREATE POLICY "Users can delete own family members" 
  ON family_members FOR DELETE 
  USING (auth.uid() = primary_user_id);
```

## Project Structure

```
app/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── scripts/
│   └── package.json
├── backend/
├── docs/
├── scripts/
└── vercel.json
```

## Git Configuration

### Branch Structure
```
main (production) → app.evermed.ai
  ↑
staging → staging.evermed.ai
  ↑
development → dev.evermed.ai
  ↑
feature/* → Local development
```

### Current Git Status
```bash
Current Branch: staging
Remote Origin: https://github.com/thomasallnice/evermed-app.git
Last Commit: 0ac84bf fix: resolve Vercel deployment path issues
```

### .gitignore Configuration
```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output

# Next.js
.next/
out/
build/
dist/

# Production
*.production

# Misc
.DS_Store
*.pem
.vscode/
.idea/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env.local
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
```

## Build Configuration

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable experimental features for performance
  experimental: {
    optimizeCss: false, // Disabled to fix lazy loading issues
    scrollRestoration: true, // Enable scroll restoration
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB', 'INP'],
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Bundle analyzer
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(
        new (require('@next/bundle-analyzer')({
          enabled: true,
          openAnalyzer: true,
        }))()
      )
      return config
    },
  }),

  // Images optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression and optimization
  compress: true,
  poweredByHeader: false,
  
  // Build optimization
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: false,
  },

  // Performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      // Cache static assets
      {
        source: '/icons/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Webpack optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle optimization
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }

    // Add performance optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      // Tree-shake unused imports
      'lodash': 'lodash-es',
    }

    return config
  },
}

module.exports = nextConfig```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}```

### postcss.config.js
```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}```

### tailwind.config.ts
```typescript
```


---

## Export Summary

- **Export Date**: 2025-08-13 15:42:25
- **Export File**: docs/CONFIG_EXPORT.md
- **Backup File**: docs/config-backup.json
- **Total Sections**: 7
- **Environment Files**: 3 (dev, staging, prod)
- **Database Tables**: 1 (family_members)

### Quick Restore Commands

```bash
# Restore package dependencies
cd frontend && npm install

# Restore git configuration
git checkout development
git pull origin development

# Verify Vercel configuration
vercel

# Check Supabase connection
node scripts/check-auth-settings.js
```

### Notes
- Sensitive values (API keys, secrets) are hidden for security
- This export captures the current state of configuration
- Use config-backup.json for programmatic access to settings
- Regular exports recommended before major changes

---

**Generated by**: export-config.sh
**Documentation Version**: 1.0.0
