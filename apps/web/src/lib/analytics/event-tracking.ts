/**
 * Analytics Event Tracking - Sprint 6 Beta Launch
 *
 * Non-PHI telemetry for product insights. NO user identifiers, NO medical data.
 * All events are anonymized and aggregated for product decision-making.
 *
 * PRIVACY COMPLIANCE:
 * - NO userId, personId, email, or names
 * - NO PHI (glucose values, meal names with identifiers)
 * - Hashed session IDs only (for funnel analysis)
 * - Aggregated metrics only in analytics
 *
 * @module event-tracking
 */

import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Event types for categorizing analytics events
 */
export enum EventType {
  PAGE_VIEW = 'page_view',
  FEATURE_USAGE = 'feature_usage',
  PERFORMANCE = 'performance',
  ERROR = 'error',
}

/**
 * Event names for specific tracking points
 */
export const EVENT_NAMES = {
  // Page views
  PAGE_VIEW_METABOLIC_DASHBOARD: 'metabolic_dashboard',
  PAGE_VIEW_METABOLIC_CAMERA: 'metabolic_camera',
  PAGE_VIEW_METABOLIC_ENTRY: 'metabolic_entry',
  PAGE_VIEW_METABOLIC_HISTORY: 'metabolic_history',
  PAGE_VIEW_ADMIN_DASHBOARD: 'admin_dashboard',

  // Feature usage
  FEATURE_CAMERA_CAPTURE: 'camera_capture',
  FEATURE_FILE_UPLOAD: 'file_upload',
  FEATURE_INGREDIENT_EDIT: 'ingredient_edit',
  FEATURE_PREDICTION_REQUESTED: 'prediction_requested',
  FEATURE_MEAL_TEMPLATE_USED: 'meal_template_used',
  FEATURE_CGM_CONNECTED: 'cgm_connected',
  FEATURE_TARGET_GLUCOSE_SET: 'target_glucose_set',

  // Performance metrics
  PERF_API_LATENCY: 'api_latency',
  PERF_PHOTO_UPLOAD_TIME: 'photo_upload_time',
  PERF_CHART_RENDER_TIME: 'chart_render_time',
  PERF_PAGE_LOAD_TIME: 'page_load_time',

  // Errors
  ERROR_PHOTO_UPLOAD_FAILED: 'photo_upload_failed',
  ERROR_API_REQUEST_FAILED: 'api_request_failed',
  ERROR_ANALYSIS_FAILED: 'analysis_failed',
  ERROR_CHART_RENDER_FAILED: 'chart_render_failed',
} as const;

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

/**
 * Metadata types for different event categories
 */
export interface PageViewMetadata {
  referrer?: string;
  viewport_width?: number;
  viewport_height?: number;
}

export interface FeatureUsageMetadata {
  feature_name: string;
  action: string;
  [key: string]: any; // Allow additional context
}

export interface PerformanceMetadata {
  endpoint?: string;
  latency_ms: number;
  file_size_mb?: number;
  chart_type?: string;
}

export interface ErrorMetadata {
  error_code?: string;
  error_message?: string; // Sanitized, no PHI
  endpoint?: string;
  status_code?: number;
  file_size_mb?: number;
}

type EventMetadata = PageViewMetadata | FeatureUsageMetadata | PerformanceMetadata | ErrorMetadata;

/**
 * Generates a privacy-preserving session ID by hashing the real session ID.
 * Used for funnel analysis without exposing user identifiers.
 *
 * @param sessionId - The original session ID (from browser storage or Supabase auth)
 * @returns Hashed session ID (first 16 chars of SHA-256 hash)
 */
