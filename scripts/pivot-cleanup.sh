#!/bin/bash

# **GlucoLens Cleanup Script**
# Run this AFTER backing up your database
# This will remove all deprecated features

echo "🧹 Starting GlucoLens pivot cleanup..."
echo "⚠️  This will DELETE old features. Make sure you have a backup!"
echo ""
read -p "Have you backed up the database? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Please backup first: pg_dump your_database > backup.sql"
    exit 1
fi

echo ""
echo "📁 Removing old feature directories..."

# Remove old app directories
rm -rf apps/web/src/app/vault
rm -rf apps/web/src/app/packs  
rm -rf apps/web/src/app/chat
rm -rf apps/web/src/app/explain
rm -rf apps/web/src/app/share
rm -rf apps/web/src/app/track  # Will rebuild simpler version

# Remove old API routes
rm -rf apps/web/src/app/api/chat
rm -rf apps/web/src/app/api/documents
rm -rf apps/web/src/app/api/explain
rm -rf apps/web/src/app/api/extract
rm -rf apps/web/src/app/api/ocr
rm -rf apps/web/src/app/api/share-packs
rm -rf apps/web/src/app/api/shares
rm -rf apps/web/src/app/api/upload-document

# Remove old components
rm -rf apps/web/src/components/vault
rm -rf apps/web/src/components/packs
rm -rf apps/web/src/components/chat
rm -rf apps/web/src/components/documents
rm -rf apps/web/src/components/explain
rm -rf apps/web/src/components/share

# Remove old lib functions
rm -rf apps/web/src/lib/document-processing
rm -rf apps/web/src/lib/fhir
rm -rf apps/web/src/lib/medical
rm -rf apps/web/src/lib/ocr
rm -rf apps/web/src/lib/rag
rm -rf apps/web/src/lib/share

echo "✅ Old directories removed"
echo ""
echo "📦 Removing unused npm packages..."

cd apps/web

# Remove unused packages
npm uninstall \
  @google-cloud/documentai \
  pdf-parse \
  pdfjs-dist \
  mammoth \
  tesseract.js \
  @langchain/community \
  @langchain/core \
  langchain \
  @xenova/transformers \
  pdf2json \
  --save

echo "✅ Unused packages removed"
echo ""
echo "🔍 Finding remaining 'EverMed' references to update..."

# Find all files with "EverMed" or "evermed" references
grep -r -l "EverMed\|evermed" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.sql" . | head -20

echo ""
echo "📝 Next steps:"
echo "1. Run the database migration to drop old tables"
echo "2. Update all 'EverMed' references to 'GlucoLens'"
echo "3. Update environment variables"
echo "4. Create new app icons and branding"
echo ""
echo "🚀 Cleanup complete! Ready to build GlucoLens"
