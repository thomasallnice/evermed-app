// tests/mocks/dexcom-mock.ts
import {
  DexcomClient,
  DexcomTokenResponse,
  DexcomEGVsResponse,
  DexcomEGV,
} from '../../apps/web/src/lib/services/dexcom-client';

/**
 * Mock Dexcom API Client for Testing
 *
 * Provides realistic responses for OAuth and EGV endpoints without calling real API.
 * Enable with environment variable: USE_MOCK_DEXCOM=true
 */

export class MockDexcomClient implements Pick<DexcomClient, 'getAuthorizationUrl' | 'exchangeCodeForTokens' | 'refreshAccessToken' | 'getEGVs'> {
  private baseUrl: string;
  private clientId: string;
  private redirectUri: string;

  // Mock data store
  private mockTokens: Map<string, { accessToken: string; refreshToken: string }> = new Map();

  constructor(config: { clientId: string; redirectUri: string; baseUrl: string }) {
    this.baseUrl = config.baseUrl;
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
  }

  /**
   * Generate mock authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'offline_access',
      state,
    });

    return `${this.baseUrl}/v2/oauth2/login?${params.toString()}`;
  }

  /**
   * Mock token exchange
   * Returns mock access and refresh tokens
   */
  async exchangeCodeForTokens(code: string): Promise<DexcomTokenResponse> {
    // Simulate API delay
    await this.sleep(100);

    // Generate mock tokens
    const accessToken = `mock_access_token_${code}_${Date.now()}`;
    const refreshToken = `mock_refresh_token_${code}_${Date.now()}`;

    // Store for refresh
    this.mockTokens.set(refreshToken, { accessToken, refreshToken });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 7200, // 2 hours
      token_type: 'Bearer',
    };
  }

  /**
   * Mock token refresh
   * Returns new mock tokens
   */
  async refreshAccessToken(refreshToken: string): Promise<DexcomTokenResponse> {
    // Simulate API delay
    await this.sleep(100);

    // Validate refresh token exists
    const existing = this.mockTokens.get(refreshToken);
    if (!existing) {
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    const newAccessToken = `mock_access_token_refreshed_${Date.now()}`;
    const newRefreshToken = `mock_refresh_token_refreshed_${Date.now()}`;

    // Update store
    this.mockTokens.delete(refreshToken);
    this.mockTokens.set(newRefreshToken, { accessToken: newAccessToken, refreshToken: newRefreshToken });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: 7200, // 2 hours
      token_type: 'Bearer',
    };
  }

  /**
   * Mock EGV retrieval
   * Generates realistic glucose readings for the date range
   */
  async getEGVs(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<DexcomEGVsResponse> {
    // Simulate API delay
    await this.sleep(200);

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate mock readings (every 5 minutes)
    const readings: DexcomEGV[] = [];
    const intervalMs = 5 * 60 * 1000; // 5 minutes

    for (let time = start.getTime(); time <= end.getTime(); time += intervalMs) {
      const timestamp = new Date(time);

      // Generate realistic glucose value (70-180 mg/dL with some variation)
      const baseGlucose = 100;
      const variation = Math.sin(time / (1000 * 60 * 60 * 2)) * 30; // 2-hour cycle
      const noise = (Math.random() - 0.5) * 20;
      const value = Math.round(baseGlucose + variation + noise);

      // Clamp to realistic range
      const clampedValue = Math.max(40, Math.min(400, value));

      readings.push({
        recordId: `mock_${time}`,
        systemTime: timestamp.toISOString(),
        displayTime: timestamp.toISOString(),
        value: clampedValue,
        trend: this.calculateTrend(readings, clampedValue),
        trendRate: 0.5, // mg/dL/min
        unit: 'mg/dL',
        rateUnit: 'mg/dL/min',
        status: 'high',
        displayDevice: 'MockDexcomG7',
        transmitterId: 'MOCK123',
      });
    }

    return {
      recordType: 'egv',
      recordVersion: '3.0',
      userId: 'mock-user-id',
      records: readings,
    };
  }

  // Helper methods

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private calculateTrend(previousReadings: DexcomEGV[], currentValue: number): string {
    if (previousReadings.length === 0) return 'flat';

    const lastReading = previousReadings[previousReadings.length - 1];
    const diff = currentValue - lastReading.value;

    if (diff > 3) return 'up';
    if (diff < -3) return 'down';
    return 'flat';
  }
}

/**
 * Create mock Dexcom client
 * Uses same interface as production client
 */
export function createMockDexcomClient(): MockDexcomClient {
  return new MockDexcomClient({
    clientId: process.env.DEXCOM_CLIENT_ID || 'mock-client-id',
    redirectUri: process.env.DEXCOM_REDIRECT_URI || 'http://localhost:3000/api/metabolic/cgm/dexcom/callback',
    baseUrl: process.env.DEXCOM_API_BASE_URL || 'https://mock-api.dexcom.com',
  });
}

/**
 * Factory function that switches between real and mock client
 * Enable mock with: USE_MOCK_DEXCOM=true
 */
export function createDexcomClientForTesting(): DexcomClient | MockDexcomClient {
  if (process.env.USE_MOCK_DEXCOM === 'true') {
    console.log('[Dexcom] Using mock client for testing');
    return createMockDexcomClient();
  }

  // Import and return real client
  const { createDexcomClient } = require('../../apps/web/src/lib/services/dexcom-client');
  return createDexcomClient();
}
