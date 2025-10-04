import OpenAI from 'openai';

export type TopicSuggestion = {
  topic: string;
  confidence: number; // 0-1
  reason: string;
};

export type SuggestTopicsInput = {
  filename: string;
  kind?: string;
  ocrText?: string | null;
  fileType?: string;
};

const COMMON_TOPICS = [
  'Labs',
  'Imaging',
  'Medications',
  'Immunizations',
  'Consultations',
  'Insurance',
  'Other',
];

const SYSTEM_PROMPT = `You are a medical document classifier. Given information about a medical document, suggest 1-3 appropriate topic categories.

Available categories:
- Labs (laboratory results, blood tests, urinalysis, etc.)
- Imaging (X-rays, MRI, CT scans, ultrasounds, etc.)
- Medications (prescriptions, medication lists, pharmacy records)
- Immunizations (vaccination records, immunization certificates)
- Consultations (doctor's notes, visit summaries, specialist reports)
- Insurance (insurance cards, EOBs, claims, authorizations)
- Other (anything that doesn't fit above categories)

Analyze the filename, document type, and content excerpt to determine the most likely category.
Return 1-3 suggestions ranked by confidence, with a brief reason for each.

Respond in JSON format with this structure:
{
  "suggestions": [
    {"topic": "Labs", "confidence": 0.95, "reason": "Filename contains 'lab' and content mentions blood test results"},
    {"topic": "Imaging", "confidence": 0.3, "reason": "Possible secondary imaging reference"}
  ]
}`;

// Fallback logic using filename/kind heuristics
function getFallbackSuggestions(input: SuggestTopicsInput): TopicSuggestion[] {
  const filename = input.filename.toLowerCase();
  const suggestions: TopicSuggestion[] = [];

  if (filename.includes('lab') || filename.includes('blood') || filename.includes('test')) {
    suggestions.push({
      topic: 'Labs',
      confidence: 0.7,
      reason: 'Filename contains lab-related keywords',
    });
  }

  if (
    filename.includes('x-ray') ||
    filename.includes('xray') ||
    filename.includes('mri') ||
    filename.includes('ct') ||
    filename.includes('scan') ||
    filename.includes('ultrasound') ||
    filename.includes('imaging')
  ) {
    suggestions.push({
      topic: 'Imaging',
      confidence: 0.7,
      reason: 'Filename contains imaging-related keywords',
    });
  }

  if (
    filename.includes('rx') ||
    filename.includes('prescription') ||
    filename.includes('medication') ||
    filename.includes('pharmacy')
  ) {
    suggestions.push({
      topic: 'Medications',
      confidence: 0.7,
      reason: 'Filename contains medication-related keywords',
    });
  }

  if (
    filename.includes('vaccine') ||
    filename.includes('immunization') ||
    filename.includes('shot')
  ) {
    suggestions.push({
      topic: 'Immunizations',
      confidence: 0.7,
      reason: 'Filename contains immunization-related keywords',
    });
  }

  if (
    filename.includes('insurance') ||
    filename.includes('claim') ||
    filename.includes('eob') ||
    filename.includes('card')
  ) {
    suggestions.push({
      topic: 'Insurance',
      confidence: 0.7,
      reason: 'Filename contains insurance-related keywords',
    });
  }

  if (
    filename.includes('consult') ||
    filename.includes('note') ||
    filename.includes('visit') ||
    filename.includes('report')
  ) {
    suggestions.push({
      topic: 'Consultations',
      confidence: 0.7,
      reason: 'Filename contains consultation-related keywords',
    });
  }

  // Default fallback based on kind
  if (suggestions.length === 0) {
    if (input.kind === 'imaging') {
      suggestions.push({
        topic: 'Imaging',
        confidence: 0.6,
        reason: 'Document is marked as imaging type',
      });
    } else if (input.kind === 'document') {
      suggestions.push({
        topic: 'Other',
        confidence: 0.5,
        reason: 'Generic document with no clear category indicators',
      });
    } else {
      suggestions.push({
        topic: 'Other',
        confidence: 0.4,
        reason: 'Unable to determine specific category',
      });
    }
  }

  return suggestions.slice(0, 3);
}

export async function suggestTopics(
  input: SuggestTopicsInput
): Promise<TopicSuggestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  // If no API key or OCR is disabled, use fallback
  if (!apiKey) {
    console.warn('OPENAI_API_KEY not set, using fallback topic suggestions');
    return getFallbackSuggestions(input);
  }

  try {
    const openai = new OpenAI({ apiKey });

    // Build user message with available information
    const context = [];
    context.push(`Filename: ${input.filename}`);
    if (input.kind) context.push(`Document type: ${input.kind}`);
    if (input.fileType) context.push(`File type: ${input.fileType}`);
    if (input.ocrText) {
      // Use first 500 characters of OCR text
      const excerpt = input.ocrText.substring(0, 500);
      context.push(`Content excerpt: ${excerpt}`);
    }

    const userMessage = context.join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      console.warn('No response from OpenAI, using fallback');
      return getFallbackSuggestions(input);
    }

    const parsed = JSON.parse(responseText);
    const suggestions = parsed.suggestions as TopicSuggestion[];

    // Validate and filter suggestions
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      console.warn('Invalid suggestions from OpenAI, using fallback');
      return getFallbackSuggestions(input);
    }

    // Ensure suggestions use valid topics
    const validSuggestions = suggestions
      .filter((s) => COMMON_TOPICS.includes(s.topic))
      .slice(0, 3);

    if (validSuggestions.length === 0) {
      console.warn('No valid topics in OpenAI response, using fallback');
      return getFallbackSuggestions(input);
    }

    return validSuggestions;
  } catch (error) {
    console.error('Error calling OpenAI for topic suggestions:', error);
    return getFallbackSuggestions(input);
  }
}
