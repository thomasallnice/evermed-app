import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic';

/**
 * Daily Timeline API - Glucose and Meal Timeline
 *
 * GET /api/analytics/timeline/daily?date=YYYY-MM-DD
 *
 * Fetches all glucose readings and meal entries for the specified day.
 */
export async function GET(req: NextRequest) {
  console.log('[TIMELINE API] Request received')
  try {
    const userId = await requireUserId(req);
    console.log(`[TIMELINE API] User ID: ${userId}`)

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    console.log(`[TIMELINE API] Date parameter: ${dateParam}`)

    if (!dateParam) {
      console.error('[TIMELINE API] Missing date parameter')
      return NextResponse.json(
        { error: 'Missing date parameter' },
        { status: 400 }
      );
    }

    // Get Person record
    console.log('[TIMELINE API] Fetching person record...')
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
    });

    if (!person) {
      console.error('[TIMELINE API] Person record not found')
      return NextResponse.json(
        { error: 'Person record not found' },
        { status: 404 }
      );
    }

    console.log(`[TIMELINE API] Person ID: ${person.id}`)

    // Parse date and create date range for the entire day in UTC
    // Date string format: "2025-10-13" -> treat as UTC midnight
    const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);

    console.log(`[TIMELINE API] Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`)

    // Fetch glucose readings for the day
    console.log('[TIMELINE API] Fetching glucose readings...')
    const glucoseReadings = await prisma.glucoseReading.findMany({
      where: {
        personId: person.id,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
      select: {
        timestamp: true,
        value: true,
      },
    });

    console.log(`[TIMELINE API] Found ${glucoseReadings.length} glucose readings`)

    // Fetch food entries for the day
    console.log('[TIMELINE API] Fetching food entries...')
    const foodEntries = await prisma.foodEntry.findMany({
      where: {
        personId: person.id,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
      select: {
        id: true,
        timestamp: true,
        mealType: true,
        totalCalories: true,
        totalCarbsG: true,
        totalProteinG: true,
        totalFatG: true,
        totalFiberG: true,
        notes: true,
        photos: {
          select: {
            id: true,
            storagePath: true,
            thumbnailPath: true,
            analysisStatus: true,
          },
        },
        ingredients: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unit: true,
            calories: true,
            carbsG: true,
            proteinG: true,
            fatG: true,
            fiberG: true,
          },
        },
      },
    });

    console.log(`[TIMELINE API] Found ${foodEntries.length} food entries`)

    // Create Supabase client for generating public URLs (if credentials available)
    let supabase = null;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        );
      } catch (err) {
        console.warn('[TIMELINE API] Failed to create Supabase client for photo URLs:', err);
      }
    } else {
      console.warn('[TIMELINE API] Supabase credentials not available, photo URLs will be null');
    }

    // Format glucose data
    console.log('[TIMELINE API] Formatting response data...')
    const glucose = glucoseReadings.map((reading) => ({
      timestamp: reading.timestamp.toISOString(),
      value: reading.value,
    }));

    // Format meal data with photo URLs
    const meals = foodEntries.map((entry) => {
      let photoUrl = null;
      const photoUrls: string[] = [];

      // Generate URLs for all photos
      if (supabase && entry.photos.length > 0) {
        for (const photo of entry.photos) {
          try {
            const url = supabase.storage
              .from('food-photos')
              .getPublicUrl(photo.storagePath).data.publicUrl;
            photoUrls.push(url);
            if (!photoUrl) photoUrl = url; // Keep first URL for backward compatibility
          } catch (err) {
            console.warn('[TIMELINE API] Failed to generate photo URL:', err);
          }
        }
      }

      return {
        id: entry.id,
        timestamp: entry.timestamp.toISOString(),
        type: entry.mealType,
        name: entry.ingredients.map((ing) => ing.name).join(', ') || 'Meal',
        photoUrl, // Keep for backward compatibility
        photoUrls, // New array of all photo URLs
        analysisStatus: entry.photos[0]?.analysisStatus || 'completed',
        calories: Math.round(entry.totalCalories),
        carbs: Math.round(entry.totalCarbsG * 10) / 10,
        protein: Math.round(entry.totalProteinG * 10) / 10,
        fat: Math.round(entry.totalFatG * 10) / 10,
        fiber: Math.round(entry.totalFiberG * 10) / 10,
        notes: entry.notes,
        ingredients: entry.ingredients.map((ing) => ({
          id: ing.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          calories: Math.round(ing.calories),
          carbs: Math.round((ing.carbsG || 0) * 10) / 10,
          protein: Math.round((ing.proteinG || 0) * 10) / 10,
          fat: Math.round((ing.fatG || 0) * 10) / 10,
          fiber: Math.round((ing.fiberG || 0) * 10) / 10,
        })),
      };
    });

    console.log(`[TIMELINE API] ✓ Success! Returning ${glucose.length} glucose readings and ${meals.length} meals`)

    return NextResponse.json(
      {
        glucose,
        meals,
        disclaimer: "This glucose and meal data is for informational purposes only. It is not medical advice and should not be used for insulin dosing, diagnosis, or treatment decisions. Individual responses vary. Always consult your healthcare provider for medical guidance.",
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('[TIMELINE API] ❌ Error:', e);
    console.error('[TIMELINE API] Error message:', e?.message);
    console.error('[TIMELINE API] Error stack:', e?.stack);
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
