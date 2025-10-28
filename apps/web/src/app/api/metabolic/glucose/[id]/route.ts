import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireUserId } from '@/lib/auth'

const prisma = new PrismaClient()

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic'

/**
 * DELETE /api/metabolic/glucose/[id]
 *
 * Delete a glucose reading
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Response (200):
 * {
 *   success: true,
 *   message: string
 * }
 *
 * Errors:
 * - 401: Unauthorized
 * - 404: Glucose reading not found or unauthorized
 * - 500: Server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const userId = await requireUserId(request)

    const { id } = params

    // Get the user's Person record
    const person = await prisma.person.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    })

    if (!person) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete onboarding.' },
        { status: 404 }
      )
    }

    // Check if reading exists and belongs to this user
    const existingReading = await prisma.glucoseReading.findFirst({
      where: {
        id,
        personId: person.id, // RLS: ensure user owns this reading
      },
    })

    if (!existingReading) {
      return NextResponse.json(
        { error: 'Glucose reading not found or you do not have permission to delete it.' },
        { status: 404 }
      )
    }

    // Delete the reading
    await prisma.glucoseReading.delete({
      where: { id },
    })

    console.log(`[GLUCOSE DELETE] Successfully deleted reading ${id} for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Glucose reading deleted successfully',
    })
  } catch (error: any) {
    console.error('[GLUCOSE DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete glucose reading. Please try again.' },
      { status: 500 }
    )
  }
}
