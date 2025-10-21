#!/usr/bin/env node
/**
 * Mobile API Compatibility Test Suite
 *
 * Validates that the food upload API works correctly for mobile apps
 * Tests multi-photo uploads, validation, error handling, and response formats
 *
 * Usage:
 *   node scripts/test-mobile-api-compatibility.mjs
 *
 * Requirements:
 *   - Local dev server running (npm run dev)
 *   - Test user account with valid userId
 *   - Sample food photos in tests/fixtures/
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-mobile-api'

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logTest(name) {
  console.log(`\n${colors.bright}${colors.blue}TEST: ${name}${colors.reset}`)
}

function logSuccess(message) {
  log(`  ✅ ${message}`, 'green')
}

function logError(message) {
  log(`  ❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`  ⚠️  ${message}`, 'yellow')
}

function logInfo(message) {
  log(`  ℹ️  ${message}`, 'cyan')
}

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
}

function recordTest(name, passed, message) {
  results.tests.push({ name, passed, message })
  if (passed) {
    results.passed++
    logSuccess(message)
  } else {
    results.failed++
    logError(message)
  }
}

// Helper: Create test photo blob
function createTestImage(name = 'test.jpg', sizeKB = 100) {
  // Create a small JPEG-like buffer for testing
  const buffer = Buffer.alloc(sizeKB * 1024, 0xFF)

  // Add JPEG header (FFD8FFE0)
  buffer[0] = 0xFF
  buffer[1] = 0xD8
  buffer[2] = 0xFF
  buffer[3] = 0xE0

  return {
    name,
    buffer,
    type: 'image/jpeg',
    size: buffer.length,
  }
}

// Helper: Upload food photos
async function uploadFoodPhotos(photos, mealType = 'lunch') {
  const formData = new FormData()

  // Add photos with numbered fields (photo1, photo2, etc.)
  photos.forEach((photo, index) => {
    const blob = new Blob([photo.buffer], { type: photo.type })
    formData.append(`photo${index + 1}`, blob, photo.name)
  })

  formData.append('mealType', mealType)
  formData.append('eatenAt', new Date().toISOString())

  const response = await fetch(`${API_BASE_URL}/api/metabolic/food`, {
    method: 'POST',
    headers: {
      'x-user-id': TEST_USER_ID,
    },
    body: formData,
  })

  return { response, data: response.ok ? await response.json() : await response.text() }
}

// Test 1: Single photo upload
async function testSinglePhotoUpload() {
  logTest('Single Photo Upload')

  try {
    const photo = createTestImage('breakfast.jpg', 100)
    const { response, data } = await uploadFoodPhotos([photo], 'breakfast')

    if (!response.ok) {
      recordTest('single-photo', false, `HTTP ${response.status}: ${data}`)
      return
    }

    // Validate response structure
    const requiredFields = [
      'foodEntryId',
      'photoUrls',
      'mealType',
      'timestamp',
      'analysisStatus',
      'ingredients',
      'totalCalories',
    ]

    const missingFields = requiredFields.filter(field => !(field in data))
    if (missingFields.length > 0) {
      recordTest('single-photo', false, `Missing fields: ${missingFields.join(', ')}`)
      return
    }

    // Validate types
    if (typeof data.foodEntryId !== 'string') {
      recordTest('single-photo', false, 'foodEntryId must be string')
      return
    }

    if (!Array.isArray(data.photoUrls) || data.photoUrls.length !== 1) {
      recordTest('single-photo', false, `Expected 1 photo URL, got ${data.photoUrls?.length || 0}`)
      return
    }

    if (data.analysisStatus !== 'pending') {
      recordTest('single-photo', false, `Expected analysisStatus='pending', got '${data.analysisStatus}'`)
      return
    }

    recordTest('single-photo', true, 'Single photo uploaded successfully')
    logInfo(`Food entry ID: ${data.foodEntryId}`)
    logInfo(`Photo URL: ${data.photoUrls[0]}`)

  } catch (error) {
    recordTest('single-photo', false, `Exception: ${error.message}`)
  }
}

// Test 2: Multi-photo upload (2 photos)
async function testMultiPhotoUpload() {
  logTest('Multi-Photo Upload (2 photos)')

  try {
    const photos = [
      createTestImage('main-course.jpg', 120),
      createTestImage('side-dish.jpg', 80),
    ]

    const { response, data } = await uploadFoodPhotos(photos, 'dinner')

    if (!response.ok) {
      recordTest('multi-photo-2', false, `HTTP ${response.status}: ${data}`)
      return
    }

    if (!Array.isArray(data.photoUrls) || data.photoUrls.length !== 2) {
      recordTest('multi-photo-2', false, `Expected 2 photo URLs, got ${data.photoUrls?.length || 0}`)
      return
    }

    recordTest('multi-photo-2', true, '2 photos uploaded successfully')
    logInfo(`Food entry ID: ${data.foodEntryId}`)
    logInfo(`Photo URLs: ${data.photoUrls.join(', ')}`)

  } catch (error) {
    recordTest('multi-photo-2', false, `Exception: ${error.message}`)
  }
}

// Test 3: Multi-photo upload (5 photos - max)
async function testMaxPhotosUpload() {
  logTest('Multi-Photo Upload (5 photos - maximum)')

  try {
    const photos = [
      createTestImage('photo1.jpg', 100),
      createTestImage('photo2.jpg', 100),
      createTestImage('photo3.jpg', 100),
      createTestImage('photo4.jpg', 100),
      createTestImage('photo5.jpg', 100),
    ]

    const { response, data } = await uploadFoodPhotos(photos, 'snack')

    if (!response.ok) {
      recordTest('multi-photo-5', false, `HTTP ${response.status}: ${data}`)
      return
    }

    if (!Array.isArray(data.photoUrls) || data.photoUrls.length !== 5) {
      recordTest('multi-photo-5', false, `Expected 5 photo URLs, got ${data.photoUrls?.length || 0}`)
      return
    }

    recordTest('multi-photo-5', true, '5 photos uploaded successfully (max limit)')
    logInfo(`Food entry ID: ${data.foodEntryId}`)

  } catch (error) {
    recordTest('multi-photo-5', false, `Exception: ${error.message}`)
  }
}

// Test 4: Photo size validation (5MB limit)
async function testPhotoSizeValidation() {
  logTest('Photo Size Validation (5MB limit per photo)')

  try {
    // Create photo >5MB
    const largePhoto = createTestImage('large-photo.jpg', 6000) // 6MB

    const { response, data } = await uploadFoodPhotos([largePhoto], 'lunch')

    if (response.status !== 413) {
      recordTest('photo-size-validation', false, `Expected HTTP 413, got ${response.status}`)
      return
    }

    const error = typeof data === 'string' ? JSON.parse(data) : data
    if (!error.error || !error.error.includes('5MB')) {
      recordTest('photo-size-validation', false, 'Error message does not mention 5MB limit')
      return
    }

    recordTest('photo-size-validation', true, 'Correctly rejected photo >5MB')
    logInfo(`Error message: ${error.error}`)

  } catch (error) {
    recordTest('photo-size-validation', false, `Exception: ${error.message}`)
  }
}

// Test 5: Total size validation (15MB limit)
async function testTotalSizeValidation() {
  logTest('Total Size Validation (15MB limit across all photos)')

  try {
    // Create 4 photos of 4MB each = 16MB total (exceeds 15MB limit)
    const photos = [
      createTestImage('photo1.jpg', 4000),
      createTestImage('photo2.jpg', 4000),
      createTestImage('photo3.jpg', 4000),
      createTestImage('photo4.jpg', 4000),
    ]

    const { response, data } = await uploadFoodPhotos(photos, 'dinner')

    if (response.status !== 413) {
      recordTest('total-size-validation', false, `Expected HTTP 413, got ${response.status}`)
      return
    }

    const error = typeof data === 'string' ? JSON.parse(data) : data
    if (!error.error || !error.error.includes('15MB')) {
      recordTest('total-size-validation', false, 'Error message does not mention 15MB limit')
      return
    }

    recordTest('total-size-validation', true, 'Correctly rejected total size >15MB')
    logInfo(`Error message: ${error.error}`)

  } catch (error) {
    recordTest('total-size-validation', false, `Exception: ${error.message}`)
  }
}

// Test 6: Missing photo validation
async function testMissingPhotoValidation() {
  logTest('Missing Photo Validation')

  try {
    const formData = new FormData()
    formData.append('mealType', 'breakfast')
    formData.append('eatenAt', new Date().toISOString())
    // No photos attached

    const response = await fetch(`${API_BASE_URL}/api/metabolic/food`, {
      method: 'POST',
      headers: {
        'x-user-id': TEST_USER_ID,
      },
      body: formData,
    })

    const data = await response.json()

    if (response.status !== 400) {
      recordTest('missing-photo', false, `Expected HTTP 400, got ${response.status}`)
      return
    }

    if (!data.error || !data.error.includes('photo')) {
      recordTest('missing-photo', false, 'Error message does not mention missing photo')
      return
    }

    recordTest('missing-photo', true, 'Correctly rejected request without photos')
    logInfo(`Error message: ${data.error}`)

  } catch (error) {
    recordTest('missing-photo', false, `Exception: ${error.message}`)
  }
}

// Test 7: Invalid meal type validation
async function testInvalidMealTypeValidation() {
  logTest('Invalid Meal Type Validation')

  try {
    const photo = createTestImage('test.jpg', 100)
    const formData = new FormData()
    const blob = new Blob([photo.buffer], { type: photo.type })
    formData.append('photo', blob, photo.name)
    formData.append('mealType', 'brunch') // Invalid meal type
    formData.append('eatenAt', new Date().toISOString())

    const response = await fetch(`${API_BASE_URL}/api/metabolic/food`, {
      method: 'POST',
      headers: {
        'x-user-id': TEST_USER_ID,
      },
      body: formData,
    })

    const data = await response.json()

    if (response.status !== 400) {
      recordTest('invalid-meal-type', false, `Expected HTTP 400, got ${response.status}`)
      return
    }

    if (!data.error || !data.error.includes('mealType')) {
      recordTest('invalid-meal-type', false, 'Error message does not mention mealType')
      return
    }

    recordTest('invalid-meal-type', true, 'Correctly rejected invalid mealType')
    logInfo(`Error message: ${data.error}`)

  } catch (error) {
    recordTest('invalid-meal-type', false, `Exception: ${error.message}`)
  }
}

// Test 8: Unauthorized request
async function testUnauthorizedRequest() {
  logTest('Unauthorized Request (no auth header)')

  try {
    const photo = createTestImage('test.jpg', 100)
    const formData = new FormData()
    const blob = new Blob([photo.buffer], { type: photo.type })
    formData.append('photo', blob, photo.name)
    formData.append('mealType', 'lunch')

    const response = await fetch(`${API_BASE_URL}/api/metabolic/food`, {
      method: 'POST',
      // No x-user-id header
      body: formData,
    })

    const data = await response.json()

    if (response.status !== 401) {
      recordTest('unauthorized', false, `Expected HTTP 401, got ${response.status}`)
      return
    }

    if (!data.error || !data.error.toLowerCase().includes('unauthorized')) {
      recordTest('unauthorized', false, 'Error message does not mention unauthorized')
      return
    }

    recordTest('unauthorized', true, 'Correctly rejected unauthorized request')
    logInfo(`Error message: ${data.error}`)

  } catch (error) {
    recordTest('unauthorized', false, `Exception: ${error.message}`)
  }
}

// Test 9: GET /api/metabolic/food (list entries)
async function testListFoodEntries() {
  logTest('GET /api/metabolic/food (list entries)')

  try {
    const response = await fetch(`${API_BASE_URL}/api/metabolic/food?limit=5`, {
      headers: {
        'x-user-id': TEST_USER_ID,
      },
    })

    if (!response.ok) {
      const data = await response.text()
      recordTest('list-entries', false, `HTTP ${response.status}: ${data}`)
      return
    }

    const data = await response.json()

    // Validate response structure
    if (!('entries' in data) || !('total' in data)) {
      recordTest('list-entries', false, 'Response missing entries or total fields')
      return
    }

    if (!Array.isArray(data.entries)) {
      recordTest('list-entries', false, 'entries field must be an array')
      return
    }

    recordTest('list-entries', true, `Retrieved ${data.entries.length} food entries (total: ${data.total})`)

    if (data.entries.length > 0) {
      const entry = data.entries[0]
      logInfo(`First entry: ${entry.mealType} at ${entry.timestamp}`)
      logInfo(`Calories: ${entry.totalCalories}, Ingredients: ${entry.ingredients.length}`)
    }

  } catch (error) {
    recordTest('list-entries', false, `Exception: ${error.message}`)
  }
}

// Test 10: TypeScript type compatibility check
async function testTypeScriptCompatibility() {
  logTest('TypeScript Type Compatibility')

  try {
    // Upload a photo
    const photo = createTestImage('test.jpg', 100)
    const { response, data } = await uploadFoodPhotos([photo], 'breakfast')

    if (!response.ok) {
      recordTest('typescript-types', false, 'Failed to upload test photo')
      return
    }

    // Check if response matches shared types
    const typeChecks = [
      { field: 'foodEntryId', type: 'string', value: data.foodEntryId },
      { field: 'photoUrls', type: 'array', value: data.photoUrls },
      { field: 'mealType', type: 'string', value: data.mealType },
      { field: 'timestamp', type: 'string', value: data.timestamp },
      { field: 'analysisStatus', type: 'string', value: data.analysisStatus },
      { field: 'totalCalories', type: 'number', value: data.totalCalories },
      { field: 'totalCarbsG', type: 'number', value: data.totalCarbsG },
      { field: 'totalProteinG', type: 'number', value: data.totalProteinG },
      { field: 'totalFatG', type: 'number', value: data.totalFatG },
      { field: 'totalFiberG', type: 'number', value: data.totalFiberG },
    ]

    const failures = []
    for (const check of typeChecks) {
      const actualType = Array.isArray(check.value) ? 'array' : typeof check.value
      if (actualType !== check.type) {
        failures.push(`${check.field}: expected ${check.type}, got ${actualType}`)
      }
    }

    if (failures.length > 0) {
      recordTest('typescript-types', false, `Type mismatches: ${failures.join(', ')}`)
      return
    }

    // Check if mealType matches enum
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack']
    if (!validMealTypes.includes(data.mealType)) {
      recordTest('typescript-types', false, `Invalid mealType: ${data.mealType}`)
      return
    }

    // Check if analysisStatus matches enum
    const validStatuses = ['pending', 'completed', 'failed']
    if (!validStatuses.includes(data.analysisStatus)) {
      recordTest('typescript-types', false, `Invalid analysisStatus: ${data.analysisStatus}`)
      return
    }

    recordTest('typescript-types', true, 'All types match TypeScript shared types')
    logInfo('Response structure compatible with @evermed/shared types')

  } catch (error) {
    recordTest('typescript-types', false, `Exception: ${error.message}`)
  }
}

// Main test runner
async function runAllTests() {
  log('\n' + '='.repeat(60), 'bright')
  log('Mobile API Compatibility Test Suite', 'bright')
  log('='.repeat(60) + '\n', 'bright')

  logInfo(`API Base URL: ${API_BASE_URL}`)
  logInfo(`Test User ID: ${TEST_USER_ID}`)
  logInfo('Starting tests...\n')

  // Run all tests sequentially
  await testSinglePhotoUpload()
  await testMultiPhotoUpload()
  await testMaxPhotosUpload()
  await testPhotoSizeValidation()
  await testTotalSizeValidation()
  await testMissingPhotoValidation()
  await testInvalidMealTypeValidation()
  await testUnauthorizedRequest()
  await testListFoodEntries()
  await testTypeScriptCompatibility()

  // Print summary
  log('\n' + '='.repeat(60), 'bright')
  log('Test Summary', 'bright')
  log('='.repeat(60), 'bright')

  log(`\nTotal Tests: ${results.passed + results.failed}`, 'bright')
  log(`Passed: ${results.passed}`, 'green')
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green')
  if (results.warnings > 0) {
    log(`Warnings: ${results.warnings}`, 'yellow')
  }

  // Print failed test details
  if (results.failed > 0) {
    log('\nFailed Tests:', 'red')
    results.tests.filter(t => !t.passed).forEach(test => {
      log(`  - ${test.name}: ${test.message}`, 'red')
    })
  }

  log('\n' + '='.repeat(60) + '\n', 'bright')

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0)
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`)
  console.error(error)
  process.exit(1)
})
