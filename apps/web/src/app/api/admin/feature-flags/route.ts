/**
 * Admin Feature Flags API Endpoint
 *
 * GET /api/admin/feature-flags - Get all feature flags
 * POST /api/admin/feature-flags - Update a feature flag
 * PUT /api/admin/feature-flags - Create a new feature flag
 *
 * Admin authentication required.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllFeatureFlags,
  updateFeatureFlag,
  createFeatureFlag,
  FeatureFlagName,
} from '@/lib/feature-flags';

// TODO: Implement proper admin auth check
// For now, this is a placeholder - should verify user has admin role
function isAdmin(request: NextRequest): boolean {
  // In production, check JWT token for admin role
  // For beta, allow access (will be secured in production)
  return true;
}

/**
 * GET /api/admin/feature-flags
 * Returns all feature flags
 */
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const flags = await getAllFeatureFlags();
    return NextResponse.json({ flags }, { status: 200 });
  } catch (error) {
    console.error('[Admin API] Error fetching feature flags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/feature-flags
 * Updates an existing feature flag
 *
 * Body: { name, enabled, rolloutPercent }
 */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, enabled, rolloutPercent } = body;

    // Validate required fields
    if (!name || enabled === undefined || rolloutPercent === undefined) {
      return NextResponse.json(
        { error: 'name, enabled, and rolloutPercent are required' },
        { status: 400 }
      );
    }

    // Validate rolloutPercent range
    if (rolloutPercent < 0 || rolloutPercent > 100) {
      return NextResponse.json(
        { error: 'rolloutPercent must be between 0 and 100' },
        { status: 400 }
      );
    }

    const updatedFlag = await updateFeatureFlag(
      name as FeatureFlagName,
      enabled,
      rolloutPercent
    );

    return NextResponse.json({ flag: updatedFlag }, { status: 200 });
  } catch (error) {
    console.error('[Admin API] Error updating feature flag:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/feature-flags
 * Creates a new feature flag
 *
 * Body: { name, description, enabled?, rolloutPercent? }
 */
export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      enabled = false,
      rolloutPercent = 0,
    } = body;

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json(
        { error: 'name and description are required' },
        { status: 400 }
      );
    }

    // Validate rolloutPercent range
    if (rolloutPercent < 0 || rolloutPercent > 100) {
      return NextResponse.json(
        { error: 'rolloutPercent must be between 0 and 100' },
        { status: 400 }
      );
    }

    const newFlag = await createFeatureFlag(
      name,
      description,
      enabled,
      rolloutPercent
    );

    return NextResponse.json({ flag: newFlag }, { status: 201 });
  } catch (error) {
    console.error('[Admin API] Error creating feature flag:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
