/**
 * Food Recognition Service (Google Cloud Vision API)
 *
 * Analyzes food photos to identify ingredients and portions.
 * Uses Google Cloud Vision API for image analysis.
 *
 * Sprint 2: AI Integration
 */

export interface FoodRecognitionResult {
  ingredients: Array<{
    name: string
    quantity: number
    unit: string
    confidence: number
  }>
  labels: string[]
  colors: string[]
  confidence: number
}

/**
 * Analyze food photo using Google Cloud Vision API
 *
 * @param imageBuffer - The photo buffer
 * @returns Recognized ingredients and metadata
 */
export async function recognizeFood(
  imageBuffer: Buffer
): Promise<FoodRecognitionResult> {
  const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY

  if (!GOOGLE_VISION_API_KEY) {
    // Return placeholder data for development
    console.warn('GOOGLE_VISION_API_KEY not set, using placeholder data')
    return {
      ingredients: [
        { name: 'apple', quantity: 1, unit: 'whole', confidence: 0.85 },
        { name: 'banana', quantity: 1, unit: 'whole', confidence: 0.9 },
      ],
      labels: ['fruit', 'healthy', 'snack'],
      colors: ['red', 'yellow'],
      confidence: 0.8,
    }
  }

  try {
    // Convert image buffer to base64
    const base64Image = imageBuffer.toString('base64')

    // Call Google Cloud Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [
                { type: 'LABEL_DETECTION', maxResults: 20 },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                { type: 'IMAGE_PROPERTIES', maxResults: 5 },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.statusText}`)
    }

    const data = await response.json()
    const annotations = data.responses[0]

    // Extract food labels
    const foodLabels = annotations.labelAnnotations
      ?.filter((label: any) =>
        ['food', 'fruit', 'vegetable', 'meat', 'dairy', 'grain'].some((cat) =>
          label.description.toLowerCase().includes(cat)
        )
      )
      .map((label: any) => label.description.toLowerCase()) || []

    // Extract objects (potential ingredients)
    const objects = annotations.localizedObjectAnnotations
      ?.filter((obj: any) => obj.score > 0.5)
      .map((obj: any) => ({
        name: obj.name.toLowerCase(),
        quantity: 1, // Default, will be refined
        unit: 'serving',
        confidence: obj.score,
      })) || []

    // Extract dominant colors
    const colors = annotations.imagePropertiesAnnotation?.dominantColors?.colors
      ?.slice(0, 3)
      .map((c: any) => {
        const rgb = c.color
        return rgbToColorName(rgb.red, rgb.green, rgb.blue)
      }) || []

    return {
      ingredients: objects.length > 0 ? objects : [], // Will be enriched by Nutritionix
      labels: foodLabels,
      colors,
      confidence: objects.length > 0 ?
        objects.reduce((sum: number, o: any) => sum + o.confidence, 0) / objects.length :
        0.5,
    }
  } catch (error) {
    console.error('Food recognition error:', error)
    // Return empty result on error
    return {
      ingredients: [],
      labels: [],
      colors: [],
      confidence: 0,
    }
  }
}

/**
 * Convert RGB to color name (simplified)
 */
function rgbToColorName(r: number, g: number, b: number): string {
  if (r > 200 && g < 100 && b < 100) return 'red'
  if (r < 100 && g > 200 && b < 100) return 'green'
  if (r < 100 && g < 100 && b > 200) return 'blue'
  if (r > 200 && g > 200 && b < 100) return 'yellow'
  if (r > 200 && g > 100 && b < 100) return 'orange'
  if (r > 150 && g < 100 && b > 150) return 'purple'
  if (r > 200 && g > 200 && b > 200) return 'white'
  if (r < 100 && g < 100 && b < 100) return 'black'
  if (r > 100 && g > 100 && b > 100) return 'gray'
  return 'mixed'
}
