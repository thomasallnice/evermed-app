/**
 * Medical Safety Guardrails Module
 *
 * Enforces non-SaMD compliance by preventing diagnosis, dosing, and triage activities.
 * Provides emergency escalation and refusal templates for prohibited medical content.
 */

import { REFUSAL_BANNED, ESCALATION_RED_FLAGS } from './copy'

/**
 * System prompt that instructs LLMs to operate within non-SaMD guardrails.
 * This must be included in all medical AI chat interactions.
 */
export const MEDICAL_SAFETY_SYSTEM_PROMPT = `CRITICAL SAFETY INSTRUCTIONS - You must follow these rules strictly:

NON-SaMD GUARDRAILS (Software as a Medical Device Compliance):
You are an educational health information assistant. You MUST NOT:

1. DIAGNOSIS - Never identify, determine, or suggest specific medical conditions, diseases, or disorders based on symptoms
   - Do NOT say "you might have X condition" or "this sounds like Y disease"
   - Do NOT interpret symptoms to suggest diagnoses
   - ONLY provide general factual information about medical conditions

2. DOSING - Never provide medication amounts, timing, frequency, or administration instructions
   - Do NOT say "take X mg" or "use this medication Y times per day"
   - Do NOT suggest adjusting doses
   - ONLY explain how medications work in general terms

3. TRIAGE - Never advise on care urgency, whether to seek care, or what type of care facility
   - Do NOT say "you should go to the ER" or "this can wait for primary care"
   - Do NOT assess urgency levels
   - ONLY provide general information about when people typically seek care

4. IMAGE INTERPRETATION - Never interpret medical images beyond factual description
   - Do NOT diagnose from X-rays, scans, or medical images
   - ONLY describe what is visible factually

EMERGENCY SAFETY:
If the user describes emergency symptoms (chest pain, trouble breathing, severe bleeding, stroke symptoms, self-harm, overdose, anaphylaxis), IMMEDIATELY respond with:
"⚠️ EMERGENCY: If you are experiencing [symptom], call 911 or your local emergency services immediately. Do not delay care."
Then STOP. Do not provide other information.

ANSWER GUIDELINES:
- ONLY use information from the user's uploaded documents provided in the context
- CITE sources inline using [n] format for every factual claim
- If you don't have information in the provided documents, say so clearly
- For prohibited requests, politely refuse and redirect to healthcare providers
- Always remind users this is educational information, not medical advice

REFUSAL TEMPLATE when users ask for diagnosis/dosing/triage:
"I understand you're asking about [topic], but I cannot provide [diagnosis/dosing/triage] as this requires professional medical evaluation for your safety. I recommend consulting with your healthcare provider who can assess your specific situation. However, I can provide general educational information about [topic] from your documents if that would be helpful."

Remember: You inform and educate. You never diagnose, dose, or triage.`

/**
 * Keywords that indicate prohibited SaMD activities (diagnosis, dosing, triage).
 * Content containing these patterns should trigger refusal responses.
 */
export const BANNED_KEYWORDS = [
  // Diagnosis patterns
  'diagnose',
  'diagnosis',
  'do i have',
  'is this',
  'what condition',
  'what disease',
  'what\'s wrong with me',
  'identify my condition',
  'tell me what i have',
  'figure out what\'s wrong',

  // Dosing patterns
  'dose',
  'dosage',
  'how much',
  'how many pills',
  'medication amount',
  'prescribe',
  'prescription for',
  'should i take',
  'when to take',
  'how often to take',
  'milligrams',
  'mg of',
  'adjust my dose',
  'increase dose',
  'decrease dose',

  // Triage patterns
  'should i go to',
  'do i need to see',
  'emergency room',
  'urgent care',
  'call 911',
  'is this urgent',
  'how serious is',
  'should i worry',
  'do i need emergency',
  'go to er',
  'go to hospital',
  'seek immediate care',

  // Image interpretation (medical context)
  'interpret image',
  'read x-ray',
  'read my scan',
  'what does this image show',
  'analyze this scan',
  'what\'s in this x-ray',
  'read my mri',
  'interpret ct scan',
  'what does my ultrasound show',
]

/**
 * Emergency keywords that require immediate escalation to emergency services.
 * These indicate potentially life-threatening situations.
 */
export const EMERGENCY_KEYWORDS = [
  // Cardiovascular emergencies
  'chest pain',
  'heart attack',
  'crushing chest',
  'pressure in chest',

  // Respiratory emergencies
  'trouble breathing',
  'can\'t breathe',
  'difficulty breathing',
  'shortness of breath severe',
  'gasping for air',
  'choking',
  'throat swelling',
  'difficulty swallowing',
  'anaphylaxis',
  'allergic reaction severe',

  // Neurological emergencies
  'stroke',
  'facial drooping',
  'face drooping',
  'arm weakness sudden',
  'can\'t move arm',
  'trouble speaking',
  'slurred speech',
  'sudden confusion',
  'can\'t understand',
  'severe headache sudden',
  'worst headache',
  'head injury',
  'loss of consciousness',
  'passed out',
  'unconscious',
  'seizure',
  'convulsion',

  // Hemorrhage
  'severe bleeding',
  'bleeding won\'t stop',
  'blood everywhere',
  'hemorrhage',
  'bleeding heavily',
  'coughing up blood',
  'vomiting blood',
  'blood in stool severe',

  // Mental health emergencies
  'self-harm',
  'hurt myself',
  'end my life',
  'suicidal',
  'suicide plan',
  'want to die',
  'killing myself',

  // Toxicological emergencies
  'overdose',
  'took too many pills',
  'poisoning',
  'swallowed poison',
  'ingested chemicals',

  // Abdominal emergencies
  'severe abdominal pain',
  'appendicitis',
  'burst appendix',
  'severe stomach pain',

  // Pediatric emergencies
  'high fever infant',
  'baby not breathing',
  'child unresponsive',
  'infant lethargic',

  // Dermatological emergencies
  'purple spots rash',
  'petechiae',
  'non-blanching rash',
]

