#!/bin/bash
set -e

echo "======================================================================"
echo "Pre-Push Validation Checks"
echo "======================================================================"
echo ""

# Check for uncommitted files
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Warning: You have uncommitted changes"
  git status --short
  echo ""
  read -p "Continue anyway? (yes/no) " -r
  if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "❌ Push cancelled. Commit your changes first."
    exit 1
  fi
fi

echo "1️⃣  Running TypeScript type check..."
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ Type check failed. Fix errors before pushing."
  exit 1
fi
echo "✅ Type check passed"
echo ""

echo "2️⃣  Running linter..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Fix errors before pushing."
  exit 1
fi
echo "✅ Linting passed"
echo ""

echo "3️⃣  Building project..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Fix errors before pushing."
  exit 1
fi
echo "✅ Build passed"
echo ""

echo "4️⃣  Checking for uncommitted migrations..."
if [ -n "$(git status --porcelain db/migrations)" ]; then
  echo "❌ Uncommitted migrations detected!"
  git status --short db/migrations
  echo ""
  echo "You must commit migrations before pushing."
  exit 1
fi
echo "✅ No uncommitted migrations"
echo ""

echo "======================================================================"
echo "✅ All pre-push checks passed!"
echo "======================================================================"
echo ""
echo "Safe to push. Remember to:"
echo "  1. Apply migrations to staging BEFORE deploying code to Vercel"
echo "  2. Run smoke tests after staging deployment"
echo "  3. Apply migrations to production BEFORE promoting to production"
echo ""
