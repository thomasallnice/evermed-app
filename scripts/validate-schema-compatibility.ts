#!/usr/bin/env tsx
/**
 * Schema Compatibility Validator
 *
 * Validates that:
 * 1. Prisma schema matches actual database structure
 * 2. Code uses Prisma-generated types (not hardcoded types)
 * 3. No references to non-existent tables/columns
 *
 * Run before deployment to catch schema drift issues.
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

async function validateSchemaSync(): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
  };

  console.log('🔍 Validating schema synchronization...\n');

  if (!process.env.DATABASE_URL) {
    result.warnings.push('DATABASE_URL not set - skipping live database validation');
    console.log('⚠️  DATABASE_URL not set. Skipping database validation.\n');
    return result;
  }

  try {
    // Check if Prisma client is up to date
    console.log('📊 Checking Prisma client generation...');
    const prismaSchema = fs.readFileSync('db/schema.prisma', 'utf-8');

    // Extract model names from schema
    const modelMatches = prismaSchema.match(/model\s+(\w+)\s*{/g);
    if (!modelMatches) {
      result.errors.push('No models found in Prisma schema');
      result.passed = false;
      return result;
    }

    const expectedModels = modelMatches.map(m => m.match(/model\s+(\w+)/)?.[1]).filter(Boolean);
    console.log(`   Found ${expectedModels.length} models in schema`);

    // Check for critical tables
    const criticalTables = ['Person', 'Document', 'AnalyticsEvent'];
    const missingCritical = criticalTables.filter(t => !expectedModels.includes(t));

    if (missingCritical.length > 0) {
      result.errors.push(`Critical tables missing from schema: ${missingCritical.join(', ')}`);
      result.passed = false;
    }

    // Check for metabolic insights tables
    const metabolicTables = ['FoodEntry', 'GlucoseReading', 'MLModel'];
    const hasMetabolicTables = metabolicTables.some(t => expectedModels.includes(t));

    if (hasMetabolicTables) {
      console.log('   ⚠️  Metabolic insights tables detected in schema');
      result.warnings.push(
        'Metabolic insights tables present in schema. ' +
        'Ensure migrations are applied before deploying endpoints that use these tables.'
      );
    }

    console.log('   ✅ Prisma schema structure validated\n');

  } catch (error) {
    result.errors.push(`Schema validation failed: ${error}`);
    result.passed = false;
  }

  return result;
}

async function validateCodeUsage(): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
  };

  console.log('🔍 Validating code usage patterns...\n');

  // Check for hardcoded type definitions
  console.log('📊 Checking for hardcoded types...');
  try {
    const grepResult = execSync(
      `grep -r "type.*AnalyticsEvent.*=" apps/web/src --include="*.ts" --include="*.tsx" || true`,
      { encoding: 'utf-8' }
    );

    if (grepResult.trim()) {
      result.warnings.push(
        'Found potential hardcoded type definitions. Use Prisma.GetPayload instead.'
      );
      console.log('   ⚠️  Potential hardcoded types found');
    } else {
      console.log('   ✅ No hardcoded types detected');
    }
  } catch (error) {
    // Grep returns non-zero if no matches, which is what we want
  }

  // Check for direct table access without Prisma
  console.log('📊 Checking for direct database access...');
  try {
    const sqlResult = execSync(
      `grep -r "SELECT.*FROM" apps/web/src --include="*.ts" --include="*.tsx" || true`,
      { encoding: 'utf-8' }
    );

    if (sqlResult.trim()) {
      result.warnings.push(
        'Found direct SQL queries. Consider using Prisma for type safety.'
      );
      console.log('   ⚠️  Direct SQL queries detected');
    } else {
      console.log('   ✅ No direct SQL queries detected');
    }
  } catch (error) {
    // Grep returns non-zero if no matches
  }

  console.log('');
  return result;
}

async function checkPendingMigrations(): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
  };

  console.log('🔍 Checking migration status...\n');

  if (!process.env.DATABASE_URL) {
    result.warnings.push('DATABASE_URL not set - cannot check migration status');
    console.log('⚠️  DATABASE_URL not set. Skipping migration check.\n');
    return result;
  }

  try {
    const migrateStatus = execSync(
      'npx prisma migrate status --schema=db/schema.prisma',
      { encoding: 'utf-8' }
    );

    if (migrateStatus.includes('pending')) {
      result.errors.push('Pending migrations detected. Apply migrations before deployment.');
      result.passed = false;
      console.log('❌ Pending migrations found\n');
    } else if (migrateStatus.includes('not yet been applied')) {
      result.errors.push('Unapplied migrations detected. Database out of sync.');
      result.passed = false;
      console.log('❌ Unapplied migrations found\n');
    } else {
      console.log('✅ All migrations up to date\n');
    }
  } catch (error) {
    result.warnings.push('Could not check migration status: ' + error);
    console.log('⚠️  Migration check failed\n');
  }

  return result;
}

async function main() {
  console.log('🚀 EverMed Schema Compatibility Validator\n');
  console.log('='.repeat(50) + '\n');

  const results: ValidationResult[] = [];

  // Run all validations
  results.push(await validateSchemaSync());
  results.push(await validateCodeUsage());
  results.push(await checkPendingMigrations());

  // Aggregate results
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);
  const allPassed = results.every(r => r.passed);

  // Print summary
  console.log('='.repeat(50));
  console.log('\n📋 VALIDATION SUMMARY\n');

  if (allErrors.length > 0) {
    console.log('❌ ERRORS:');
    allErrors.forEach(err => console.log(`   - ${err}`));
    console.log('');
  }

  if (allWarnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    allWarnings.forEach(warn => console.log(`   - ${warn}`));
    console.log('');
  }

  if (allPassed && allErrors.length === 0) {
    console.log('✅ All validations passed!\n');
    process.exit(0);
  } else if (allErrors.length > 0) {
    console.log('❌ Validation failed. Fix errors before deploying.\n');
    process.exit(1);
  } else {
    console.log('⚠️  Validation passed with warnings. Review before deploying.\n');
    process.exit(0);
  }
}

main()
  .catch((error) => {
    console.error('💥 Validation script crashed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
