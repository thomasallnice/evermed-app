// Supabase Edge Function: analyze-food-photo
// Analyzes food photos using Google Gemini 2.5 Flash API
// Runs asynchronously to avoid Vercel timeout issues

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzePhotoRequest {
  foodPhotoId: string
  photoUrl: string
}

interface GeminiIngredient {
  name: string
  quantity: number | null
  unit: string | null
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  fiberG: number
}

interface GeminiAnalysisResult {
  success: boolean
  ingredients: GeminiIngredient[]
  error?: string
}

/**
 * Call Google Gemini 2.5 Flash API to analyze food photo
 */
async function analyzeFoodWithGemini(photoUrl: string): Promise<GeminiAnalysisResult> {
  const GOOGLE_CLOUD_PROJECT = Deno.env.get('GOOGLE_CLOUD_PROJECT')!
  const GOOGLE_APPLICATION_CREDENTIALS_JSON = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON')!

  if (!GOOGLE_CLOUD_PROJECT || !GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    throw new Error('Missing Google Cloud credentials in environment')
  }

  console.log('[Gemini] Initializing Vertex AI client')

  // Parse service account credentials
  const credentials = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS_JSON)

  // Get access token for Vertex AI API
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createJWT(credentials),
    }),
  })

  const { access_token } = await tokenResponse.json()

  // Download image and convert to base64
  console.log('[Gemini] Downloading image from:', photoUrl)
  const imageResponse = await fetch(photoUrl)
  const imageBuffer = await imageResponse.arrayBuffer()
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

  console.log('[Gemini] Image downloaded, size:', imageBuffer.byteLength, 'bytes')

  // Call Gemini 2.5 Flash API
  const geminiEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${GOOGLE_CLOUD_PROJECT}/locations/us-central1/publishers/google/models/gemini-2.0-flash-exp:generateContent`

  const prompt = `Analyze this food image and identify all food items with their nutrition information.

Return a JSON object with this structure:
{
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": estimated_quantity_number,
      "unit": "g/ml/cup/piece",
      "calories": total_calories_number,
      "carbsG": carbs_in_grams_number,
      "proteinG": protein_in_grams_number,
      "fatG": fat_in_grams_number,
      "fiberG": fiber_in_grams_number
    }
  ]
}

IMPORTANT:
- Be as accurate as possible with portion sizes
- Include ALL visible food items
- Return ONLY valid JSON, no markdown or explanations
- All nutrition values must be numbers (not strings)`

  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: 'image/jpeg',
            data: base64Image,
          },
        },
      ],
    }],
    generation_config: {
      temperature: 0.2,
      max_output_tokens: 2048,
    },
  }

  console.log('[Gemini] Calling Gemini 2.5 Flash API...')
  const startTime = Date.now()

  const geminiResponse = await fetch(geminiEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const duration = Date.now() - startTime
  console.log(`[Gemini] API call completed in ${duration}ms`)

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text()
    console.error('[Gemini] API error:', errorText)
    throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`)
  }

  const geminiData = await geminiResponse.json()

  // Parse Gemini response
  const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
  if (!responseText) {
    throw new Error('No response text from Gemini')
  }

  console.log('[Gemini] Raw response:', responseText)

  // Extract JSON from response (handle markdown code blocks)
  let jsonText = responseText.trim()
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/g, '').trim()
  }

  const parsedResult = JSON.parse(jsonText)

  return {
    success: true,
    ingredients: parsedResult.ingredients || [],
  }
}

/**
 * Create JWT for Google Cloud service account authentication
 */
async function createJWT(credentials: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  }

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '')
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '')
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  // Import private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(credentials.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Sign
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  )

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return `${signatureInput}.${encodedSignature}`
}

function pemToBinary(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get request body
    const { foodPhotoId, photoUrl }: AnalyzePhotoRequest = await req.json()

    console.log(`[EDGE] Starting analysis for photo ${foodPhotoId}`)
    console.log(`[EDGE] Photo URL: ${photoUrl}`)

    if (!foodPhotoId || !photoUrl) {
      throw new Error('Missing required parameters: foodPhotoId and photoUrl')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get food photo details from database
    const { data: photoData, error: photoError } = await supabase
      .from('food_photos')
      .select('*, food_entries!inner(*)')
      .eq('id', foodPhotoId)
      .single()

    if (photoError || !photoData) {
      throw new Error(`Failed to fetch photo data: ${photoError?.message}`)
    }

    const foodEntryId = photoData.food_entry_id

    // Analyze with Gemini
    console.log('[EDGE] Calling Gemini API...')
    const analysisResult = await analyzeFoodWithGemini(photoUrl)

    if (!analysisResult.success || analysisResult.ingredients.length === 0) {
      // Mark as failed
      await supabase
        .from('food_photos')
        .update({
          analysis_status: 'failed',
          analysis_completed_at: new Date().toISOString(),
        })
        .eq('id', foodPhotoId)

      return new Response(
        JSON.stringify({ success: false, error: 'Analysis returned no ingredients' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`[EDGE] Analysis successful: ${analysisResult.ingredients.length} ingredients found`)

    // Insert ingredients into database
    const ingredientsData = analysisResult.ingredients.map(ing => ({
      food_entry_id: foodEntryId,
      food_photo_id: foodPhotoId,
      name: ing.name,
      quantity: ing.quantity ?? 0,
      unit: ing.unit ?? 'serving',
      calories: ing.calories,
      carbs_g: ing.carbsG,
      protein_g: ing.proteinG,
      fat_g: ing.fatG,
      fiber_g: ing.fiberG,
      confidence_score: 0.85,
      source: 'ai_detected',
    }))

    const { error: insertError } = await supabase
      .from('food_ingredients')
      .insert(ingredientsData)

    if (insertError) {
      throw new Error(`Failed to insert ingredients: ${insertError.message}`)
    }

    // Calculate totals
    const totalCalories = analysisResult.ingredients.reduce((sum, ing) => sum + ing.calories, 0)
    const totalCarbsG = analysisResult.ingredients.reduce((sum, ing) => sum + ing.carbsG, 0)
    const totalProteinG = analysisResult.ingredients.reduce((sum, ing) => sum + ing.proteinG, 0)
    const totalFatG = analysisResult.ingredients.reduce((sum, ing) => sum + ing.fatG, 0)
    const totalFiberG = analysisResult.ingredients.reduce((sum, ing) => sum + ing.fiberG, 0)

    // Update FoodEntry with totals
    const { error: updateEntryError } = await supabase
      .from('food_entries')
      .update({
        total_calories: totalCalories,
        total_carbs_g: totalCarbsG,
        total_protein_g: totalProteinG,
        total_fat_g: totalFatG,
        total_fiber_g: totalFiberG,
      })
      .eq('id', foodEntryId)

    if (updateEntryError) {
      throw new Error(`Failed to update food entry: ${updateEntryError.message}`)
    }

    // Mark photo as completed
    const { error: updatePhotoError } = await supabase
      .from('food_photos')
      .update({
        analysis_status: 'completed',
        analysis_completed_at: new Date().toISOString(),
      })
      .eq('id', foodPhotoId)

    if (updatePhotoError) {
      throw new Error(`Failed to update photo status: ${updatePhotoError.message}`)
    }

    console.log(`[EDGE] ✓ Analysis complete: ${totalCalories} kcal, ${analysisResult.ingredients.length} ingredients`)

    return new Response(
      JSON.stringify({
        success: true,
        ingredientsCount: analysisResult.ingredients.length,
        totalCalories,
        totalCarbsG,
        totalProteinG,
        totalFatG,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[EDGE] Error:', error)

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
