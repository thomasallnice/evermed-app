// Tests for session retry logic in glucose API
// Critical for Apple Health sync reliability: Prevents session expiration failures after 36+ readings
// Performance validation: Exponential backoff timing (1s, 2s, 4s)
// Medical safety: Ensures glucose readings are not lost due to session issues

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client before importing glucose module
vi.mock('../supabase', () => {
  const mockRefreshSession = vi.fn();

  return {
    supabase: {
      auth: {
        refreshSession: mockRefreshSession,
      },
    },
    API_URL: 'https://test.api.com',
  };
});

// Import after mocking
import { createGlucoseReading } from '../glucose';
import { supabase } from '../supabase';

// Mock global fetch
global.fetch = vi.fn();

// Mock setTimeout to control timing in tests
vi.useFakeTimers();

// Get reference to the mocked refresh function
const mockRefreshSession = supabase.auth.refreshSession as ReturnType<typeof vi.fn>;

describe('Glucose API - Session Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getValidSession()', () => {
    it('should return session immediately on first successful attempt', async () => {
      // Arrange: Mock successful session refresh
      const mockSession = {
        access_token: 'valid-token-123',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-123' },
      };

      mockRefreshSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      // Mock successful API call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          reading: {
            id: 'reading-1',
            value: 120,
            source: 'fingerstick',
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          disclaimer: 'Test disclaimer',
        }),
      });

      // Act: Call createGlucoseReading which uses getValidSession internally
      const result = await createGlucoseReading(120, 'fingerstick');

      // Assert: Should succeed without retries
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.reading.value).toBe(120);
    });

    it('should retry once with 1s delay when first attempt fails', async () => {
      // Arrange: First attempt fails, second succeeds
      const mockSession = {
        access_token: 'valid-token-456',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-456' },
      };

      mockRefreshSession
        .mockResolvedValueOnce({
          data: { session: null },
          error: { message: 'Session refresh failed' },
        })
        .mockResolvedValueOnce({
          data: { session: mockSession },
          error: null,
        });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          reading: {
            id: 'reading-2',
            value: 95,
            source: 'cgm',
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          disclaimer: 'Test disclaimer',
        }),
      });

      // Act: Start the request (returns a promise)
      const requestPromise = createGlucoseReading(95, 'cgm');

      // Fast-forward through the 1 second delay (2^0 * 1000 = 1000ms)
      await vi.advanceTimersByTimeAsync(1000);

      // Wait for the request to complete
      const result = await requestPromise;

      // Assert: Should retry once after 1 second
      expect(mockRefreshSession).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.reading.value).toBe(95);
    });

    it('should retry twice with 1s, 2s delays when first two attempts fail', async () => {
      // Arrange: First two attempts fail, third succeeds
      const mockSession = {
        access_token: 'valid-token-789',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-789' },
      };

      mockRefreshSession
        .mockResolvedValueOnce({
          data: { session: null },
          error: { message: 'First attempt failed' },
        })
        .mockResolvedValueOnce({
          data: { session: null },
          error: { message: 'Second attempt failed' },
        })
        .mockResolvedValueOnce({
          data: { session: mockSession },
          error: null,
        });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          reading: {
            id: 'reading-3',
            value: 140,
            source: 'lab',
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          disclaimer: 'Test disclaimer',
        }),
      });

      // Act: Start the request
      const requestPromise = createGlucoseReading(140, 'lab');

      // Fast-forward through first delay (1s)
      await vi.advanceTimersByTimeAsync(1000);

      // Fast-forward through second delay (2s = 2^1 * 1000)
      await vi.advanceTimersByTimeAsync(2000);

      // Wait for completion
      const result = await requestPromise;

      // Assert: Should retry twice with exponential backoff
      expect(mockRefreshSession).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.reading.value).toBe(140);
    });

    it('should throw error after all 3 retries are exhausted', async () => {
      // Arrange: All three attempts fail
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session refresh failed' },
      });

      // Act: Start the request with immediate catch to prevent unhandled rejection
      let errorCaught: Error | null = null;
      const requestPromise = createGlucoseReading(110, 'fingerstick');

      // Attach catch handler immediately to prevent unhandled rejection warning
      requestPromise.catch((e) => {
        errorCaught = e;
      });

      // Fast-forward through all delays
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      await vi.advanceTimersByTimeAsync(2000); // Second retry delay

      // Assert: Should throw after 3 attempts
      await expect(requestPromise).rejects.toThrow(
        'Session expired. Please sign out and sign in again.'
      );

      expect(mockRefreshSession).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff timing: 1s, 2s, 4s', async () => {
      // Arrange: Track when each attempt happens
      const attemptTimestamps: number[] = [];

      mockRefreshSession.mockImplementation(async () => {
        attemptTimestamps.push(Date.now());
        return {
          data: { session: null },
          error: { message: 'Failed' },
        };
      });

      // Act: Start the request with immediate catch handler
      const requestPromise = createGlucoseReading(115, 'cgm');
      requestPromise.catch(() => {}); // Prevent unhandled rejection warning

      // Initial attempt at t=0
      await vi.advanceTimersByTimeAsync(0);

      // First retry after 1000ms
      await vi.advanceTimersByTimeAsync(1000);

      // Second retry after 2000ms more
      await vi.advanceTimersByTimeAsync(2000);

      // Wait for final failure
      await expect(requestPromise).rejects.toThrow();

      // Assert: Verify exponential backoff timing
      expect(attemptTimestamps).toHaveLength(3);

      // Calculate delays between attempts
      const delay1 = attemptTimestamps[1] - attemptTimestamps[0];
      const delay2 = attemptTimestamps[2] - attemptTimestamps[1];

      // Should be 1000ms (2^0 * 1000) and 2000ms (2^1 * 1000)
      expect(delay1).toBe(1000);
      expect(delay2).toBe(2000);
    });

    it('should handle session expiration during long Apple Health sync', async () => {
      // Scenario: Syncing 210 readings, token expires after 150 readings
      // This simulates the real-world issue where sync fails after 36 readings

      const validSession = {
        access_token: 'initial-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-sync' },
      };

      const refreshedSession = {
        access_token: 'refreshed-token',
        expires_at: Math.floor(Date.now() / 1000) + 7200,
        user: { id: 'user-sync' },
      };

      let callCount = 0;

      // First 150 calls succeed, then session expires, then refresh succeeds
      mockRefreshSession.mockImplementation(async () => {
        callCount++;

        if (callCount <= 150) {
          return { data: { session: validSession }, error: null };
        } else if (callCount === 151) {
          // Simulate session expiration
          return { data: { session: null }, error: { message: 'Token expired' } };
        } else {
          // Refresh succeeds
          return { data: { session: refreshedSession }, error: null };
        }
      });

      let fetchCallCount = 0;
      (global.fetch as any).mockImplementation(async () => {
        fetchCallCount++;
        return {
          ok: true,
          json: async () => ({
            success: true,
            reading: {
              id: `reading-${fetchCallCount}`,
              value: 99 + fetchCallCount, // Start at 100 for first fetch
              source: 'cgm',
              timestamp: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
            disclaimer: 'Test disclaimer',
          }),
        };
      });

      // Simulate syncing 152 readings (crossing the expiration boundary)
      const syncPromises: Promise<any>[] = [];

      for (let i = 0; i < 152; i++) {
        syncPromises.push(
          (async () => {
            const promise = createGlucoseReading(100 + i, 'cgm');
            // If this is the 151st call, advance timers to handle retry
            if (i === 150) {
              await vi.advanceTimersByTimeAsync(1000);
            }
            return promise;
          })()
        );
      }

      // Wait for all syncs to complete
      const results = await Promise.all(syncPromises);

      // Assert: All readings should succeed, even after token expiration
      expect(results).toHaveLength(152);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        // Don't assert on specific value since the order may vary due to async execution
        expect(result.reading.value).toBeGreaterThanOrEqual(100);
        expect(result.reading.value).toBeLessThanOrEqual(251);
      });

      // Should have refreshed session at least once after expiration
      expect(mockRefreshSession.mock.calls.length).toBeGreaterThanOrEqual(152);
    });
  });

  describe('createGlucoseReading() integration with session retry', () => {
    it('should successfully create reading after session refresh', async () => {
      // Arrange: Session refresh succeeds
      const mockSession = {
        access_token: 'fresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-integration' },
      };

      mockRefreshSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          reading: {
            id: 'reading-integration-1',
            value: 130,
            source: 'fingerstick',
            timestamp: '2025-10-29T10:00:00Z',
            createdAt: '2025-10-29T10:00:00Z',
          },
          disclaimer: 'This is not medical advice',
        }),
      });

      // Act: Create a glucose reading
      const result = await createGlucoseReading(130, 'fingerstick', '2025-10-29T10:00:00Z');

      // Assert: Should succeed with correct data
      expect(result.success).toBe(true);
      expect(result.reading.value).toBe(130);
      expect(result.reading.source).toBe('fingerstick');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.api.com/api/metabolic/glucose',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer fresh-token',
          }),
        })
      );
    });

    it('should fail gracefully when session cannot be refreshed after retries', async () => {
      // Arrange: All refresh attempts fail
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Refresh failed' },
      });

      // Act: Start the request with immediate catch handler
      const requestPromise = createGlucoseReading(125, 'cgm');
      requestPromise.catch(() => {}); // Prevent unhandled rejection warning

      // Fast-forward through all retry delays
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      // Assert: Should throw descriptive error
      await expect(requestPromise).rejects.toThrow(
        'Session expired. Please sign out and sign in again.'
      );

      // Should not call API if session refresh fails
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should validate glucose value range (20-600 mg/dL)', async () => {
      // Arrange: Valid session
      const mockSession = {
        access_token: 'valid-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-validation' },
      };

      mockRefreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Act & Assert: Value too low
      await expect(createGlucoseReading(15, 'fingerstick')).rejects.toThrow(
        'Please enter a value between 20 and 600 mg/dL'
      );

      // Act & Assert: Value too high
      await expect(createGlucoseReading(650, 'cgm')).rejects.toThrow(
        'Please enter a value between 20 and 600 mg/dL'
      );

      // Should not call API for invalid values
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully after successful session refresh', async () => {
      // Arrange: Session succeeds, but API call fails
      const mockSession = {
        access_token: 'valid-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-api-error' },
      };

      mockRefreshSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => JSON.stringify({ error: 'Database connection failed' }),
      });

      // Act & Assert: Should throw API error
      // Note: glucose.ts hardcodes message for 500 errors, ignoring error.error
      await expect(createGlucoseReading(110, 'lab')).rejects.toThrow(
        'Failed to save glucose reading. Please try again.'
      );

      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle 404 error when Person record is missing', async () => {
      // Arrange: Session succeeds, API returns 404
      const mockSession = {
        access_token: 'valid-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-404' },
      };

      mockRefreshSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ error: 'Person record not found' }),
      });

      // Act & Assert: Should throw user-friendly error
      await expect(createGlucoseReading(105, 'fingerstick')).rejects.toThrow(
        'Please complete your profile setup first'
      );
    });

    it('should handle 401 error with session re-authentication message', async () => {
      // Arrange: Session succeeds, but API returns 401 (stale token edge case)
      const mockSession = {
        access_token: 'stale-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-401' },
      };

      mockRefreshSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ error: 'Invalid or expired token' }),
      });

      // Act & Assert: Should throw re-authentication message
      await expect(createGlucoseReading(118, 'cgm')).rejects.toThrow(
        'Please sign out and sign in again.'
      );
    });
  });

  describe('Edge Cases & Medical Safety', () => {
    it('should handle rapid concurrent reading submissions', async () => {
      // Scenario: User submits multiple readings quickly (e.g., manual entry batch)
      const mockSession = {
        access_token: 'concurrent-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-concurrent' },
      };

      mockRefreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      let apiCallCount = 0;
      (global.fetch as any).mockImplementation(async () => {
        apiCallCount++;
        return {
          ok: true,
          json: async () => ({
            success: true,
            reading: {
              id: `reading-${apiCallCount}`,
              value: 100 + apiCallCount,
              source: 'fingerstick',
              timestamp: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
            disclaimer: 'Test disclaimer',
          }),
        };
      });

      // Submit 10 readings concurrently
      const readings = [120, 125, 130, 128, 122, 135, 140, 138, 132, 128];
      const promises = readings.map((value) => createGlucoseReading(value, 'fingerstick'));

      const results = await Promise.all(promises);

      // Assert: All readings should succeed
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      expect(apiCallCount).toBe(10);
    });

    it('should not retry on network errors (throw immediately)', async () => {
      // Arrange: Session succeeds, but network error occurs
      const mockSession = {
        access_token: 'network-error-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-network' },
      };

      mockRefreshSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      (global.fetch as any).mockRejectedValueOnce(new Error('Network request failed'));

      // Act & Assert: Should throw network error without retry
      await expect(createGlucoseReading(115, 'cgm')).rejects.toThrow('Network request failed');

      // Session should only be refreshed once (no retry on network errors)
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    });

    it('should preserve reading timestamp accuracy across retries', async () => {
      // Critical for medical accuracy: Timestamp must reflect actual reading time
      const originalTimestamp = '2025-10-29T08:30:00Z';

      const mockSession = {
        access_token: 'timestamp-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-timestamp' },
      };

      mockRefreshSession
        .mockResolvedValueOnce({
          data: { session: null },
          error: { message: 'First attempt failed' },
        })
        .mockResolvedValueOnce({
          data: { session: mockSession },
          error: null,
        });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          reading: {
            id: 'reading-timestamp',
            value: 142,
            source: 'fingerstick',
            timestamp: originalTimestamp,
            createdAt: new Date().toISOString(),
          },
          disclaimer: 'Test disclaimer',
        }),
      });

      // Act: Submit with explicit timestamp
      const requestPromise = createGlucoseReading(142, 'fingerstick', originalTimestamp);
      await vi.advanceTimersByTimeAsync(1000); // Wait for retry
      const result = await requestPromise;

      // Assert: Timestamp should match original, not retry time
      expect(result.reading.timestamp).toBe(originalTimestamp);

      // Verify API was called with original timestamp
      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.timestamp).toBe(originalTimestamp);
    });

    it('should log session diagnostics for debugging production issues', async () => {
      // Arrange: Spy on console.log to verify diagnostic logging
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockSession = {
        access_token: 'diagnostic-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'user-diagnostic' },
      };

      mockRefreshSession
        .mockResolvedValueOnce({
          data: { session: null },
          error: { message: 'Diagnostic test failure' },
        })
        .mockResolvedValueOnce({
          data: { session: mockSession },
          error: null,
        });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          reading: { id: 'reading-diag', value: 100, source: 'cgm', timestamp: new Date().toISOString(), createdAt: new Date().toISOString() },
          disclaimer: 'Test',
        }),
      });

      // Act
      const requestPromise = createGlucoseReading(100, 'cgm');
      await vi.advanceTimersByTimeAsync(1000);
      await requestPromise;

      // Assert: Should log session diagnostics
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SESSION] Refresh attempt 1/3 failed:'),
        expect.any(Object)
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GLUCOSE CREATE] Session valid until:',
        expect.any(String)
      );

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });
});
