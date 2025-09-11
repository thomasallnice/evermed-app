# EverMed Technical Specification

## 📁 Complete File Structure

### Repository Structure
```
/app (git root - /Users/Tom/Arbeiten/Arbeiten/2025_EverMedAi/app)
│
├── /frontend (Next.js application)
│   ├── /app (App Router - pages and API routes)
│   │   ├── /(auth) (Authentication pages)
│   │   │   ├── /login
│   │   │   └── /signup
│   │   ├── /(protected) (Authenticated pages)
│   │   │   ├── /dashboard
│   │   │   ├── /family
│   │   │   ├── /profile
│   │   │   └── /camera
│   │   ├── /api (API routes)
│   │   │   ├── /admin
│   │   │   ├── /env-check
│   │   │   └── /security-check
│   │   ├── layout.tsx (Root layout)
│   │   ├── page.tsx (Home page)
│   │   └── globals.css
│   │
│   ├── /components
│   │   ├── /layout
│   │   │   ├── MainLayout.tsx
│   │   │   ├── DesktopSidebar.tsx
│   │   │   └── MobileBottomNav.tsx
│   │   ├── /ui (Reusable components)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   └── /monitoring
│   │
│   ├── /lib
│   │   ├── /auth
│   │   │   └── AuthContext.tsx
│   │   ├── /supabase
│   │   │   ├── client.ts
│   │   │   └── admin.ts
│   │   └── utils.ts
│   │
│   ├── /public
│   │   ├── /icons (PWA icons)
│   │   ├── favicon.ico
│   │   ├── favicon.svg
│   │   └── manifest.json
│   │
│   ├── /scripts
│   │   ├── check-auth-settings.js
│   │   └── create-icons.js
│   │
│   ├── .env.development
│   ├── .env.staging
│   ├── .env.production
│   ├── .env.example
│   ├── .env.local (gitignored)
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   └── package.json
│
├── /backend (Python FastAPI - minimal/future use)
│   ├── /app
│   │   ├── __init__.py
│   │   └── main.py
│   └── requirements.txt
│
├── /docs
│   ├── AI_BRIEFING.md
│   └── TECHNICAL_SPEC.md (this file)
│
├── vercel.json (MUST be at root!)
├── .gitignore
├── package.json (root - minimal)
└── README.md
```

## 📦 Package Versions

### Core Dependencies
```json
{
  "next": "15.4.4",
  "react": "19.1.0",
  "react-dom": "19.1.0",
  "typescript": "^5"
}
```

### Styling & UI
```json
{
  "tailwindcss": "^4.1.11",
  "@tailwindcss/postcss": "^4.1.11",
  "@tailwindcss/typography": "^0.5.16",
  "autoprefixer": "^10.4.21",
  "postcss": "^8.5.6",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.3.1"
}
```

### Supabase & Auth
```json
{
  "@supabase/supabase-js": "^2.55.0",
  "@supabase/ssr": "^0.6.1",
  "jwt-decode": "^4.0.0"
}
```

### UI Components
```json
{
  "@radix-ui/react-alert-dialog": "^1.1.14",
  "@radix-ui/react-avatar": "^1.1.10",
  "@radix-ui/react-checkbox": "^1.3.2",
  "@radix-ui/react-dialog": "^1.1.14",
  "@radix-ui/react-select": "^2.2.5",
  "@radix-ui/react-tabs": "^1.1.12",
  "lucide-react": "^0.525.0",
  "framer-motion": "^12.23.11"
}
```

### Analytics & Monitoring
```json
{
  "@vercel/analytics": "^1.5.0",
  "@vercel/speed-insights": "^1.2.0",
  "web-vitals": "^3.5.2"
}
```

### Development Tools
```json
{
  "dotenv-cli": "^10.0.0",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19"
}
```

## 🚀 Vercel Configuration

