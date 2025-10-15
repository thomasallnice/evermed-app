#!/bin/bash

# EverMed Configuration Export Script
# Exports all project configuration without sensitive data
# Output: docs/CONFIG_EXPORT.md and config-backup.json

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting EverMed Configuration Export...${NC}"

# Set paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DOCS_DIR="$PROJECT_ROOT/docs"
OUTPUT_FILE="$DOCS_DIR/CONFIG_EXPORT.md"
BACKUP_FILE="$DOCS_DIR/config-backup.json"

# Create docs directory if it doesn't exist
mkdir -p "$DOCS_DIR"

# Get current date
EXPORT_DATE=$(date +"%Y-%m-%d %H:%M:%S")
EXPORT_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${YELLOW}📝 Creating CONFIG_EXPORT.md...${NC}"

# Start creating the markdown file
cat > "$OUTPUT_FILE" << 'EOF'
# EverMed Configuration Export

EOF

echo "**Export Date**: $EXPORT_DATE" >> "$OUTPUT_FILE"
echo "**Export Version**: 1.0.0" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Table of Contents
cat >> "$OUTPUT_FILE" << 'EOF'
## Table of Contents
1. [Environment Variables](#environment-variables)
2. [Package Dependencies](#package-dependencies)
3. [Vercel Configuration](#vercel-configuration)
4. [Database Schema](#database-schema)
5. [Project Structure](#project-structure)
6. [Git Configuration](#git-configuration)
7. [Build Configuration](#build-configuration)

---

EOF

# 1. Environment Variables (without secrets)
echo -e "${YELLOW}📋 Exporting environment variables...${NC}"
cat >> "$OUTPUT_FILE" << 'EOF'
## Environment Variables

### Public Variables (Client-safe)
```bash
# Development Environment (.env.development)
EOF

if [ -f "$FRONTEND_DIR/.env.development" ]; then
    grep "^NEXT_PUBLIC_" "$FRONTEND_DIR/.env.development" | sed 's/=.*/=<VALUE>/' >> "$OUTPUT_FILE" || true
fi

cat >> "$OUTPUT_FILE" << 'EOF'

# Staging Environment (.env.staging)
EOF

if [ -f "$FRONTEND_DIR/.env.staging" ]; then
    grep "^NEXT_PUBLIC_" "$FRONTEND_DIR/.env.staging" | sed 's/=.*/=<VALUE>/' >> "$OUTPUT_FILE" || true
fi

cat >> "$OUTPUT_FILE" << 'EOF'

# Production Environment (.env.production)
EOF

if [ -f "$FRONTEND_DIR/.env.production" ]; then
    grep "^NEXT_PUBLIC_" "$FRONTEND_DIR/.env.production" | sed 's/=.*/=<VALUE>/' >> "$OUTPUT_FILE" || true
fi

cat >> "$OUTPUT_FILE" << 'EOF'
```

### Private Variables (Server-only, keys hidden)
```bash
SUPABASE_SERVICE_ROLE_KEY=<HIDDEN>
SUPABASE_JWT_SECRET=<HIDDEN>
```

EOF

# 2. Package Dependencies
echo -e "${YELLOW}📦 Exporting package dependencies...${NC}"
cat >> "$OUTPUT_FILE" << 'EOF'
## Package Dependencies

### Frontend Dependencies (package.json)
```json
EOF

if [ -f "$FRONTEND_DIR/package.json" ]; then
    node -e "
    const pkg = require('$FRONTEND_DIR/package.json');
    const deps = {
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {}
    };
    console.log(JSON.stringify(deps, null, 2));
    " >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << 'EOF'
```

### Package Scripts
```json
EOF

if [ -f "$FRONTEND_DIR/package.json" ]; then
    node -e "
    const pkg = require('$FRONTEND_DIR/package.json');
    console.log(JSON.stringify(pkg.scripts || {}, null, 2));
    " >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << 'EOF'
```

EOF

# 3. Vercel Configuration
echo -e "${YELLOW}🚀 Exporting Vercel configuration...${NC}"
cat >> "$OUTPUT_FILE" << 'EOF'
## Vercel Configuration

### vercel.json
```json
EOF

if [ -f "$PROJECT_ROOT/vercel.json" ]; then
    cat "$PROJECT_ROOT/vercel.json" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << 'EOF'
```

### Deployment Settings
- **Framework**: Next.js
- **Node Version**: 20.x
- **Region**: Frankfurt (fra1)
- **Build Command**: `cd frontend && npm run build`
- **Output Directory**: `.next`
- **Install Command**: `cd frontend && npm install`

EOF

# 4. Database Schema
echo -e "${YELLOW}🗄️ Documenting database schema...${NC}"
cat >> "$OUTPUT_FILE" << 'EOF'
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

EOF

# 5. Project Structure
echo -e "${YELLOW}🌳 Generating project structure...${NC}"
cat >> "$OUTPUT_FILE" << 'EOF'
## Project Structure

```
EOF

# Generate tree structure (limit depth to avoid too much detail)
if command -v tree &> /dev/null; then
    cd "$PROJECT_ROOT"
    tree -L 3 -I 'node_modules|.next|.git|*.log|coverage|dist|build' >> "$OUTPUT_FILE"
else
    # Fallback if tree is not installed
    echo "app/" >> "$OUTPUT_FILE"
    echo "├── frontend/" >> "$OUTPUT_FILE"
    echo "│   ├── app/" >> "$OUTPUT_FILE"
    echo "│   ├── components/" >> "$OUTPUT_FILE"
    echo "│   ├── lib/" >> "$OUTPUT_FILE"
    echo "│   ├── public/" >> "$OUTPUT_FILE"
    echo "│   ├── scripts/" >> "$OUTPUT_FILE"
    echo "│   └── package.json" >> "$OUTPUT_FILE"
    echo "├── backend/" >> "$OUTPUT_FILE"
    echo "├── docs/" >> "$OUTPUT_FILE"
    echo "├── scripts/" >> "$OUTPUT_FILE"
    echo "└── vercel.json" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << 'EOF'
```

EOF

# 6. Git Configuration
echo -e "${YELLOW}🔀 Exporting Git configuration...${NC}"
cat >> "$OUTPUT_FILE" << 'EOF'
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
EOF

cd "$PROJECT_ROOT"
echo "Current Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')" >> "$OUTPUT_FILE"
echo "Remote Origin: $(git config --get remote.origin.url 2>/dev/null || echo 'not configured')" >> "$OUTPUT_FILE"
echo "Last Commit: $(git log -1 --oneline 2>/dev/null || echo 'no commits')" >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << 'EOF'
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

EOF

# 7. Build Configuration
echo -e "${YELLOW}🔧 Exporting build configuration...${NC}"
cat >> "$OUTPUT_FILE" << 'EOF'
## Build Configuration

### next.config.js
```javascript
EOF

if [ -f "$FRONTEND_DIR/next.config.js" ]; then
    cat "$FRONTEND_DIR/next.config.js" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << 'EOF'
```

### tsconfig.json
```json
EOF

if [ -f "$FRONTEND_DIR/tsconfig.json" ]; then
    cat "$FRONTEND_DIR/tsconfig.json" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << 'EOF'
```

### postcss.config.js
```javascript
EOF

if [ -f "$FRONTEND_DIR/postcss.config.js" ]; then
    cat "$FRONTEND_DIR/postcss.config.js" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << 'EOF'
```

### tailwind.config.ts
```typescript
EOF

if [ -f "$FRONTEND_DIR/tailwind.config.ts" ]; then
    head -50 "$FRONTEND_DIR/tailwind.config.ts" >> "$OUTPUT_FILE"
    echo "// ... (truncated for brevity)" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << 'EOF'
```

EOF

# Create JSON backup
echo -e "${YELLOW}💾 Creating config-backup.json...${NC}"

node -e "
const fs = require('fs');
const path = require('path');

const projectRoot = '$PROJECT_ROOT';
const frontendDir = '$FRONTEND_DIR';

const backup = {
  exportDate: '$EXPORT_DATE',
  exportVersion: '1.0.0',
  project: {
    name: 'EverMed',
    type: 'Next.js + Supabase',
    monorepo: true
  },
  environments: {
    development: {
      url: 'dev.evermed.ai',
      supabaseProject: 'wukrnqifpgjwbqxpockm'
    },
    staging: {
      url: 'staging.evermed.ai',
      supabaseProject: 'to-be-configured'
    },
    production: {
      url: 'app.evermed.ai',
      supabaseProject: 'to-be-configured'
    }
  },
  dependencies: {},
  scripts: {},
  vercelConfig: {},
  gitInfo: {
    branch: '$(git branch --show-current 2>/dev/null || echo "unknown")',
    lastCommit: '$(git log -1 --format="%H" 2>/dev/null || echo "unknown")'
  }
};

// Load package.json if exists
try {
  const pkg = require(path.join(frontendDir, 'package.json'));
  backup.dependencies = pkg.dependencies || {};
  backup.scripts = pkg.scripts || {};
} catch (e) {
  console.error('Could not load package.json');
}

// Load vercel.json if exists
try {
  const vercel = require(path.join(projectRoot, 'vercel.json'));
  backup.vercelConfig = vercel;
} catch (e) {
  console.error('Could not load vercel.json');
}

fs.writeFileSync('$BACKUP_FILE', JSON.stringify(backup, null, 2));
console.log('✅ Config backup created successfully');
"

# Add footer to markdown
cat >> "$OUTPUT_FILE" << EOF

---

## Export Summary

- **Export Date**: $EXPORT_DATE
- **Export File**: docs/CONFIG_EXPORT.md
- **Backup File**: docs/config-backup.json
- **Total Sections**: 7
- **Environment Files**: 3 (dev, staging, prod)
- **Database Tables**: 1 (family_members)

### Quick Restore Commands

\`\`\`bash
# Restore package dependencies
cd frontend && npm install

# Restore git configuration
git checkout development
git pull origin development

# Verify Vercel configuration
vercel

# Check Supabase connection
node scripts/check-auth-settings.js
\`\`\`

### Notes
- Sensitive values (API keys, secrets) are hidden for security
- This export captures the current state of configuration
- Use config-backup.json for programmatic access to settings
- Regular exports recommended before major changes

---

**Generated by**: export-config.sh
**Documentation Version**: 1.0.0
EOF

echo -e "${GREEN}✅ Configuration export complete!${NC}"
echo -e "${GREEN}📄 Output saved to: $OUTPUT_FILE${NC}"
echo -e "${GREEN}💾 Backup saved to: $BACKUP_FILE${NC}"

# Make script executable for future use
chmod +x "$SCRIPT_DIR/export-config.sh"