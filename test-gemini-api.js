// Test script to verify Gemini API configuration
// Run with: node test-gemini-api.js

const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.production
const envPath = path.join(__dirname, '.env.production');
const envContent = fs.readFileSync(envPath, 'utf-8');

const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
    process.env[key] = value;
  }
});

console.log('=== Gemini API Configuration Test ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log(`   GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT ? '✓' : '✗ MISSING'}`);
console.log(`   GOOGLE_APPLICATION_CREDENTIALS_JSON: ${process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? '✓' : '✗ MISSING'}`);
console.log(`   USE_GEMINI_FOOD_ANALYSIS: ${process.env.USE_GEMINI_FOOD_ANALYSIS}`);
console.log('');

// Parse credentials
console.log('2. Parsing credentials...');
let credentials;
try {
  const credentialsJson = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString('utf-8');
  credentials = JSON.parse(credentialsJson);
  console.log(`   ✓ Credentials parsed`);
  console.log(`   Service Account: ${credentials.client_email}`);
  console.log(`   Project ID: ${credentials.project_id}`);
  console.log('');
} catch (err) {
  console.error(`   ✗ Failed to parse credentials:`, err.message);
  process.exit(1);
}

// Initialize Vertex AI
console.log('3. Initializing Vertex AI...');
try {
  const vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: 'us-central1',
    googleAuthOptions: {
      credentials: credentials,
    },
  });
  console.log('   ✓ Vertex AI initialized');
  console.log('');
} catch (err) {
  console.error('   ✗ Failed to initialize Vertex AI:', err.message);
  process.exit(1);
}

// Try to get model
console.log('4. Getting generative model...');
try {
  const vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: 'us-central1',
    googleAuthOptions: {
      credentials: credentials,
    },
  });

  const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
  });
  console.log('   ✓ Model obtained: gemini-2.5-flash');
  console.log('');
  console.log('=== Configuration Test PASSED ===');
  console.log('');
  console.log('Next steps:');
  console.log('1. Verify these env vars are set in Vercel dashboard');
  console.log('2. Check Vercel runtime logs for actual errors');
  console.log('3. Try uploading a food photo and check logs');
} catch (err) {
  console.error('   ✗ Failed to get model:', err.message);
  console.error('   Error details:', err);
  process.exit(1);
}