function hashSessionId(sessionId: string): string {
  return createHash('sha256')
    .update(sessionId)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Tracks a generic analytics event.
 * Core tracking function used by all specific tracking functions.
 *
 * @param eventType - Category of the event
 * @param eventName - Specific event name
 * @param metadata - Non-PHI metadata associated with the event
 * @param sessionId - Optional session ID for funnel analysis (will be hashed)
 */
export async function trackEvent(
  eventType: EventType,
  eventName: EventName | string,
  metadata?: EventMetadata,
  sessionId?: string
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType,
        eventName,
        metadata: metadata ? (metadata as any) : undefined,
        sessionId: sessionId ? hashSessionId(sessionId) : undefined,
      },
    });
  } catch (error) {
    // Fail silently - don't break the user experience for analytics
    console.error('[Analytics] Failed to track event:', {
      eventType,
      eventName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Tracks a page view event.
 *
 * @param pageName - Name of the page being viewed
 * @param metadata - Page view metadata (referrer, viewport size)
 * @param sessionId - Optional session ID for funnel analysis
 *
 * @example
 * trackPageView('metabolic_dashboard', { viewport_width: 1920, viewport_height: 1080 });
 */
export async function trackPageView(
  pageName: EventName | string,
  metadata?: PageViewMetadata,
  sessionId?: string
): Promise<void> {
  await trackEvent(EventType.PAGE_VIEW, pageName, metadata, sessionId);
}

/**
 * Tracks a feature usage event.
 *
 * @param featureName - Name of the feature being used
 * @param action - The action performed (e.g., 'click', 'submit', 'edit')
 * @param additionalMetadata - Additional context (non-PHI)
 * @param sessionId - Optional session ID for funnel analysis
 *
 * @example
 * trackFeatureUsage('camera_capture', 'photo_taken', { photo_count: 1 });
 */
export async function trackFeatureUsage(
  featureName: EventName | string,
  action: string,
  additionalMetadata?: Record<string, any>,
  sessionId?: string
): Promise<void> {
  const metadata: FeatureUsageMetadata = {
    feature_name: featureName,
    action,
    ...additionalMetadata,
  };
  await trackEvent(EventType.FEATURE_USAGE, featureName, metadata, sessionId);
}

/**
 * Tracks a performance metric.
 *
 * @param metricName - Name of the performance metric
 * @param latencyMs - Latency in milliseconds
 * @param additionalMetadata - Additional context (endpoint, file size, chart type)
 * @param sessionId - Optional session ID for correlation
 *
 * @example
 * trackPerformance('api_latency', 1250, { endpoint: '/api/food-entries' });
 */
export async function trackPerformance(
  metricName: EventName | string,
  latencyMs: number,
  additionalMetadata?: Omit<PerformanceMetadata, 'latency_ms'>,
  sessionId?: string
): Promise<void> {
  const metadata: PerformanceMetadata = {
    latency_ms: latencyMs,
    ...additionalMetadata,
  };
  await trackEvent(EventType.PERFORMANCE, metricName, metadata, sessionId);
}

/**
 * Tracks an error event.
 *
 * @param errorName - Name of the error (use EVENT_NAMES constants)
 * @param errorMessage - Sanitized error message (NO PHI, NO user identifiers)
 * @param additionalMetadata - Additional context (error code, status code, endpoint)
 * @param sessionId - Optional session ID for debugging
 *
 * @example
 * trackError('photo_upload_failed', 'File size exceeds 10MB', {
 *   error_code: 'FILE_TOO_LARGE',
 *   file_size_mb: 12.5
 * });
 */
export async function trackError(
  errorName: EventName | string,
  errorMessage: string,
  additionalMetadata?: Omit<ErrorMetadata, 'error_message'>,
  sessionId?: string
): Promise<void> {
  const metadata: ErrorMetadata = {
    error_message: errorMessage,
    ...additionalMetadata,
  };
  await trackEvent(EventType.ERROR, errorName, metadata, sessionId);
}

/**
 * Privacy validation helper: Checks if metadata contains any PHI or user identifiers.
 * Use this in development to ensure compliance.
 *
 * @param metadata - The metadata to validate
 * @returns Array of detected PHI/identifier keys (empty if clean)
 */
export function validatePrivacy(metadata: any): string[] {
  const forbiddenKeys = [
    'userId',
    'personId',
    'email',
    'name',
    'givenName',
    'familyName',
    'glucose',
    'bloodSugar',
    'medication',
    'diagnosis',
  ];

  const violations: string[] = [];
  const checkObject = (obj: any, prefix = ''): void => {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const lowerKey = key.toLowerCase();

      // Check if key name contains forbidden terms
      if (forbiddenKeys.some((forbidden) => lowerKey.includes(forbidden.toLowerCase()))) {
        violations.push(fullKey);
      }

      // Recursively check nested objects
      if (typeof obj[key] === 'object') {
        checkObject(obj[key], fullKey);
      }
    }
  };

  checkObject(metadata);
  return violations;
}
