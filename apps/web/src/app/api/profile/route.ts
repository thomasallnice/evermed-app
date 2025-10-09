import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@/lib/supabase/server'

const prisma = new PrismaClient()

/**
 * GET /api/profile
 * Returns user's full profile (account + health data)
 * Replaces legacy user_graph REST API calls
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch Person record via ownerId (RLS enforced)
    const person = await prisma.person.findUnique({
      where: { ownerId: user.id },
      select: {
        id: true,
        givenName: true,
        familyName: true,
        birthYear: true,
        sexAtBirth: true,
        locale: true,
        heightCm: true,
        weightKg: true,
        allergies: true,
        diet: true,
        behaviors: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!person) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Calculate BMI if height and weight available
    let bmi: number | null = null
    if (person.heightCm && person.weightKg && person.heightCm > 0) {
      const heightM = person.heightCm / 100
      bmi = Math.round((person.weightKg / (heightM * heightM)) * 10) / 10
    }

    // Calculate age from birthYear if available
    let age: number | null = null
    if (person.birthYear) {
      const currentYear = new Date().getFullYear()
      age = currentYear - person.birthYear
    }

    return NextResponse.json({
      ...person,
      bmi,
      age,
      email: user.email,
      name: (user.user_metadata as any)?.name || null,
      avatarUrl: (user.user_metadata as any)?.avatar_url || null,
    })
  } catch (error) {
    console.error('GET /api/profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/profile
 * Updates user's health profile fields
 * Replaces legacy user_graph upsert calls
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate and sanitize input
    const updateData: any = {}

    // Basic identity fields
    if (body.givenName !== undefined) updateData.givenName = body.givenName
    if (body.familyName !== undefined) updateData.familyName = body.familyName
    if (body.birthYear !== undefined) {
      const year = Number(body.birthYear)
      if (year < 1900 || year > new Date().getFullYear()) {
        return NextResponse.json(
          { error: 'Invalid birth year' },
          { status: 400 }
        )
      }
      updateData.birthYear = year
    }
    if (body.sexAtBirth !== undefined) updateData.sexAtBirth = body.sexAtBirth
    if (body.locale !== undefined) updateData.locale = body.locale

    // Health profile fields
    if (body.heightCm !== undefined) {
      const height = Number(body.heightCm)
      if (height < 0 || height > 300) {
        return NextResponse.json({ error: 'Invalid height' }, { status: 400 })
      }
      updateData.heightCm = height
    }

    if (body.weightKg !== undefined) {
      const weight = Number(body.weightKg)
      if (weight < 0 || weight > 500) {
        return NextResponse.json({ error: 'Invalid weight' }, { status: 400 })
      }
      updateData.weightKg = weight
    }

    // Array fields - ensure they are arrays
    if (body.allergies !== undefined) {
      if (!Array.isArray(body.allergies)) {
        return NextResponse.json(
          { error: 'Allergies must be an array' },
          { status: 400 }
        )
      }
      updateData.allergies = body.allergies.filter(
        (item: any) => typeof item === 'string' && item.trim().length > 0
      )
    }

    if (body.diet !== undefined) {
      if (!Array.isArray(body.diet)) {
        return NextResponse.json(
          { error: 'Diet must be an array' },
          { status: 400 }
        )
      }
      updateData.diet = body.diet.filter(
        (item: any) => typeof item === 'string' && item.trim().length > 0
      )
    }

    if (body.behaviors !== undefined) {
      if (!Array.isArray(body.behaviors)) {
        return NextResponse.json(
          { error: 'Behaviors must be an array' },
          { status: 400 }
        )
      }
      updateData.behaviors = body.behaviors.filter(
        (item: any) => typeof item === 'string' && item.trim().length > 0
      )
    }

    // Update Person record (RLS enforced)
    const updatedPerson = await prisma.person.update({
      where: { ownerId: user.id },
      data: updateData,
      select: {
        id: true,
        givenName: true,
        familyName: true,
        birthYear: true,
        sexAtBirth: true,
        locale: true,
        heightCm: true,
        weightKg: true,
        allergies: true,
        diet: true,
        behaviors: true,
        updatedAt: true,
      },
    })

    // Calculate BMI
    let bmi: number | null = null
    if (updatedPerson.heightCm && updatedPerson.weightKg && updatedPerson.heightCm > 0) {
      const heightM = updatedPerson.heightCm / 100
      bmi = Math.round((updatedPerson.weightKg / (heightM * heightM)) * 10) / 10
    }

    // Update auth metadata (name) if provided
    if (body.name !== undefined) {
      await supabase.auth.updateUser({
        data: { name: body.name },
      })
    }

    return NextResponse.json({
      ...updatedPerson,
      bmi,
      message: 'Profile updated successfully',
    })
  } catch (error: any) {
    console.error('PATCH /api/profile error:', error)

    // Handle Prisma-specific errors
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
