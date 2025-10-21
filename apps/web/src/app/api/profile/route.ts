/**
 * Profile API
 *
 * GET /api/profile - Fetch user's health profile data
 * POST /api/profile - Update user's health profile data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7) // Remove 'Bearer ' prefix
}

export async function GET(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const token = getAuthenticatedUser(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token and get user
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Profile API] Missing Supabase credentials')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Find person by ownerId
    const person = await prisma.person.findFirst({
      where: { ownerId: user.id },
      select: {
        id: true,
        givenName: true,
        familyName: true,
        birthYear: true,
        sexAtBirth: true,
        metadata: true,
      },
    })

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    // Extract health profile from metadata
    const metadata = (person.metadata as any) || {}
    const profile = {
      givenName: person.givenName,
      familyName: person.familyName,
      birthYear: person.birthYear,
      sexAtBirth: person.sexAtBirth,
      age: metadata.age,
      heightCm: metadata.height_cm,
      weightKg: metadata.weight_kg,
      bmi: metadata.bmi,
      diet: metadata.diet || [],
      behaviors: metadata.behaviors || [],
      allergies: metadata.allergies || [],
    }

    return NextResponse.json({ profile }, { status: 200 })
  } catch (error) {
    console.error('[Profile API] Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const token = getAuthenticatedUser(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token and get user
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Profile API] Missing Supabase credentials')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const {
      givenName,
      familyName,
      birthYear,
      sexAtBirth,
      age,
      heightCm,
      weightKg,
      diet,
      behaviors,
      allergies,
    } = body

    // Find person by ownerId
    const person = await prisma.person.findFirst({
      where: { ownerId: user.id },
    })

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    // Calculate BMI if height and weight are provided
    let bmi: number | undefined
    if (heightCm && weightKg) {
      bmi = weightKg / Math.pow(heightCm / 100, 2)
      bmi = Math.round(bmi * 10) / 10
    }

    // Build metadata object
    const existingMetadata = (person.metadata as any) || {}
    const metadata = {
      ...existingMetadata,
      age,
      height_cm: heightCm,
      weight_kg: weightKg,
      bmi,
      diet: diet || [],
      behaviors: behaviors || [],
      allergies: allergies || [],
    }

    // Update person
    const updatedPerson = await prisma.person.update({
      where: { id: person.id },
      data: {
        givenName: givenName || null,
        familyName: familyName || null,
        birthYear: birthYear || null,
        sexAtBirth: sexAtBirth || null,
        metadata,
      },
    })

    return NextResponse.json(
      {
        success: true,
        profile: {
          givenName: updatedPerson.givenName,
          familyName: updatedPerson.familyName,
          birthYear: updatedPerson.birthYear,
          sexAtBirth: updatedPerson.sexAtBirth,
          age: (updatedPerson.metadata as any)?.age,
          heightCm: (updatedPerson.metadata as any)?.height_cm,
          weightKg: (updatedPerson.metadata as any)?.weight_kg,
          bmi: (updatedPerson.metadata as any)?.bmi,
          diet: (updatedPerson.metadata as any)?.diet || [],
          behaviors: (updatedPerson.metadata as any)?.behaviors || [],
          allergies: (updatedPerson.metadata as any)?.allergies || [],
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Profile API] Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
