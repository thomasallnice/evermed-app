import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';
import { parseStringPromise } from 'xml2js';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

/**
 * POST /api/metabolic/glucose/import/healthkit
 * Import blood glucose readings from HealthKit export XML
 */
export async function POST(req: NextRequest) {
  console.log('[HEALTHKIT IMPORT] POST request received');

  try {
    // Authenticate user
    let userId: string;
    try {
      userId = await requireUserId(req);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get person record
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person record not found' },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (XML only)
    if (!file.name.endsWith('.xml') && !file.name.endsWith('.XML')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a HealthKit export.xml file' },
        { status: 400 }
      );
    }

    // Read file contents
    const fileText = await file.text();

    // Parse XML
    let parsedXml: any;
    try {
      parsedXml = await parseStringPromise(fileText);
    } catch (parseError: any) {
      console.error('[HEALTHKIT IMPORT] XML parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid XML format. Please ensure this is a valid HealthKit export file' },
        { status: 400 }
      );
    }

    // Extract blood glucose records
    const healthData = parsedXml?.HealthData;
    if (!healthData) {
      return NextResponse.json(
        { error: 'Invalid HealthKit export format: missing HealthData root element' },
        { status: 400 }
      );
    }

    const records = healthData.Record || [];

    // Filter for blood glucose readings
    const glucoseRecords = records.filter((record: any) => {
      const attrs = record.$ || record;
      return attrs.type === 'HKQuantityTypeIdentifierBloodGlucose';
    });

    if (glucoseRecords.length === 0) {
      return NextResponse.json(
        { error: 'No blood glucose readings found in export file' },
        { status: 400 }
      );
    }

    console.log(`[HEALTHKIT IMPORT] Found ${glucoseRecords.length} blood glucose readings`);

    // Import glucose readings with upsert to prevent duplicates
    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const record of glucoseRecords) {
      try {
        const attrs = record.$ || record;

        // Extract attributes
        const valueStr = attrs.value;
        const unit = attrs.unit || 'mg/dL';
        const startDateStr = attrs.startDate || attrs.creationDate;
        const sourceName = attrs.sourceName || 'HealthKit';

        // Validate required fields
        if (!valueStr || !startDateStr) {
          skippedCount++;
          continue;
        }

        // Parse value
        let value = parseFloat(valueStr);

        // Convert mmol/L to mg/dL if needed
        if (unit.toLowerCase() === 'mmol/l') {
          value = value * 18.0182; // mmol/L to mg/dL conversion
        }

        // Validate glucose range (20-600 mg/dL)
        if (value < 20 || value > 600) {
          skippedCount++;
          continue;
        }

        // Parse timestamp
        const timestamp = new Date(startDateStr);
        if (isNaN(timestamp.getTime())) {
          skippedCount++;
          continue;
        }

        // Determine source (prioritize CGM sources)
        let source: 'cgm' | 'fingerstick' | 'lab' = 'fingerstick';
        const sourceNameLower = sourceName.toLowerCase();
        if (sourceNameLower.includes('dexcom') || sourceNameLower.includes('libre') || sourceNameLower.includes('cgm')) {
          source = 'cgm';
        } else if (sourceNameLower.includes('lab') || sourceNameLower.includes('laboratory')) {
          source = 'lab';
        }

        // Upsert glucose reading (prevent duplicates by timestamp)
        await prisma.glucoseReading.upsert({
          where: {
            personId_timestamp: {
              personId: person.id,
              timestamp,
            },
          },
          create: {
            personId: person.id,
            timestamp,
            value: Math.round(value * 10) / 10, // Round to 1 decimal
            source,
            deviceId: sourceName || 'HealthKit Import',
            confidence: source === 'fingerstick' ? 1.0 : null,
          },
          update: {
            // If already exists, update value and source if newer
            value: Math.round(value * 10) / 10,
            source,
            deviceId: sourceName || 'HealthKit Import',
          },
        });

        importedCount++;
      } catch (recordError: any) {
        console.error('[HEALTHKIT IMPORT] Error processing record:', recordError);
        errors.push(recordError.message);
      }
    }

    console.log(`[HEALTHKIT IMPORT] ✓ Imported ${importedCount} readings, skipped ${skippedCount}`);

    return NextResponse.json(
      {
        success: true,
        imported: importedCount,
        skipped: skippedCount,
        total: glucoseRecords.length,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined, // Return first 5 errors
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[HEALTHKIT IMPORT] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
