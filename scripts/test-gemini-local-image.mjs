#!/usr/bin/env node
/**
 * Test script for Gemini food analysis with local image
 *
 * Usage:
 *   node scripts/test-gemini-local-image.mjs [image-path]
 *
 * Example:
 *   node scripts/test-gemini-local-image.mjs docs/dummy-food/National-Dish-of-Italy-Pizza.webp
 */

import { VertexAI } from '@google-cloud/vertexai'
import { readFileSync } from 'fs'
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

// Test image path
const imagePath = process.argv[2] || join(projectRoot, 'docs/dummy-food/National-Dish-of-Italy-Pizza.webp')

console.log('🧪 Testing Gemini Food Analysis (Local Image)')
console.log('===============================================\n')

console.log('Configuration:')
console.log(`  Project ID: ${process.env.GOOGLE_CLOUD_PROJECT}`)
console.log(`  Credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`)
console.log(`  Image Path: ${imagePath}\n`)

async function testGemini() {
  try {
    console.log('📡 Initializing Vertex AI client...')

    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: 'us-central1',
    })

    console.log('✅ Vertex AI client initialized\n')

    console.log('📥 Reading local image file...')
    const imageBuffer = readFileSync(imagePath)
    const imageBase64 = imageBuffer.toString('base64')
    console.log(`✅ Image loaded (${(imageBase64.length / 1024).toFixed(2)} KB)\n`)

    console.log('🤖 Getting Gemini 2.5 Flash model...')
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    })
    console.log('✅ Model loaded\n')

    const prompt = `You are a nutritional analysis assistant. Analyze food photos and provide detailed nutritional information in JSON format.

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

    console.log('🔍 Analyzing food photo with Gemini...')
    const startTime = Date.now()

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }]
    })

    const endTime = Date.now()
    const responseTime = endTime - startTime

    const response = result.response
    const candidates = await response.candidates
    const responseText = candidates[0]?.content?.parts?.[0]?.text || ''

    console.log(`✅ Analysis completed in ${responseTime}ms\n`)

    console.log('📄 Raw Response:')
    console.log(responseText)
    console.log('\n' + '='.repeat(80) + '\n')

    // Parse JSON
    const cleanedContent = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const analysisData = JSON.parse(cleanedContent)

    console.log('✅ Parsed Analysis Results:')
    console.log(JSON.stringify(analysisData, null, 2))
    console.log('\n' + '='.repeat(80) + '\n')

    // Calculate totals
    if (analysisData.ingredients && analysisData.ingredients.length > 0) {
      const totalCalories = analysisData.ingredients.reduce((sum, ing) => sum + (ing.calories || 0), 0)
      const totalCarbs = analysisData.ingredients.reduce((sum, ing) => sum + (ing.carbsG || 0), 0)
      const totalProtein = analysisData.ingredients.reduce((sum, ing) => sum + (ing.proteinG || 0), 0)
      const totalFat = analysisData.ingredients.reduce((sum, ing) => sum + (ing.fatG || 0), 0)
      const totalFiber = analysisData.ingredients.reduce((sum, ing) => sum + (ing.fiberG || 0), 0)

      console.log('📊 Nutritional Summary:')
      console.log(`  Ingredients Detected: ${analysisData.ingredients.length}`)
      console.log(`  Total Calories: ${totalCalories} kcal`)
      console.log(`  Total Carbs: ${totalCarbs.toFixed(1)} g`)
      console.log(`  Total Protein: ${totalProtein.toFixed(1)} g`)
      console.log(`  Total Fat: ${totalFat.toFixed(1)} g`)
      console.log(`  Total Fiber: ${totalFiber.toFixed(1)} g\n`)

      console.log('🍕 Detected Ingredients:')
      analysisData.ingredients.forEach((ing, idx) => {
        const quantityStr = ing.quantity ? `${ing.quantity} ${ing.unit || ''}` : 'Unknown quantity'
        console.log(`  ${idx + 1}. ${ing.name} (${quantityStr}) - ${ing.calories} kcal`)
      })
      console.log('')
    }

    console.log('✅ Test PASSED: Gemini food analysis working correctly!')
    console.log(`   Response time: ${responseTime}ms`)
    console.log(`   Cost estimate: ~$0.000075 (75 millicents)\n`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Test FAILED:', error.message)

    if (error.message?.includes('credentials')) {
      console.error('\n💡 Tip: Check that GOOGLE_APPLICATION_CREDENTIALS points to a valid service account key')
      console.error('   Current value:', process.env.GOOGLE_APPLICATION_CREDENTIALS)
    }

    if (error.message?.includes('project')) {
      console.error('\n💡 Tip: Check that GOOGLE_CLOUD_PROJECT is set correctly')
      console.error('   Current value:', process.env.GOOGLE_CLOUD_PROJECT)
    }

    if (error.message?.includes('quota')) {
      console.error('\n💡 Tip: API quota exceeded. Wait a few minutes or check Google Cloud Console')
    }

    if (error.message?.includes('permission')) {
      console.error('\n💡 Tip: Service account may not have "Vertex AI User" role')
      console.error('   Grant role in Google Cloud Console → IAM & Admin → IAM')
    }

    console.error('\nFull error:')
    console.error(error)
    process.exit(1)
  }
}

testGemini()
