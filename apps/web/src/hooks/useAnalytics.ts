/**
 * useAnalytics Hook - Client-Side Analytics Tracking
 *
 * React hook for tracking user interactions and page views on the client side.
 * Automatically generates session IDs and provides convenient tracking methods.
 *
 * @module useAnalytics
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Generates or retrieves a session ID from sessionStorage.
 * Session ID persists for the browser tab's lifetime.
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Sends an analytics event to the tracking API.
 *
 * @param eventType - Type of event (page_view, feature_usage, performance, error)
 * @param eventName - Name of the event
 * @param metadata - Event metadata (non-PHI)
 * @param sessionId - Session ID for funnel tracking
 */
async function sendAnalyticsEvent(
  eventType: string,
  eventName: string,
  metadata?: Record<string, any>,
  sessionId?: string
): Promise<void> {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        eventName,
        metadata,
        sessionId,
      }),
    });
  } catch (error) {
    // Fail silently - don't break UX for analytics
    console.error('[useAnalytics] Failed to send event:', error);
  }
}

/**
 * React hook for tracking analytics events.
 *
 * Features:
 * - Automatic page view tracking on route changes
 * - Convenient methods for tracking feature usage, performance, and errors
 * - Session-based funnel tracking
 * - Performance timing helpers
 *
 * @param options - Configuration options
 * @returns Analytics tracking methods
 *
 * @example
 * const analytics = useAnalytics({ autoTrackPageViews: true });
 *
 * // Track feature usage
 * analytics.trackFeatureUsage('camera_capture', 'photo_taken', { photo_count: 1 });
 *
 * // Track performance
 * const timer = analytics.startTimer();
 * await uploadPhoto();
 * analytics.trackPerformance('photo_upload_time', timer.elapsed(), {
 *   file_size_mb: file.size / 1024 / 1024
 * });
 *
 * // Track errors
 * analytics.trackError('photo_upload_failed', 'Network timeout', {
 *   error_code: 'NETWORK_TIMEOUT'
 * });
 */
export function useAnalytics(options: { autoTrackPageViews?: boolean } = {}) {
  const pathname = usePathname();
  const sessionId = useRef<string>('');

  // Initialize session ID on mount
  useEffect(() => {
    sessionId.current = getSessionId();
  }, []);

  // Auto-track page views when pathname changes
  useEffect(() => {
    if (options.autoTrackPageViews !== false && pathname) {
      // Extract page name from pathname
      const pageName = pathname.split('/').filter(Boolean).join('_') || 'home';

      // Track page view with viewport dimensions
      sendAnalyticsEvent(
        'page_view',
        pageName,
        {
          pathname,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          referrer: document.referrer,
        },
        sessionId.current
      );
    }
  }, [pathname, options.autoTrackPageViews]);

  /**
   * Tracks a page view manually (useful when autoTrackPageViews is disabled).
   */
  const trackPageView = useCallback(
    (pageName: string, metadata?: Record<string, any>) => {
      sendAnalyticsEvent('page_view', pageName, metadata, sessionId.current);
    },
    []
  );

  /**
   * Tracks a feature usage event.
   */
  const trackFeatureUsage = useCallback(
    (featureName: string, action: string, metadata?: Record<string, any>) => {
      sendAnalyticsEvent(
        'feature_usage',
        featureName,
        { feature_name: featureName, action, ...metadata },
        sessionId.current
      );
    },
    []
  );

  /**
   * Tracks a performance metric.
   */
  const trackPerformance = useCallback(
    (metricName: string, latencyMs: number, metadata?: Record<string, any>) => {
      sendAnalyticsEvent(
        'performance',
        metricName,
        { latency_ms: latencyMs, ...metadata },
        sessionId.current
      );
    },
    []
  );

  /**
   * Tracks an error event.
   */
  const trackError = useCallback(
    (errorName: string, errorMessage: string, metadata?: Record<string, any>) => {
      sendAnalyticsEvent(
        'error',
        errorName,
        { error_message: errorMessage, ...metadata },
        sessionId.current
      );
    },
    []
  );

  /**
   * Starts a performance timer. Returns an object with an `elapsed()` method.
   *
   * @example
   * const timer = analytics.startTimer();
   * await someAsyncOperation();
   * analytics.trackPerformance('operation_time', timer.elapsed());
   */
  const startTimer = useCallback(() => {
    const startTime = performance.now();
    return {
      elapsed: () => Math.round(performance.now() - startTime),
    };
  }, []);

  /**
   * Tracks a button click with automatic event details.
   */
  const trackClick = useCallback(
    (buttonName: string, metadata?: Record<string, any>) => {
      trackFeatureUsage(buttonName, 'click', metadata);
    },
    [trackFeatureUsage]
  );

  return {
    trackPageView,
    trackFeatureUsage,
    trackPerformance,
    trackError,
    startTimer,
    trackClick,
  };
}