### vercel.json (MUST be at repository root!)
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
  "outputDirectory": ".next"  // Relative to frontend, NOT "frontend/.next"!
}
```

### Vercel Dashboard Settings
- **Framework Preset**: Next.js
- **Root Directory**: Leave empty (vercel.json handles paths)
- **Build Command**: Override with vercel.json
- **Output Directory**: Override with vercel.json
- **Install Command**: Override with vercel.json
- **Node.js Version**: 20.x

### Environment Variables in Vercel
```bash
# Set for each environment (Development, Preview, Production)
NEXT_PUBLIC_SUPABASE_URL=[your-project-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
NEXT_PUBLIC_ENVIRONMENT=[development|staging|production]
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]  # No NEXT_PUBLIC_!
SUPABASE_JWT_SECRET=[your-jwt-secret]         # No NEXT_PUBLIC_!
```

## 🗄️ Database Architecture

### Single Table Design
```sql
-- Only ONE table needed for MVP
CREATE TABLE family_members (
  -- Primary fields
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  first_name TEXT NOT NULL,
  last_name TEXT,
  relationship TEXT, -- 'self', 'spouse', 'child', 'parent', etc.
  date_of_birth DATE,
  
  -- Health status (simplified)
  status TEXT DEFAULT 'all_well', -- 'all_well', 'needs_attention'
  last_status_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT, -- Simple text notes, no complex medical records
  
  -- Profile
  profile_photo_url TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_family_members_user_id ON family_members(primary_user_id);
CREATE INDEX idx_family_members_status ON family_members(status);
```

### Row Level Security (RLS) Policies
```sql
-- Enable RLS
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Simple policies without recursion
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

### What We DON'T Store (Intentionally)
- ❌ Detailed medical records
- ❌ Medication schedules
- ❌ Appointment calendars
- ❌ Insurance information
- ❌ Doctor contacts
- ❌ Medical documents
- ❌ Prescription history
- ❌ Allergy details
- ❌ Vaccination records
- ❌ Medical procedures

**Rationale**: Keep it simple for peace of mind, not medical management

## 🔐 Authentication Strategy

### Supabase Auth Configuration
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Email Verification Strategy
- **Setting**: Email confirmation OPTIONAL
- **Behavior**: Users can access app immediately
- **Reminders**: Soft, dismissible banners
- **Never Block**: Core features always accessible
- **Required For**: Only sensitive actions (export data, delete account)

### Demo Account
```
Email: demo@evermed.ai
Password: Demo123456!
Environment: Development only
Purpose: Quick testing without signup
```

### Auth Flow
1. **Signup** → Create account → Attempt auto-login
2. **If session exists** → Redirect to dashboard
3. **If no session** → Show email verification message → Redirect to login
4. **Login** → Authenticate → Dashboard
5. **Protected routes** → Auto-redirect to login if not authenticated

## 🔄 State Management

### React Context (Primary)
```typescript
// AuthContext for authentication state
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Supabase auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )
    return () => subscription.unsubscribe()
  }, [])
  
  return <AuthContext.Provider value={{ user, session, loading }}>
    {children}
  </AuthContext.Provider>
}
```

### Direct Supabase Queries
```typescript
// No Redux/Zustand needed - direct queries
const fetchFamilyMembers = async () => {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .order('created_at', { ascending: false })
  
  return data
}
```

### Real-time (Ready but Not Implemented)
```typescript
// Structure ready for future real-time updates
const subscription = supabase
  .channel('family_updates')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'family_members' },
    (payload) => console.log('Change:', payload)
  )
  .subscribe()
```

## 🔧 Configuration Files

### Environment Variables (.env.*)

#### Public Variables (Client-safe)
```bash
# Supabase Connection
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Environment Identification
NEXT_PUBLIC_ENVIRONMENT=development|staging|production
NEXT_PUBLIC_APP_ENV=development|staging|production

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true|false
NEXT_PUBLIC_ENABLE_DEBUG=true|false
NEXT_PUBLIC_SHOW_DEV_TOOLS=true|false
NEXT_PUBLIC_LOG_LEVEL=debug|info|warning|error

# Monitoring
NEXT_PUBLIC_MONITORING_WS=ws://localhost:8000/ws
```

#### Private Variables (Server-only, NO NEXT_PUBLIC_!)
```bash
# Supabase Admin Keys
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_JWT_SECRET=your-jwt-secret-minimum-32-chars

# Third-party Services (future)
OPENAI_API_KEY=sk-...
SENDGRID_API_KEY=SG...
STRIPE_SECRET_KEY=sk_live_...
```

### next.config.js
```javascript
module.exports = {
  reactStrictMode: true,
  experimental: {
    optimizeCss: false,  // Disabled to fix lazy loading issues
    scrollRestoration: true,
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB', 'INP']
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    dangerouslyAllowSVG: true
  },
  compress: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true  // Handle separately
  }
}
```

### tailwind.config.ts
```typescript
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        'evermed-green': '#4CAF50',
        'status-green': '#10B981',
        'status-yellow': '#F59E0B',
        'status-red': '#EF4444'
      }
    }
  }
}
```

### postcss.config.js
```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}  // Tailwind v4 with PostCSS
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
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
    "paths": {
      "@/*": ["./frontend/*"]
    }
  }
}
```

## 🎯 API Strategy

### Current: Direct Supabase Client
```typescript
// All data operations through Supabase client
const supabase = createBrowserClient(url, anonKey)

// CRUD operations
await supabase.from('family_members').select('*')
await supabase.from('family_members').insert({ ... })
await supabase.from('family_members').update({ ... })
await supabase.from('family_members').delete()
```

### Future: API Routes for Complex Operations
```typescript
// app/api/admin/users/route.ts
export async function GET() {
  const supabaseAdmin = createAdminClient()
  // Operations requiring service role key
}
```

### Backend (Minimal/Future)
- FastAPI skeleton exists but not used
- Ready for AI integrations
- Ready for complex business logic
- No current endpoints required

## 📱 PWA Configuration

### manifest.json
```json
{
  "name": "EverMed AI",
  "short_name": "EverMed",
  "description": "Your AI-powered family health management companion",
  "theme_color": "#3b82f6",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## 🚦 Build & Deployment Pipeline

### Development Workflow
```bash
# Local development
cd frontend
npm run dev              # Port 3001, uses .env.development

# Environment switching
npm run dev:staging      # Uses .env.staging
npm run dev:production   # Uses .env.production (careful!)

# Building
npm run build            # Production build
npm run build:analyze    # Bundle analysis
```

### Git Branch Strategy
```
main          → app.evermed.ai (production)
  ↑
staging       → staging.evermed.ai
  ↑
development   → dev.evermed.ai
  ↑
feature/xyz   → Local development
```

### CI/CD Pipeline (Vercel)
1. **Push to branch** → Triggers deployment
2. **Install** → `cd frontend && npm install`
3. **Build** → `cd frontend && npm run build`
4. **Deploy** → Upload `.next` directory
5. **Alias** → Assign domain based on branch

## 🐛 Known Issues & Solutions

### Issue #1: Vercel Path Resolution
**Problem**: Looking for `/vercel/path0/frontend/frontend/.next`
**Solution**: Set `outputDirectory: ".next"` in vercel.json

### Issue #2: Tailwind v4 Not Working
**Problem**: Standard config fails with v4
**Solution**: Use `@tailwindcss/postcss` in postcss.config.js

### Issue #3: TypeScript Database Types
**Problem**: Missing Database type from Supabase
**Solution**: Comment out until types generated: `// import type { Database }`

### Issue #4: React.lazy() Errors
**Problem**: Dynamic imports fail in production
**Solution**: Use static imports instead

### Issue #5: Multiple package-lock.json
**Problem**: Conflicts between root and frontend
**Solution**: Single lockfile at root level only

### Issue #6: RLS Infinite Recursion
**Problem**: Policies reference themselves
**Solution**: Simple, direct policies without subqueries

## 📊 Performance Targets

### Core Web Vitals
- **LCP**: < 2.5s (Largest Contentful Paint)
- **FID**: < 100ms (First Input Delay)
- **CLS**: < 0.1 (Cumulative Layout Shift)
- **TTFB**: < 600ms (Time to First Byte)

### Bundle Size Targets
- **Initial JS**: < 200KB
- **Total JS**: < 500KB
- **CSS**: < 50KB
- **Images**: Optimized with next/image

## 🔒 Security Considerations

### Environment Variables
- ✅ Public keys use `NEXT_PUBLIC_` prefix
- ✅ Private keys have NO prefix
- ✅ Service role key only in server-side code
- ✅ JWT secret never exposed to client

### Data Protection
- ✅ RLS policies on all tables
- ✅ User isolation by primary_user_id
- ✅ HTTPS only in production
- ✅ Secure cookies for auth
- ✅ CORS configured properly

### Future Requirements
- ⏳ HIPAA compliance (Phase 2)
- ⏳ End-to-end encryption
- ⏳ Audit logging
- ⏳ Data retention policies
- ⏳ GDPR compliance tools

## 📝 Testing Strategy

### Current Testing
- Manual testing in development
- Vercel preview deployments
- Browser testing (Chrome, Safari, Mobile)

### Future Testing
```json
{
  "jest": "^30.0.5",
  "@testing-library/react": "^16.3.0",
  "@testing-library/jest-dom": "^6.6.4",
  "@playwright/test": "^1.54.2"
}
```

## 🎨 Design System

### Color Palette
```css
:root {
  --primary: #4CAF50;        /* EverMed Green */
  --primary-dark: #388E3C;
  --primary-light: #81C784;
  
  --status-green: #10B981;   /* All Well */
  --status-yellow: #F59E0B;  /* Needs Attention */
  --status-red: #EF4444;     /* Urgent */
  
  --bg-primary: #FAFAF8;     /* Warm White */
  --bg-secondary: #F3F4F6;
  
  --text-primary: #111827;
  --text-secondary: #6B7280;
}
```

### Typography Scale
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

### Spacing System
```css
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-12: 3rem;      /* 48px */
```

## 📅 Version History

### v1.0.0 (MVP - Current)
- Basic authentication
- Family member management
- Status tracking
- Mobile responsive design
- PWA ready

### v1.1.0 (Planned)
- Real-time updates
- Push notifications
- Offline support
- Data export

### v2.0.0 (Future)
- AI health insights
- Medicine scanning
- Voice notes
- Family sharing
- Document storage

---

**Document Version**: 1.0.0
**Last Updated**: January 2025
**Maintained By**: EverMed Development Team