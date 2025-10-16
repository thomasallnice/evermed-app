#!/bin/bash
# Vercel Environment Variable Sync Script
#
# Syncs environment variables from local .env files to Vercel
# CRITICAL: Uses printf instead of echo to avoid newline corruption
#
# Issue: echo adds \n by default, corrupting API keys and secrets
# Solution: printf '%s' does NOT add newlines
#
# Created: 2025-10-16
# Related: Vercel deployment failure dpl_CxpJe5dv1h1ywZCCx4d5EuXn5oq2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
declare -i SYNCED_COUNT=0
declare -i SKIPPED_COUNT=0
declare -i FAILED_COUNT=0

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Vercel Environment Variable Sync Tool               ║${NC}"
echo -e "${BLUE}║                                                              ║${NC}"
echo -e "${BLUE}║  ⚠️  CRITICAL: Uses printf to prevent newline corruption   ║${NC}"
echo -e "${BLUE}║  Never use echo for syncing - it adds \\n to values!        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to sync a single environment file
sync_environment() {
  local env_file=$1
  local vercel_env=$2

  # Check if file exists
  if [ ! -f "$env_file" ]; then
    echo -e "${YELLOW}⏭️  Skipping $env_file (not found)${NC}"
    return 0
  fi

  echo -e "${BLUE}📁 Syncing $env_file → $vercel_env${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local file_synced=0

  # Read file line by line
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments
    if [[ "$line" =~ ^[[:space:]]*# ]]; then
      continue
    fi

    # Skip empty lines
    if [[ -z "$line" || "$line" =~ ^[[:space:]]*$ ]]; then
      continue
    fi

    # Extract KEY=value
    if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local value="${BASH_REMATCH[2]}"

      # Remove surrounding quotes if present
      value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

      # Skip if value is empty
      if [[ -z "$value" ]]; then
        echo -e "  ${YELLOW}⏭️  $key (empty value, skipped)${NC}"
        ((SKIPPED_COUNT++))
        continue
      fi

      # Remove old value first (prevent conflicts)
      vercel env rm "$key" "$vercel_env" --yes 2>/dev/null || true

      # Add new value using printf (NO NEWLINE!)
      # CRITICAL: printf '%s' does NOT add \n like echo does
      if printf '%s' "$value" | vercel env add "$key" "$vercel_env" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $key"
        ((SYNCED_COUNT++))
        ((file_synced++))
      else
        echo -e "  ${RED}✗${NC} $key (failed to sync)"
        ((FAILED_COUNT++))
      fi
    fi
  done < "$env_file"

  echo -e "${GREEN}✅ $file_synced variables synced from $env_file${NC}"
  echo ""
}

# Ask user which environments to sync
echo -e "${YELLOW}Which environments would you like to sync?${NC}"
echo "1) Development (.env.local)"
echo "2) Preview/Staging (.env.staging or .env.preview)"
echo "3) Production (.env.production)"
echo "4) All environments"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
  1)
    sync_environment ".env.local" "development"
    ;;
  2)
    if [ -f ".env.staging" ]; then
      sync_environment ".env.staging" "preview"
    elif [ -f ".env.preview" ]; then
      sync_environment ".env.preview" "preview"
    else
      echo -e "${RED}❌ No .env.staging or .env.preview file found${NC}"
      exit 1
    fi
    ;;
  3)
    sync_environment ".env.production" "production"
    ;;
  4)
    sync_environment ".env.local" "development"

    if [ -f ".env.staging" ]; then
      sync_environment ".env.staging" "preview"
    elif [ -f ".env.preview" ]; then
      sync_environment ".env.preview" "preview"
    fi

    sync_environment ".env.production" "production"
    ;;
  *)
    echo -e "${RED}❌ Invalid choice${NC}"
    exit 1
    ;;
esac

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      Sync Complete                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo -e "${GREEN}✓ Synced:  $SYNCED_COUNT variables${NC}"
echo -e "${YELLOW}⏭ Skipped: $SKIPPED_COUNT variables${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
  echo -e "${RED}✗ Failed:  $FAILED_COUNT variables${NC}"
fi
echo ""

# Verification prompt
echo -e "${YELLOW}Would you like to verify the synced variables? (y/n)${NC}"
read -p "> " verify

if [[ "$verify" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${BLUE}Fetching environment variables from Vercel...${NC}"
  echo ""

  case $choice in
    1)
      echo -e "${BLUE}Development:${NC}"
      vercel env ls development
      ;;
    2)
      echo -e "${BLUE}Preview/Staging:${NC}"
      vercel env ls preview
      ;;
    3)
      echo -e "${BLUE}Production:${NC}"
      vercel env ls production
      ;;
    4)
      echo -e "${BLUE}Development:${NC}"
      vercel env ls development
      echo ""
      echo -e "${BLUE}Preview/Staging:${NC}"
      vercel env ls preview
      echo ""
      echo -e "${BLUE}Production:${NC}"
      vercel env ls production
      ;;
  esac
fi

echo ""
echo -e "${GREEN}✅ Sync complete! Deploy to apply changes:${NC}"
echo -e "   ${BLUE}vercel --prod${NC}   (for production)"
echo -e "   ${BLUE}git push origin dev${NC}   (for preview deployment)"
echo ""

# Important reminder
echo -e "${RED}⚠️  IMPORTANT REMINDER:${NC}"
echo -e "${RED}   Never use 'echo' to pipe values to vercel env add${NC}"
echo -e "${RED}   Always use 'printf' to avoid newline corruption${NC}"
echo -e "${RED}   This script uses printf exclusively for safety${NC}"
echo ""