/**
 * Checks user input for banned keywords indicating prohibited SaMD activities.
 *
 * @param text - User's question or message
 * @returns Refusal object with message if banned content detected, null otherwise
 */
export function checkForBannedContent(text: string): { refusal: string } | null {
  const lowerText = text.toLowerCase().trim()

  for (const keyword of BANNED_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      // Determine the type of violation for a more specific refusal
      let violationType = 'medical advice'

      if (keyword.includes('diagnos') || keyword.includes('condition') || keyword.includes('disease')) {
        violationType = 'diagnosis'
      } else if (keyword.includes('dose') || keyword.includes('dosage') || keyword.includes('prescri') || keyword.includes('mg')) {
        violationType = 'medication dosing'
      } else if (keyword.includes('urgent') || keyword.includes('emergency') || keyword.includes('should i go')) {
        violationType = 'medical triage'
      } else if (keyword.includes('interpret') || keyword.includes('read') || keyword.includes('scan') || keyword.includes('x-ray')) {
        violationType = 'medical image interpretation'
      }

      return {
        refusal: `I understand you're asking about ${violationType}, but I cannot provide ${violationType} as this requires professional medical evaluation for your safety and regulatory compliance. ${REFUSAL_BANNED}\n\nI recommend consulting with your healthcare provider who can properly assess your specific situation. However, I can help explain general information from your uploaded medical documents if that would be helpful.`
      }
    }
  }

  return null
}

/**
 * Checks user input for emergency keywords requiring immediate escalation.
 *
 * @param text - User's question or message
 * @returns Escalation object with emergency message if detected, null otherwise
 */
export function checkForEmergencyKeywords(text: string): { escalation: string } | null {
  const lowerText = text.toLowerCase().trim()

  for (const keyword of EMERGENCY_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      // Identify the specific emergency for targeted response
      let emergencyType = 'a medical emergency'

      if (keyword.includes('chest') || keyword.includes('heart')) {
        emergencyType = 'chest pain or possible heart attack'
      } else if (keyword.includes('breath') || keyword.includes('choking')) {
        emergencyType = 'difficulty breathing'
      } else if (keyword.includes('stroke') || keyword.includes('droop') || keyword.includes('weakness') || keyword.includes('slurred')) {
        emergencyType = 'possible stroke symptoms'
      } else if (keyword.includes('bleed')) {
        emergencyType = 'severe bleeding'
      } else if (keyword.includes('self-harm') || keyword.includes('suicid')) {
        emergencyType = 'a mental health crisis'
      } else if (keyword.includes('overdose') || keyword.includes('poison')) {
        emergencyType = 'poisoning or overdose'
      } else if (keyword.includes('unconscious') || keyword.includes('passed out')) {
        emergencyType = 'loss of consciousness'
      } else if (keyword.includes('seizure') || keyword.includes('convuls')) {
        emergencyType = 'seizure activity'
      }

      return {
        escalation: `⚠️ EMERGENCY ALERT: You mentioned symptoms of ${emergencyType}. ${ESCALATION_RED_FLAGS}\n\n🚨 If this is happening now:\n• Call 911 (US) or your local emergency number immediately\n• Do not delay seeking emergency care\n• Stay on the line with emergency services\n\nThis is a potential medical emergency that requires immediate professional evaluation. I cannot provide guidance for emergency situations.`
      }
    }
  }

  return null
}

/**
 * Validates that a response includes proper medical disclaimers.
 * This is a helper for testing/validation purposes.
 *
 * @param response - AI-generated response text
 * @returns true if response appears compliant, false otherwise
 */
export function validateMedicalDisclaimer(response: string): boolean {
  const lowerResponse = response.toLowerCase()

  // Check for educational disclaimer language
  const hasEducationalDisclaimer =
    lowerResponse.includes('educational') ||
    lowerResponse.includes('not medical advice') ||
    lowerResponse.includes('consult') ||
    lowerResponse.includes('healthcare provider')

  // Check for citations (should have at least one [n] style citation if making medical claims)
  const hasCitations = /\[\d+\]/.test(response)

  // If response contains medical information, it should have disclaimers and citations
  const hasMedicalContent =
    lowerResponse.includes('condition') ||
    lowerResponse.includes('medication') ||
    lowerResponse.includes('treatment') ||
    lowerResponse.includes('symptom') ||
    lowerResponse.includes('disease')

  if (hasMedicalContent) {
    return hasEducationalDisclaimer && hasCitations
  }

  return true
}
