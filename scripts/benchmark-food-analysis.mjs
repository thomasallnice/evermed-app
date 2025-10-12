#!/usr/bin/env node
/**
 * Benchmark script: Gemini 2.5 Flash vs GPT-4.1-mini for food analysis
 *
 * Usage:
 *   node scripts/benchmark-food-analysis.mjs
 */

import { VertexAI } from '@google-cloud/vertexai'
import OpenAI from 'openai'
import { readFileSync, readdirSync, writeFileSync } from 'fs'
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

// Initialize clients
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: 'us-central1',
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Test images directory
const testImagesDir = join(projectRoot, 'graphics/dummy-food')

// System prompt (same for both models)
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
- Return empty array if no food is visible

Analyze this food photo and provide nutritional information for each ingredient. Return only JSON, no markdown.`

/**
 * Test Gemini 2.5 Flash
 */
async function testGemini(imagePath, imageName) {
  const startTime = Date.now()

  try {
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    })

    const imageBuffer = readFileSync(imagePath)
    const imageBase64 = imageBuffer.toString('base64')

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: systemPrompt },
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

    // Parse JSON
    const cleanedContent = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const analysisData = JSON.parse(cleanedContent)

    // Calculate cost (Gemini 2.5 Flash: $0.075/1M input, $0.30/1M output)
    const inputTokens = Math.ceil((systemPrompt.length / 4) + (imageBase64.length / 1000))
    const outputTokens = Math.ceil(responseText.length / 4)
    const costUSD = (inputTokens * 0.075 / 1_000_000) + (outputTokens * 0.30 / 1_000_000)

    return {
      success: true,
      provider: 'Gemini 2.5 Flash',
      model: 'gemini-2.5-flash',
      imageName,
      responseTimeMs,
      ingredients: analysisData.ingredients || [],
      totalCalories: analysisData.ingredients?.reduce((sum, ing) => sum + (ing.calories || 0), 0) || 0,
      rawResponse: responseText.substring(0, 500),
      costUSD,
      inputTokens,
      outputTokens
    }
  } catch (error) {
    return {
      success: false,
      provider: 'Gemini 2.5 Flash',
      model: 'gemini-2.5-flash',
      imageName,
      responseTimeMs: Date.now() - startTime,
      error: error.message,
      ingredients: [],
      totalCalories: 0,
      costUSD: 0
    }
  }
}

/**
 * Test OpenAI GPT-4.1-mini
 */
async function testOpenAI(imagePath, imageName) {
  const startTime = Date.now()

  try {
    const imageBuffer = readFileSync(imagePath)
    const imageBase64 = imageBuffer.toString('base64')
    const dataUrl = `data:image/jpeg;base64,${imageBase64}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
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
              text: 'Analyze this food photo and provide nutritional information. Return only JSON, no markdown.'
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_completion_tokens: 2000,
    })

    const responseTimeMs = Date.now() - startTime
    const responseText = response.choices[0]?.message?.content || ''

    // Parse JSON
    const cleanedContent = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const analysisData = JSON.parse(cleanedContent)

    // Calculate cost (GPT-4.1-mini: $0.25/1M input, $2.00/1M output)
    const inputTokens = response.usage?.prompt_tokens || 0
    const outputTokens = response.usage?.completion_tokens || 0
    const costUSD = (inputTokens * 0.25 / 1_000_000) + (outputTokens * 2.00 / 1_000_000)

    return {
      success: true,
      provider: 'OpenAI GPT-4.1-mini',
      model: 'gpt-4.1-mini',
      imageName,
      responseTimeMs,
      ingredients: analysisData.ingredients || [],
      totalCalories: analysisData.ingredients?.reduce((sum, ing) => sum + (ing.calories || 0), 0) || 0,
      rawResponse: responseText.substring(0, 500),
      costUSD,
      inputTokens,
      outputTokens
    }
  } catch (error) {
    return {
      success: false,
      provider: 'OpenAI GPT-4.1-mini',
      model: 'gpt-4.1-mini',
      imageName,
      responseTimeMs: Date.now() - startTime,
      error: error.message,
      ingredients: [],
      totalCalories: 0,
      costUSD: 0
    }
  }
}

/**
 * Main benchmark function
 */
