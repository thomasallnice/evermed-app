#!/bin/bash

# ============================================================================
# Environment Setup Helper for EverMed
# Configures .env.local with your Supabase credentials
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
PROJECT_ID="jwarorrwgpqrksrxmesx"
PROJECT_URL="https://${PROJECT_ID}.supabase.co"
ENV_FILE="/Users/Tom/Arbeiten/Arbeiten/2025_EverMedAi/app/frontend/.env.local"
ENV_EXAMPLE="/Users/Tom/Arbeiten/Arbeiten/2025_EverMedAi/app/frontend/.env.example"

echo ""
echo -e "${BOLD}=====================================================================${NC}"
echo -e "${BOLD}                    EverMed Environment Setup                        ${NC}"
echo -e "${BOLD}=====================================================================${NC}"
echo -e "Project ID: ${BLUE}${PROJECT_ID}${NC}"
echo ""

# Check if .env.local exists
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env.local already exists${NC}"
    echo ""
    
    # Show current config (hide sensitive parts)
    echo "Current configuration:"
    grep "NEXT_PUBLIC_SUPABASE_URL" "$ENV_FILE" 2>/dev/null || echo "NEXT_PUBLIC_SUPABASE_URL=not set"
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ENV_FILE" 2>/dev/null; then
        KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ENV_FILE" | cut -d'=' -f2)
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${KEY:0:20}..."
    else
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=not set"
    fi
    grep "NEXT_PUBLIC_APP_ENV" "$ENV_FILE" 2>/dev/null || echo "NEXT_PUBLIC_APP_ENV=not set"
    
    echo ""
    read -p "Do you want to update the configuration? (yes/no): " update_config
    
    if [[ "$update_config" != "yes" ]]; then
        echo "Configuration unchanged."
        exit 0
    fi
    
    # Backup existing file
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✅ Backup created${NC}"
fi

# Get Supabase URL
echo ""
echo -e "${BOLD}Step 1: Supabase URL${NC}"
echo "======================================"
echo "Your Supabase URL is:"
echo -e "${BLUE}${PROJECT_URL}${NC}"
read -p "Is this correct? (yes/no): " url_correct

if [[ "$url_correct" != "yes" ]]; then
    read -p "Enter your Supabase URL: " PROJECT_URL
fi

# Get Anon Key
echo ""
echo -e "${BOLD}Step 2: Supabase Anon Key${NC}"
echo "======================================"
echo "To find your anon key:"
echo "1. Go to: https://app.supabase.com/project/${PROJECT_ID}/settings/api"
echo "2. Under 'Project API keys', copy the 'anon public' key"
echo ""
read -sp "Enter your Supabase Anon Key: " ANON_KEY
echo ""

# Validate anon key (basic check)
if [ ${#ANON_KEY} -lt 30 ]; then
    echo -e "${RED}❌ Invalid anon key (too short)${NC}"
    exit 1
fi

# Get environment
echo ""
echo -e "${BOLD}Step 3: Environment${NC}"
echo "======================================"
echo "Select environment:"
echo "1. development (local development)"
echo "2. staging (testing)"
echo "3. production (live)"
read -p "Enter choice (1-3): " env_choice

case $env_choice in
    1) APP_ENV="development" ;;
    2) APP_ENV="staging" ;;
    3) APP_ENV="production" ;;
    *) APP_ENV="development" ;;
esac

# Optional: Backend URL
echo ""
echo -e "${BOLD}Step 4: Backend URL (Optional)${NC}"
echo "======================================"
echo "If you have a custom backend, enter the URL."
echo "Press Enter to skip and use default."
read -p "Backend URL (or press Enter): " BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    BACKEND_URL="http://localhost:8000"
fi

# Create .env.local
echo ""
echo -e "${BLUE}Creating .env.local...${NC}"

cat > "$ENV_FILE" <<EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${PROJECT_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}

# Environment
NEXT_PUBLIC_APP_ENV=${APP_ENV}

# Backend API (if using custom backend)
NEXT_PUBLIC_BACKEND_URL=${BACKEND_URL}

# Feature Flags
NEXT_PUBLIC_ENABLE_AI=true
NEXT_PUBLIC_ENABLE_CAMERA=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true

# Demo User (for testing)
NEXT_PUBLIC_DEMO_EMAIL=demo@evermed.ai
NEXT_PUBLIC_DEMO_PASSWORD=123456
EOF

echo -e "${GREEN}✅ .env.local created${NC}"

# Create .env.example if it doesn't exist
if [ ! -f "$ENV_EXAMPLE" ]; then
    cat > "$ENV_EXAMPLE" <<EOF
# Copy this file to .env.local and fill in your values

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Environment
NEXT_PUBLIC_APP_ENV=development

# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Feature Flags
NEXT_PUBLIC_ENABLE_AI=true
NEXT_PUBLIC_ENABLE_CAMERA=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true

# Demo User
NEXT_PUBLIC_DEMO_EMAIL=demo@evermed.ai
NEXT_PUBLIC_DEMO_PASSWORD=123456
EOF
    echo -e "${GREEN}✅ .env.example created${NC}"
fi

# Test the configuration
echo ""
echo -e "${BOLD}Testing Configuration${NC}"
echo "======================================"

# Check if we can reach Supabase
if curl -s "${PROJECT_URL}/rest/v1/" -H "apikey: ${ANON_KEY}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Supabase connection successful${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify Supabase connection${NC}"
    echo "   This might be normal if CORS is configured."
fi

# Summary
echo ""
echo -e "${BOLD}=====================================================================${NC}"
echo -e "${GREEN}                    ✅ Environment Setup Complete!                   ${NC}"
echo -e "${BOLD}=====================================================================${NC}"
echo ""
echo "Your environment has been configured with:"
echo "  • Supabase URL: ${PROJECT_URL}"
echo "  • Environment: ${APP_ENV}"
echo "  • Backend URL: ${BACKEND_URL}"
echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo "1. Run migrations: ./scripts/apply_remote.sh"
echo "2. Start the app: npm run dev"
echo "3. Open: http://localhost:3001"
echo "4. Login with: demo@evermed.ai / 123456"
echo ""
echo -e "${BLUE}Supabase Dashboard:${NC}"
echo "https://app.supabase.com/project/${PROJECT_ID}"
echo ""