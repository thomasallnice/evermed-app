/**
 * Analytics Tracking API Endpoint
 *
 * POST /api/analytics/track
 * Receives analytics events from the client and stores them in the database.
 *
 * PRIVACY COMPLIANCE:
 * - NO user identifiers (userId, personId, email)
 * - NO PHI (medical data, patient names)
 * - Validates metadata for privacy violations
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackEvent, EventType, validatePrivacy } from '@/lib/analytics/event-tracking';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, eventName, metadata, sessionId } = body;

    // Validate required fields
    if (!eventType || !eventName) {
      return NextResponse.json(
        { error: 'eventType and eventName are required' },
        { status: 400 }
      );
    }

    // Privacy validation: Check for PHI or user identifiers in metadata
    if (metadata) {
      const violations = validatePrivacy(metadata);
      if (violations.length > 0) {
        console.error('[Analytics API] Privacy violation detected:', violations);
        return NextResponse.json(
          {
            error: 'Privacy violation: metadata contains forbidden keys',
            violations,
          },
          { status: 400 }
        );
      }
    }

    // Validate eventType is a known enum value
    if (!Object.values(EventType).includes(eventType as EventType)) {
      return NextResponse.json(
        { error: `Invalid eventType: ${eventType}` },
        { status: 400 }
      );
    }

    // Track the event
    await trackEvent(eventType as EventType, eventName, metadata, sessionId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Analytics API] Error tracking event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