async function runBenchmark() {
  console.log('🏁 Starting Food Analysis Benchmark')
  console.log('=====================================\n')

  console.log('Configuration:')
  console.log(`  Google Cloud Project: ${process.env.GOOGLE_CLOUD_PROJECT}`)
  console.log(`  OpenAI API Key: ${process.env.OPENAI_API_KEY?.substring(0, 20)}...`)
  console.log(`  Test Images: ${testImagesDir}\n`)

  // Get test images (limit to first 5 for reasonable benchmark time)
  const imageFiles = readdirSync(testImagesDir)
    .filter(file => file.match(/\.(jpg|jpeg|png|webp)$/i))
    .slice(0, 5)

  if (imageFiles.length === 0) {
    console.error('❌ No test images found in graphics/dummy-food/')
    process.exit(1)
  }

  console.log(`Found ${imageFiles.length} test images to benchmark\n`)
  console.log('='.repeat(80) + '\n')

  const results = []

  for (const imageFile of imageFiles) {
    const imagePath = join(testImagesDir, imageFile)
    console.log(`\n📸 Testing: ${imageFile}`)
    console.log('-'.repeat(80))

    // Test Gemini
    console.log('\n🤖 Gemini 2.5 Flash...')
    const geminiResult = await testGemini(imagePath, imageFile)

    if (geminiResult.success) {
      console.log(`  ✅ Success: ${geminiResult.ingredients.length} ingredients, ${geminiResult.totalCalories} cal`)
      console.log(`  ⏱️  Time: ${geminiResult.responseTimeMs}ms`)
      console.log(`  💰 Cost: $${geminiResult.costUSD.toFixed(6)}`)
    } else {
      console.log(`  ❌ Failed: ${geminiResult.error}`)
    }

    // Wait a bit to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Test OpenAI
    console.log('\n🤖 OpenAI GPT-4.1-mini...')
    const openaiResult = await testOpenAI(imagePath, imageFile)

    if (openaiResult.success) {
      console.log(`  ✅ Success: ${openaiResult.ingredients.length} ingredients, ${openaiResult.totalCalories} cal`)
      console.log(`  ⏱️  Time: ${openaiResult.responseTimeMs}ms`)
      console.log(`  💰 Cost: $${openaiResult.costUSD.toFixed(6)}`)
    } else {
      console.log(`  ❌ Failed: ${openaiResult.error}`)
    }

    results.push({
      image: imageFile,
      gemini: geminiResult,
      openai: openaiResult
    })

    console.log('\n' + '-'.repeat(80))
  }

  // Generate summary
  console.log('\n\n📊 BENCHMARK SUMMARY')
  console.log('='.repeat(80) + '\n')

  const geminiSuccesses = results.filter(r => r.gemini.success).length
  const openaiSuccesses = results.filter(r => r.openai.success).length

  const geminiAvgTime = results.filter(r => r.gemini.success)
    .reduce((sum, r) => sum + r.gemini.responseTimeMs, 0) / geminiSuccesses || 0
  const openaiAvgTime = results.filter(r => r.openai.success)
    .reduce((sum, r) => sum + r.openai.responseTimeMs, 0) / openaiSuccesses || 0

  const geminiTotalCost = results.reduce((sum, r) => sum + r.gemini.costUSD, 0)
  const openaiTotalCost = results.reduce((sum, r) => sum + r.openai.costUSD, 0)

  console.log('Success Rate:')
  console.log(`  Gemini 2.5 Flash: ${geminiSuccesses}/${results.length} (${(geminiSuccesses / results.length * 100).toFixed(1)}%)`)
  console.log(`  OpenAI GPT-4.1-mini: ${openaiSuccesses}/${results.length} (${(openaiSuccesses / results.length * 100).toFixed(1)}%)\n`)

  console.log('Average Response Time:')
  console.log(`  Gemini 2.5 Flash: ${geminiAvgTime.toFixed(0)}ms`)
  console.log(`  OpenAI GPT-4.1-mini: ${openaiAvgTime.toFixed(0)}ms`)
  console.log(`  Winner: ${geminiAvgTime < openaiAvgTime ? 'Gemini ✅ (faster)' : 'OpenAI ✅ (faster)'}\n`)

  console.log('Total Cost:')
  console.log(`  Gemini 2.5 Flash: $${geminiTotalCost.toFixed(6)}`)
  console.log(`  OpenAI GPT-4.1-mini: $${openaiTotalCost.toFixed(6)}`)
  const costSavings = ((openaiTotalCost - geminiTotalCost) / openaiTotalCost * 100)
  console.log(`  Savings: ${costSavings > 0 ? `Gemini saves ${costSavings.toFixed(1)}% ✅` : `OpenAI saves ${Math.abs(costSavings).toFixed(1)}%`}\n`)

  console.log('Detailed Results:')
  console.log('='.repeat(80))

  results.forEach((result, idx) => {
    console.log(`\n${idx + 1}. ${result.image}`)
    console.log(`   Gemini: ${result.gemini.success ? `${result.gemini.ingredients.length} ingredients, ${result.gemini.totalCalories} cal, ${result.gemini.responseTimeMs}ms, $${result.gemini.costUSD.toFixed(6)}` : `FAILED: ${result.gemini.error}`}`)
    console.log(`   OpenAI: ${result.openai.success ? `${result.openai.ingredients.length} ingredients, ${result.openai.totalCalories} cal, ${result.openai.responseTimeMs}ms, $${result.openai.costUSD.toFixed(6)}` : `FAILED: ${result.openai.error}`}`)
  })

  console.log('\n' + '='.repeat(80))

  // Save results to JSON
  const outputPath = join(projectRoot, 'docs/benchmark-results.json')
  writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\n💾 Full results saved to: ${outputPath}`)

  console.log('\n✅ Benchmark complete!')
}

runBenchmark().catch(error => {
  console.error('\n❌ Benchmark failed:', error)
  process.exit(1)
})
