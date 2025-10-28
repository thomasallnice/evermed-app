// Glucometer OCR Service
// Extracts glucose readings from photos of glucometer screens using Google Vision API

import Constants from 'expo-constants'

const GOOGLE_VISION_API_KEY = Constants.expoConfig?.extra?.googleVisionApiKey
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate'

export interface GlucometerOCRResult {
  value: number | null
  confidence: number
  detectedText: string
  error?: string
}

/**
 * Scan a glucometer screen photo and extract the glucose value
 *
 * @param imageUri - Local URI of the photo (from expo-camera or expo-image-picker)
 * @returns Glucose value in mg/dL or null if not detected
 */
export async function scanGlucometerScreen(imageUri: string): Promise<GlucometerOCRResult> {
  try {
    console.log('[GLUCOMETER OCR] Starting scan of image:', imageUri)

    // Step 1: Convert image to base64
    const base64Image = await convertImageToBase64(imageUri)
    console.log('[GLUCOMETER OCR] Image converted to base64')

    // Step 2: Call Google Vision API
    const ocrText = await performOCR(base64Image)
    console.log('[GLUCOMETER OCR] OCR detected text:', ocrText)

    if (!ocrText) {
      return {
        value: null,
        confidence: 0,
        detectedText: '',
        error: 'No text detected in image',
      }
    }

    // Step 3: Extract glucose value from text
    const glucoseValue = extractGlucoseValue(ocrText)
    console.log('[GLUCOMETER OCR] Extracted value:', glucoseValue)

    if (glucoseValue === null) {
      return {
        value: null,
        confidence: 0,
        detectedText: ocrText,
        error: 'Could not find a valid glucose reading in the image',
      }
    }

    // Step 4: Validate range (20-600 mg/dL is physiologically plausible)
    if (glucoseValue < 20 || glucoseValue > 600) {
      console.warn('[GLUCOMETER OCR] Value out of range:', glucoseValue)
      return {
        value: null,
        confidence: 0,
        detectedText: ocrText,
        error: `Detected value ${glucoseValue} is outside valid range (20-600 mg/dL)`,
      }
    }

    return {
      value: glucoseValue,
      confidence: 0.85, // High confidence if we extracted and validated successfully
      detectedText: ocrText,
    }
  } catch (error: any) {
    console.error('[GLUCOMETER OCR] Error:', error)
    return {
      value: null,
      confidence: 0,
      detectedText: '',
      error: error.message || 'Failed to scan glucometer screen',
    }
  }
}

/**
 * Convert image URI to base64 string
 */
async function convertImageToBase64(imageUri: string): Promise<string> {
  try {
    // Use fetch to read the local file
    const response = await fetch(imageUri)
    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64data = reader.result as string
        // Remove data:image/jpeg;base64, prefix
        const base64 = base64data.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('[GLUCOMETER OCR] Failed to convert image to base64:', error)
    throw new Error('Failed to process image')
  }
}

/**
 * Perform OCR using Google Vision API
 */
async function performOCR(base64Image: string): Promise<string> {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('Google Vision API key not configured')
  }

  try {
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 10,
            },
          ],
        },
      ],
    }

    const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[GLUCOMETER OCR] Google Vision API error:', error)
      throw new Error('Failed to perform OCR')
    }

    const data = await response.json()

    // Extract full text from response
    if (data.responses && data.responses[0] && data.responses[0].textAnnotations) {
      const fullText = data.responses[0].textAnnotations[0]?.description || ''
      return fullText
    }

    return ''
  } catch (error) {
    console.error('[GLUCOMETER OCR] OCR request failed:', error)
    throw new Error('Failed to perform OCR')
  }
}

/**
 * Extract glucose value from OCR text using pattern matching
 *
 * Looks for patterns like:
 * - "120 mg/dL"
 * - "120 mg/dl"
 * - "120mg/dL"
 * - "120"
 * - "BG: 120"
 * - "Glucose: 120"
 */
function extractGlucoseValue(text: string): number | null {
  // Clean up text: remove newlines, extra spaces
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()

  // Pattern 1: Explicit mg/dL format (e.g., "120 mg/dL")
  const mgdlPattern = /(\d{1,3})\s*mg\/d[lL]/i
  const mgdlMatch = cleanText.match(mgdlPattern)
  if (mgdlMatch) {
    return parseInt(mgdlMatch[1], 10)
  }

  // Pattern 2: Labeled glucose reading (e.g., "BG: 120", "Glucose: 120")
  const labeledPattern = /(BG|Glucose|Blood Glucose):\s*(\d{1,3})/i
  const labeledMatch = cleanText.match(labeledPattern)
  if (labeledMatch) {
    return parseInt(labeledMatch[2], 10)
  }

  // Pattern 3: Standalone number in valid range
  // Look for numbers that are likely glucose readings
  const numberPattern = /\b(\d{1,3})\b/g
  const numberMatches = cleanText.match(numberPattern)

  if (numberMatches) {
    // Find the first number in the physiologically plausible range
    for (const match of numberMatches) {
      const value = parseInt(match, 10)
      if (value >= 20 && value <= 600) {
        return value
      }
    }
  }

  // Pattern 4: mmol/L format (convert to mg/dL)
  // Example: "6.7 mmol/L" → 121 mg/dL
  const mmolPattern = /(\d+\.?\d*)\s*mmol\/[lL]/i
  const mmolMatch = cleanText.match(mmolPattern)
  if (mmolMatch) {
    const mmolValue = parseFloat(mmolMatch[1])
    const mgdlValue = Math.round(mmolValue * 18.0182)
    console.log(`[GLUCOMETER OCR] Converted ${mmolValue} mmol/L to ${mgdlValue} mg/dL`)
    return mgdlValue
  }

  return null
}

/**
 * Test function for development
 * Simulates OCR with sample text
 */
export function testGlucometerOCR(): void {
  const testCases = [
    '120 mg/dL',
    'BG: 95',
    'Glucose: 145',
    '6.7 mmol/L',
    '180',
    'Blood Glucose 110 mg/dL',
    'Random text 234 more text',
  ]

  console.log('[GLUCOMETER OCR] Running test cases:')
  testCases.forEach((text) => {
    const value = extractGlucoseValue(text)
    console.log(`  "${text}" → ${value} mg/dL`)
  })
}
