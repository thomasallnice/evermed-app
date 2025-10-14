#!/usr/bin/env node
/**
 * Comprehensive comparison test: Gemini 2.0 Flash vs OpenAI GPT-4o
 *
 * Tests both providers on identical food images and generates detailed comparison report
 *
 * Usage:
 *   node scripts/compare-gemini-vs-openai.mjs
 */

import { VertexAI } from '@google-cloud/vertexai'
import OpenAI from 'openai'
import { readFileSync } from 'fs'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get project root directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Load environment variables from .env.local
try {
  const envContent = readFileSync(join(projectRoot, '.env.local'), 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const [, key, value] = match
      if (!process.env[key]) {
        process.env[key] = value.trim()
      }
    }
  })
} catch (error) {
  console.error('Warning: Could not load .env.local', error.message)
}

// Test images - publicly available food images with known nutritional content
const testImages = [
  {
    name: 'Pizza Margherita',
    url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
    expectedIngredients: ['pizza dough', 'tomato sauce', 'mozzarella', 'basil'],
    category: 'Italian'
  },
  {
    name: 'Salmon Bowl',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    expectedIngredients: ['salmon', 'rice', 'vegetables', 'avocado'],
    category: 'Bowl'
  },
  {
    name: 'Burger with Fries',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    expectedIngredients: ['beef patty', 'bun', 'lettuce', 'french fries'],
    category: 'American'
  },
  {
    name: 'Greek Salad',
    url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
    expectedIngredients: ['tomatoes', 'cucumber', 'feta cheese', 'olives', 'onion'],
    category: 'Salad'
  },
  {
    name: 'Pasta Carbonara',
    url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
    expectedIngredients: ['pasta', 'bacon', 'egg', 'parmesan cheese'],
    category: 'Italian'
  }
]

// Initialize API clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: 'us-central1',
})

const geminiModel = vertexAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
})

// System prompt (identical for both providers)
const systemPrompt = `You are a nutritional analysis assistant. Analyze food photos and provide detailed nutritional information in JSON format.

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, no explanations.

Return a JSON object with this exact structure:
{
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": estimated_quantity_number_or_null,
      "unit": "g" | "ml" | "piece" | "cup" | null,
      "calories": number,
      "carbsG": number,
      "proteinG": number,
      "fatG": number,
      "fiberG": number
    }
  ]
}

Rules:
- Identify all visible food items
- Estimate portion sizes realistically
- Provide accurate nutritional values per ingredient
- If you cannot determine quantity, set it to null
- All numerical values must be positive numbers (not strings)
- Return empty array if no food is visible`

/**
 * Fetch image and convert to base64 (required for Gemini)
 */
async function fetchImageAsBase64(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('base64')
}

/**
 * Test OpenAI GPT-4o
 */
async function testOpenAI(imageUrl, imageName) {
  const startTime = Date.now()

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this food photo and provide nutritional information for each ingredient. Return only JSON, no markdown.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    })

    const responseTimeMs = Date.now() - startTime
    const content = response.choices[0]?.message?.content

    if (!content) {
      return {
        success: false,
        error: 'No response from OpenAI',
        responseTimeMs,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0
      }
    }

    // Parse JSON response
    const cleanedContent = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const analysisData = JSON.parse(cleanedContent)

    // OpenAI GPT-4o pricing: $2.50 per 1M input tokens, $10.00 per 1M output tokens
    const inputTokens = response.usage?.prompt_tokens || 0
    const outputTokens = response.usage?.completion_tokens || 0
    const cost = (inputTokens * 2.50 / 1_000_000) + (outputTokens * 10.00 / 1_000_000)

    return {
      success: true,
      ingredients: analysisData.ingredients || [],
      responseTimeMs,
      inputTokens,
      outputTokens,
      cost,
      rawResponse: content
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTimeMs: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0
    }
  }
}

/**
 * Test Gemini 2.0 Flash
 */
async function testGemini(imageUrl, imageName) {
  const startTime = Date.now()

  try {
    // Fetch and convert image to base64
    const imageBase64 = await fetchImageAsBase64(imageUrl)

    const result = await geminiModel.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: systemPrompt + '\n\nAnalyze this food photo and provide nutritional information for each ingredient. Return only JSON, no markdown.' },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }]
    })

    const responseTimeMs = Date.now() - startTime
    const response = result.response
    const candidates = await response.candidates
    const responseText = candidates[0]?.content?.parts?.[0]?.text || ''

    if (!responseText) {
      return {
        success: false,
        error: 'No response from Gemini',
        responseTimeMs,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0
      }
    }

    // Parse JSON response
    const cleanedContent = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const analysisData = JSON.parse(cleanedContent)

    // Gemini 2.0 Flash pricing: $0.075 per 1M input tokens, $0.30 per 1M output tokens
    const estimatedInputTokens = Math.ceil((systemPrompt.length / 4) + (imageBase64.length / 1000))
    const estimatedOutputTokens = Math.ceil(responseText.length / 4)
    const cost = (estimatedInputTokens * 0.075 / 1_000_000) + (estimatedOutputTokens * 0.30 / 1_000_000)

    return {
      success: true,
      ingredients: analysisData.ingredients || [],
      responseTimeMs,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      cost,
      rawResponse: responseText
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTimeMs: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0
    }
  }
}

