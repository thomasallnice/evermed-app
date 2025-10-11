#!/usr/bin/env node

/**
 * Schema Validation Test Script
 *
 * Validates that the database schema matches Prisma schema expectations.
 * Tests critical tables and operations to ensure schema synchronization.
 *
 * Usage:
 *   DATABASE_URL="..." node scripts/test-schema.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

let exitCode = 0;

async function testAnalyticsEventSchema() {
  try {
    console.log('Testing AnalyticsEvent schema...');

    // Test creating an event with all required fields
    const event = await prisma.analyticsEvent.create({
      data: {
        eventType: 'test',
        eventName: 'schema_validation',
        metadata: { test: true, timestamp: new Date().toISOString() },
        sessionId: 'test-session-123'
      }
    });

    console.log('  ✅ AnalyticsEvent create successful');

    // Verify fields match expected schema
    if (!event.id || !event.eventType || !event.eventName || !event.createdAt) {
      throw new Error('Missing required fields in AnalyticsEvent');
    }

    console.log('  ✅ AnalyticsEvent fields validated');

    // Clean up
    await prisma.analyticsEvent.delete({ where: { id: event.id } });
    console.log('  ✅ AnalyticsEvent cleanup successful');

  } catch (error) {
    console.error('  ❌ AnalyticsEvent schema validation failed:', error.message);
    exitCode = 1;
  }
}

async function testPersonalModelSchema() {
  try {
    console.log('Testing PersonalModel schema...');

    // Just count records to verify table structure
    const count = await prisma.personalModel.count();
    console.log(`  ✅ PersonalModel query successful (${count} records)`);

    // Verify we can query with expected fields
    const models = await prisma.personalModel.findMany({
      take: 1,
      select: {
        id: true,
        personId: true,
        modelType: true,
        version: true,
        isActive: true,
        trainingMealsCount: true,
        trainingDataStart: true,
        trainingDataEnd: true,
        trainedAt: true,
        lastUsedAt: true,
        modelDataPath: true,
        accuracyMae: true,
        accuracyRmse: true,
        accuracyR2: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('  ✅ PersonalModel fields validated');

  } catch (error) {
    console.error('  ❌ PersonalModel schema validation failed:', error.message);
    exitCode = 1;
  }
}

async function testFoodEntrySchema() {
  try {
    console.log('Testing FoodEntry schema (Metabolic Insights)...');

    // Just count to verify table exists and is queryable
    const count = await prisma.foodEntry.count();
    console.log(`  ✅ FoodEntry query successful (${count} records)`);

  } catch (error) {
    console.error('  ❌ FoodEntry schema validation failed:', error.message);
    exitCode = 1;
  }
}

async function testFeatureFlagSchema() {
  try {
    console.log('Testing FeatureFlag schema...');

    // Query for the metabolic insights flag (should exist from migration)
    const flag = await prisma.featureFlag.findUnique({
      where: { name: 'metabolic_insights_enabled' }
    });

    if (flag) {
      console.log('  ✅ FeatureFlag query successful (found metabolic_insights_enabled)');
    } else {
      console.log('  ⚠️  FeatureFlag exists but metabolic_insights_enabled not found (may be expected)');
    }

  } catch (error) {
    console.error('  ❌ FeatureFlag schema validation failed:', error.message);
    exitCode = 1;
  }
}

async function testCoreTables() {
  try {
    console.log('Testing core tables (Person, Document, Observation)...');

    const personCount = await prisma.person.count();
    const documentCount = await prisma.document.count();
    const observationCount = await prisma.observation.count();

    console.log(`  ✅ Person table: ${personCount} records`);
    console.log(`  ✅ Document table: ${documentCount} records`);
    console.log(`  ✅ Observation table: ${observationCount} records`);

  } catch (error) {
    console.error('  ❌ Core tables validation failed:', error.message);
    exitCode = 1;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Schema Validation Test');
  console.log('='.repeat(60));
  console.log(`Database: ${process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'unknown'}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    await testCoreTables();
    console.log('');

    await testAnalyticsEventSchema();
    console.log('');

    await testPersonalModelSchema();
    console.log('');

    await testFoodEntrySchema();
    console.log('');

    await testFeatureFlagSchema();
    console.log('');

    console.log('='.repeat(60));
    if (exitCode === 0) {
      console.log('✅ All schema validations passed!');
    } else {
      console.log('❌ Some schema validations failed. Check logs above.');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Fatal error during schema validation:', error);
    exitCode = 1;
  } finally {
    await prisma.$disconnect();
    process.exit(exitCode);
  }
}

main();
