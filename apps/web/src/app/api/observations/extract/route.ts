import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { requireUserId } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID || process.env.OPENAI_ORGANIZATION || '';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  return createClient(url, key, { auth: { persistSession: false } });
}

// MVP lab scope as per project-description.md §15
const LAB_SCOPE_INSTRUCTION = `
Focus on these lab tests for MVP launch:
- CBC (Complete Blood Count): Hemoglobin, Hematocrit, WBC, RBC, Platelets, MCV, MCH, MCHC
- CMP (Comprehensive Metabolic Panel): Sodium, Potassium, Chloride, CO2, BUN, Creatinine, Glucose, Calcium
- HbA1c (Glycated Hemoglobin)
- Lipids: Total Cholesterol, LDL, HDL, Triglycerides
- TSH (Thyroid Stimulating Hormone)
- INR/PT (International Normalized Ratio / Prothrombin Time)
- eGFR (Estimated Glomerular Filtration Rate)
- Liver Enzymes: ALT (Alanine Aminotransferase), AST (Aspartate Aminotransferase)
- CRP (C-Reactive Protein)

Extract only explicitly stated lab values. Do not infer or guess values.
`;

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const userId = await requireUserId(req);

    const { documentId } = await req.json();
    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    // Fetch document and verify ownership
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { person: true },
    });

    if (!doc) {
      return NextResponse.json({ error: 'document not found' }, { status: 404 });
    }

    if (doc.person.ownerId !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Get OCR text from doc_texts or rag_documents table
    const admin = getAdmin();
    let ocrText = '';

    // Try doc_texts first (cached OCR results)
    try {
      const { data: cached } = await admin
        .from('doc_texts')
        .select('text')
        .eq('document_id', documentId)
        .maybeSingle();
      ocrText = (cached as any)?.text || '';
    } catch (err) {
      console.warn('[extract] doc_texts lookup failed', err);
    }

    // Fallback to DocChunk if doc_texts is empty
    if (!ocrText.trim()) {
      try {
        const chunks = await prisma.docChunk.findMany({
          where: { documentId },
          orderBy: { chunkId: 'asc' },
          select: { text: true },
        });
        ocrText = chunks.map((c) => c.text).join('\n');
      } catch (err) {
        console.warn('[extract] DocChunk lookup failed', err);
      }
    }

    if (!ocrText.trim()) {
      return NextResponse.json(
        { error: 'No OCR text available for this document. Please ensure the document has been processed.' },
        { status: 422 }
      );
    }

    // Use OpenAI structured outputs to extract lab observations
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const respUrl = `${OPENAI_BASE_URL}/responses`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    };
    if (OPENAI_ORG_ID) headers['OpenAI-Organization'] = OPENAI_ORG_ID;

    // Define the extraction schema
    const schema = {
      name: 'LabObservations',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          observations: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                code: { type: 'string', description: 'Lab test code or standardized name' },
                display: { type: 'string', description: 'Human-readable lab test name' },
                valueNum: { type: 'number', description: 'Numeric value of the lab result' },
                unit: { type: 'string', description: 'Unit of measurement (e.g., g/dL, mmol/L, %)' },
                refLow: { type: 'number', description: 'Reference range lower bound' },
                refHigh: { type: 'number', description: 'Reference range upper bound' },
                effectiveAt: { type: 'string', description: 'Date/time when the lab was performed (ISO 8601 format)' },
                sourceAnchor: { type: 'string', description: 'Page/line reference where this value was found' },
              },
              required: ['code', 'display'],
            },
          },
        },
        required: ['observations'],
      },
      strict: true,
    };

    const systemPrompt = `You are a medical lab data extraction assistant.
${LAB_SCOPE_INSTRUCTION}

Instructions:
1. Extract only lab results that are explicitly stated in the text
2. For each observation, provide:
   - code: Use standard abbreviations (e.g., "HGB" for Hemoglobin, "GLU" for Glucose)
   - display: Human-readable name
   - valueNum: Numeric value (extract only numbers)
   - unit: Unit of measurement
   - refLow/refHigh: Reference range if provided
   - effectiveAt: Test date in ISO 8601 format if available
   - sourceAnchor: Page or section reference if identifiable
3. If a value is not available, omit the field (do not use null or empty strings for optional fields)
4. Only extract values that are clearly lab results, not patient demographics or other data
5. Ensure provenance: include sourceAnchor when you can identify the specific page/section`;

    const body = {
      model: OPENAI_MODEL,
      input: `${systemPrompt}\n\nDocument text to analyze:\n${ocrText.slice(0, 20000)}`,
      response_format: { type: 'json_schema', json_schema: schema },
      reasoning: { effort: 'medium' },
      text: { verbosity: 'low' },
    };

    // Make request with fallback for unsupported parameters
    const doResp = async (b: any) => {
      const send = async (bb: any) => fetch(respUrl, { method: 'POST', headers, body: JSON.stringify(bb) });
      let r = await send(b);
      if (!r.ok) {
        try {
          const err = await r.clone().json();
          const code = String(err?.error?.code || '');
          const param = String(err?.error?.param || '');
          const msg = String(err?.error?.message || '').toLowerCase();
          const unsupported =
            code === 'unsupported_parameter' && (param.startsWith('reasoning') || param.startsWith('text'));
          if (unsupported || msg.includes('reasoning') || msg.includes('verbosity')) {
            const cleaned: any = { ...b };
            try {
              delete cleaned.reasoning;
            } catch {}
            try {
              delete cleaned.text;
            } catch {}
            r = await send(cleaned);
          }
        } catch {}
      }
      return r;
    };

    const res = await doResp(body);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'OpenAI extraction failed', details: errText },
        { status: 502 }
      );
    }

    const j = await res.json();
    const outText = (j as any)?.output_text;
    const text = typeof outText === 'string' ? outText : Array.isArray(outText) ? outText.join('\n') : '';

    let structured: any = null;
    try {
      structured = text ? JSON.parse(text) : null;
    } catch {}

    // Fallback parsing if output_text didn't work
    if (!structured) {
      const out = (j as any)?.output || [];
      for (const item of out) {
        const content = item?.content || [];
        for (const c of content) {
          if (c && typeof c === 'object' && 'text' in c) {
            try {
              structured = JSON.parse(String((c as any).text || ''));
            } catch {}
            if (structured) break;
          }
        }
        if (structured) break;
      }
    }

    if (!structured || !Array.isArray(structured.observations)) {
      return NextResponse.json(
        { error: 'Failed to parse structured observations from OpenAI response' },
        { status: 500 }
      );
    }

    // Store extracted observations in the database
    const observations = structured.observations;
    const createdObservations: any[] = [];

    for (const obs of observations) {
      // Skip observations without required fields
      if (!obs.code || !obs.display) continue;

      // Parse effectiveAt if provided
      let effectiveAt: Date | null = null;
      if (obs.effectiveAt) {
        try {
          effectiveAt = new Date(obs.effectiveAt);
          // Validate date
          if (isNaN(effectiveAt.getTime())) effectiveAt = null;
        } catch {}
      }

      // Create observation record
      const created = await prisma.observation.create({
        data: {
          personId: doc.personId,
          code: obs.code,
          display: obs.display,
          valueNum: typeof obs.valueNum === 'number' ? obs.valueNum : null,
          unit: obs.unit || null,
          refLow: typeof obs.refLow === 'number' ? obs.refLow : null,
          refHigh: typeof obs.refHigh === 'number' ? obs.refHigh : null,
          effectiveAt: effectiveAt,
          sourceDocId: documentId,
          sourceAnchor: obs.sourceAnchor || null,
        },
      });

      createdObservations.push(created);
    }

    return NextResponse.json(createdObservations);
  } catch (e: any) {
    console.error('[extract] Error:', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
