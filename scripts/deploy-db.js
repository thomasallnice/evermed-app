#!/usr/bin/env node

/**
 * Database Deployment Script
 *
 * Deploys Prisma migrations to Staging or Production Supabase environments
 *
 * Usage:
 *   node scripts/deploy-db.js staging
 *   node scripts/deploy-db.js production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const environment = process.argv[2];

if (!environment || !['staging', 'production'].includes(environment)) {
  console.error('❌ Error: Please specify environment (staging or production)');
  console.error('Usage: node scripts/deploy-db.js <staging|production>');
  process.exit(1);
}

console.log(`\n🚀 Deploying database to ${environment.toUpperCase()}...\n`);

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const envPrefix = environment === 'staging' ? 'SUPABASE_STAGING' : 'SUPABASE_PRODUCTION';
const projectRef = process.env[`${envPrefix}_PROJECT_REF`];
const dbPassword = process.env[`${envPrefix}_DB_PASSWORD`];

if (!projectRef || !dbPassword) {
  console.error(`❌ Error: Missing environment variables for ${environment}`);
  console.error(`\nRequired variables in .env:`);
  console.error(`  ${envPrefix}_PROJECT_REF`);
  console.error(`  ${envPrefix}_DB_PASSWORD`);
  console.error('\nPlease update your .env file with the correct values.');
  process.exit(1);
}

// Construct database URL
// Use connection pooler (port 6543) for better performance with Prisma
const databaseUrl = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

console.log(`📋 Environment: ${environment.toUpperCase()}`);
console.log(`🔗 Project Ref: ${projectRef}`);
console.log(`🗄️  Database URL: postgresql://postgres.${projectRef}:***@aws-0-us-west-1.pooler.supabase.com:6543/postgres\n`);

// Confirmation prompt for production
if (environment === 'production') {
  console.log('⚠️  WARNING: You are about to deploy to PRODUCTION!\n');
  console.log('This will run migrations that cannot be easily rolled back.');
  console.log('Make sure you have:');
  console.log('  1. Tested all migrations in staging');
  console.log('  2. Backed up the production database');
  console.log('  3. Reviewed the migration files\n');

  // In a real scenario, you might want to add a confirmation prompt here
  // For automated CI/CD, you can skip this or require an environment variable
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Type "DEPLOY" to continue: ', (answer) => {
    readline.close();
    if (answer !== 'DEPLOY') {
      console.log('\n❌ Deployment cancelled.');
      process.exit(0);
    }
    runDeployment(databaseUrl);
  });
} else {
  runDeployment(databaseUrl);
}

function runDeployment(databaseUrl) {
  try {
    // Set environment variable for Prisma
    process.env.DATABASE_URL = databaseUrl;

    console.log('📦 Running Prisma migrations...\n');

    // Change to db directory
    const dbDir = path.join(__dirname, '../db');

    // Run migrations
    execSync('npx prisma migrate deploy', {
      cwd: dbDir,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl }
    });

    console.log('\n✅ Database deployment completed successfully!\n');
    console.log('Next steps:');
    console.log(`  1. Verify deployment in Supabase dashboard:`);
    console.log(`     https://supabase.com/dashboard/project/${projectRef}/database/tables`);
    console.log(`  2. Test the application in ${environment} environment`);
    console.log(`  3. Monitor logs for any issues\n`);

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check your database credentials in .env');
    console.error('  2. Verify network connectivity to Supabase');
    console.error('  3. Check Supabase project status in dashboard');
    console.error('  4. Review migration files for syntax errors\n');
    process.exit(1);
  }
}
