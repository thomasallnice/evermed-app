/**
 * Metabolic Insights Onboarding API
 *
 * POST /api/metabolic/onboarding
 * Saves onboarding preferences (glucose targets, onboarding completion status)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (placeholder - use Supabase auth in production)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { targetGlucoseMin, targetGlucoseMax, onboardingCompleted } = body;

    // Find person by ownerId (Supabase auth.uid())
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    // Update person with glucose targets and onboarding status
    const updatedPerson = await prisma.person.update({
      where: { id: person.id },
      data: {
        targetGlucoseMin: targetGlucoseMin || null,
        targetGlucoseMax: targetGlucoseMax || null,
        metadata: {
          ...(person.metadata as any || {}),
          metabolic_onboarding_completed: onboardingCompleted || false,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        person: {
          id: updatedPerson.id,
          targetGlucoseMin: updatedPerson.targetGlucoseMin,
          targetGlucoseMax: updatedPerson.targetGlucoseMax,
          onboardingCompleted: (updatedPerson.metadata as any)?.metabolic_onboarding_completed,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Onboarding API] Error saving onboarding data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