/**
 * Calculate accuracy score based on expected ingredients
 */
function calculateAccuracy(detectedIngredients, expectedIngredients) {
  if (!detectedIngredients || detectedIngredients.length === 0) {
    return 0
  }

  const detectedNames = detectedIngredients.map(ing => ing.name.toLowerCase())
  let matchCount = 0

  for (const expected of expectedIngredients) {
    const found = detectedNames.some(name =>
      name.includes(expected.toLowerCase()) || expected.toLowerCase().includes(name)
    )
    if (found) matchCount++
  }

  return (matchCount / expectedIngredients.length) * 100
}

/**
 * Main test execution
 */
async function runComparison() {
  console.log('🧪 Gemini vs OpenAI Food Analysis Comparison')
  console.log('=' .repeat(80))
  console.log('')
  console.log(`Testing ${testImages.length} images with both providers...\n`)

  const results = []

  for (let i = 0; i < testImages.length; i++) {
    const image = testImages[i]
    console.log(`\n[${i + 1}/${testImages.length}] Testing: ${image.name}`)
    console.log('-'.repeat(80))

    // Test OpenAI
    console.log('  🤖 Testing OpenAI GPT-4o...')
    const openaiResult = await testOpenAI(image.url, image.name)
    if (openaiResult.success) {
      console.log(`     ✅ Success: ${openaiResult.ingredients.length} ingredients in ${openaiResult.responseTimeMs}ms ($${openaiResult.cost.toFixed(6)})`)
    } else {
      console.log(`     ❌ Failed: ${openaiResult.error}`)
    }

    // Wait 1 second between requests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Test Gemini
    console.log('  🤖 Testing Gemini 2.0 Flash...')
    const geminiResult = await testGemini(image.url, image.name)
    if (geminiResult.success) {
      console.log(`     ✅ Success: ${geminiResult.ingredients.length} ingredients in ${geminiResult.responseTimeMs}ms ($${geminiResult.cost.toFixed(6)})`)
    } else {
      console.log(`     ❌ Failed: ${geminiResult.error}`)
    }

    // Calculate accuracy scores
    const openaiAccuracy = openaiResult.success ? calculateAccuracy(openaiResult.ingredients, image.expectedIngredients) : 0
    const geminiAccuracy = geminiResult.success ? calculateAccuracy(geminiResult.ingredients, image.expectedIngredients) : 0

    results.push({
      image,
      openai: {
        ...openaiResult,
        accuracy: openaiAccuracy
      },
      gemini: {
        ...geminiResult,
        accuracy: geminiAccuracy
      }
    })

    // Wait 1 second between images
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Generate summary statistics
  console.log('\n\n📊 Summary Statistics')
  console.log('=' .repeat(80))

  const openaiStats = {
    successCount: results.filter(r => r.openai.success).length,
    avgResponseTime: results.filter(r => r.openai.success).reduce((sum, r) => sum + r.openai.responseTimeMs, 0) / results.filter(r => r.openai.success).length,
    avgAccuracy: results.filter(r => r.openai.success).reduce((sum, r) => sum + r.openai.accuracy, 0) / results.filter(r => r.openai.success).length,
    totalCost: results.reduce((sum, r) => sum + r.openai.cost, 0),
    p50ResponseTime: 0,
    p95ResponseTime: 0
  }

  const geminiStats = {
    successCount: results.filter(r => r.gemini.success).length,
    avgResponseTime: results.filter(r => r.gemini.success).reduce((sum, r) => sum + r.gemini.responseTimeMs, 0) / results.filter(r => r.gemini.success).length,
    avgAccuracy: results.filter(r => r.gemini.success).reduce((sum, r) => sum + r.gemini.accuracy, 0) / results.filter(r => r.gemini.success).length,
    totalCost: results.reduce((sum, r) => sum + r.gemini.cost, 0),
    p50ResponseTime: 0,
    p95ResponseTime: 0
  }

  // Calculate percentiles
  const openaiTimes = results.filter(r => r.openai.success).map(r => r.openai.responseTimeMs).sort((a, b) => a - b)
  const geminiTimes = results.filter(r => r.gemini.success).map(r => r.gemini.responseTimeMs).sort((a, b) => a - b)

  if (openaiTimes.length > 0) {
    openaiStats.p50ResponseTime = openaiTimes[Math.floor(openaiTimes.length * 0.5)]
    openaiStats.p95ResponseTime = openaiTimes[Math.floor(openaiTimes.length * 0.95)]
  }

  if (geminiTimes.length > 0) {
    geminiStats.p50ResponseTime = geminiTimes[Math.floor(geminiTimes.length * 0.5)]
    geminiStats.p95ResponseTime = geminiTimes[Math.floor(geminiTimes.length * 0.95)]
  }

  console.log('\nOpenAI GPT-4o:')
  console.log(`  Success Rate: ${openaiStats.successCount}/${results.length} (${(openaiStats.successCount / results.length * 100).toFixed(1)}%)`)
  console.log(`  Avg Accuracy: ${openaiStats.avgAccuracy.toFixed(1)}%`)
  console.log(`  Avg Response Time: ${openaiStats.avgResponseTime.toFixed(0)}ms`)
  console.log(`  p50 Response Time: ${openaiStats.p50ResponseTime.toFixed(0)}ms`)
  console.log(`  p95 Response Time: ${openaiStats.p95ResponseTime.toFixed(0)}ms`)
  console.log(`  Total Cost: $${openaiStats.totalCost.toFixed(6)}`)

  console.log('\nGemini 2.0 Flash:')
  console.log(`  Success Rate: ${geminiStats.successCount}/${results.length} (${(geminiStats.successCount / results.length * 100).toFixed(1)}%)`)
  console.log(`  Avg Accuracy: ${geminiStats.avgAccuracy.toFixed(1)}%`)
  console.log(`  Avg Response Time: ${geminiStats.avgResponseTime.toFixed(0)}ms`)
  console.log(`  p50 Response Time: ${geminiStats.p50ResponseTime.toFixed(0)}ms`)
  console.log(`  p95 Response Time: ${geminiStats.p95ResponseTime.toFixed(0)}ms`)
  console.log(`  Total Cost: $${geminiStats.totalCost.toFixed(6)}`)

  console.log('\nComparison:')
  console.log(`  Cost Savings: ${((1 - geminiStats.totalCost / openaiStats.totalCost) * 100).toFixed(1)}% cheaper with Gemini`)
  console.log(`  Speed Difference: ${openaiStats.avgResponseTime > geminiStats.avgResponseTime ? 'Gemini' : 'OpenAI'} is ${Math.abs(((geminiStats.avgResponseTime - openaiStats.avgResponseTime) / openaiStats.avgResponseTime) * 100).toFixed(1)}% faster`)
  console.log(`  Accuracy Difference: ${geminiStats.avgAccuracy > openaiStats.avgAccuracy ? 'Gemini' : 'OpenAI'} is ${Math.abs(geminiStats.avgAccuracy - openaiStats.avgAccuracy).toFixed(1)}% more accurate`)

  // Determine recommendation
  const costSavings = (1 - geminiStats.totalCost / openaiStats.totalCost) * 100
  const accuracyDiff = geminiStats.avgAccuracy - openaiStats.avgAccuracy
  const speedComparable = Math.abs(geminiStats.avgResponseTime - openaiStats.avgResponseTime) / openaiStats.avgResponseTime < 0.5 // Within 50%

  let recommendation = ''
  if (costSavings > 30 && accuracyDiff >= -5 && speedComparable) {
    recommendation = '✅ RECOMMEND: Enable Gemini (significant cost savings with comparable accuracy and speed)'
  } else if (accuracyDiff < -10) {
    recommendation = '❌ DO NOT ENABLE: OpenAI is significantly more accurate'
  } else if (geminiStats.avgResponseTime > 3000 && openaiStats.avgResponseTime < 2000) {
    recommendation = '⚠️ CAUTION: Gemini is too slow (>3s p95)'
  } else {
    recommendation = '⚠️ MIXED RESULTS: Review detailed results before deciding'
  }

  console.log(`\n${recommendation}\n`)

  // Save detailed results to JSON file
  const reportPath = join(projectRoot, 'docs/gemini-vs-openai-test-results.json')
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    testImages,
    results,
    openaiStats,
    geminiStats,
    recommendation
  }, null, 2))

  console.log(`📄 Detailed results saved to: ${reportPath}`)

  return { results, openaiStats, geminiStats, recommendation }
}

// Run the comparison
runComparison().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
