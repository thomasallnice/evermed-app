/**
 * Staging Deployment Validation Script
 * Validates https://evermed-9nnk2slhs-thomasallnices-projects.vercel.app
 * with Vercel protection bypass token
 */

const STAGING_URL = 'https://evermed-9nnk2slhs-thomasallnices-projects.vercel.app';
const BYPASS_TOKEN = '0ggTnEkxNX4vk7a11q8VfXkj9hG7ksKl';
const DEMO_EMAIL = 'demo@evermed.local';
const DEMO_PASSWORD = 'demo123';

// Critical pages to validate
const CRITICAL_PAGES = [
  { path: '/', name: 'Home Page' },
  { path: '/auth/login', name: 'Login Page' },
  { path: '/vault', name: 'Vault Page' },
  { path: '/profile', name: 'Profile Page (CRITICAL - new health fields)' },
  { path: '/chat', name: 'Chat Page (CRITICAL - bubble design verification)' },
  { path: '/upload', name: 'Upload Page' },
  { path: '/packs', name: 'Share Packs Page' },
  { path: '/track', name: 'Track Page' }
];

// Test scenarios
const TEST_SCENARIOS = {
  profileHealthFields: {
    name: 'Profile Health Fields Test',
    description: 'Verify heightCm, weightKg, allergies, diet, behaviors fields work',
    critical: true
  },
  profileToastNotifications: {
    name: 'Profile Save Feedback',
    description: 'Verify toast notifications appear on profile save',
    critical: true
  },
  chatBubbleDesign: {
    name: 'Chat Bubble Design',
    description: 'Verify chat uses bubble design (NOT ChatGPT full-width)',
    critical: true
  },
  databaseConnectivity: {
    name: 'Database Connectivity',
    description: 'Verify all API endpoints return 200 (not 500 Prisma errors)',
    critical: true
  },
  consoleErrors: {
    name: 'Zero Console Errors',
    description: 'Verify no console.error or unhandled exceptions',
    critical: true,
    blockOnFailure: true
  },
  performanceMetrics: {
    name: 'Performance Validation',
    description: 'Verify all pages load < 10s (p95 threshold)',
    critical: true
  }
};

module.exports = {
  STAGING_URL,
  BYPASS_TOKEN,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  CRITICAL_PAGES,
  TEST_SCENARIOS
};
