// tests/integration/dexcom.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MockDexcomClient, createMockDexcomClient } from '../mocks/dexcom-mock';
import { encrypt, decrypt, validateEncryption } from '../../apps/web/src/lib/encryption';

/**
 * Integration tests for Dexcom CGM API integration
 *
 * Tests cover:
 * - OAuth authorization flow
 * - Token exchange and refresh
 * - Glucose reading retrieval
 * - Token encryption/decryption
 * - Error handling and retry logic
 *
 * Prerequisites:
 * - CGM_ENCRYPTION_KEY must be set in environment
 * - USE_MOCK_DEXCOM=true for testing without real API
 */

describe('Dexcom Integration', () => {
  let client: MockDexcomClient;

  beforeAll(() => {
    // Set up test environment
    process.env.USE_MOCK_DEXCOM = 'true';
    process.env.CGM_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 hex chars
    process.env.DEXCOM_CLIENT_ID = 'test-client-id';
    process.env.DEXCOM_CLIENT_SECRET = 'test-client-secret';
    process.env.DEXCOM_REDIRECT_URI = 'http://localhost:3000/api/metabolic/cgm/dexcom/callback';
    process.env.DEXCOM_API_BASE_URL = 'https://mock-api.dexcom.com';

    // Validate encryption setup
    validateEncryption();

    client = createMockDexcomClient();
  });

  afterAll(() => {
    // Clean up environment
    delete process.env.USE_MOCK_DEXCOM;
  });

  describe('OAuth Authorization Flow', () => {
    it('should generate valid authorization URL', () => {
      const state = 'test-state-parameter';
      const authUrl = client.getAuthorizationUrl(state);

      expect(authUrl).toContain('https://mock-api.dexcom.com/v2/oauth2/login');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('redirect_uri=');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('scope=offline_access');
      expect(authUrl).toContain(`state=${state}`);
    });

    it('should exchange authorization code for tokens', async () => {
      const code = 'test-auth-code';
      const tokenResponse = await client.exchangeCodeForTokens(code);

      expect(tokenResponse).toHaveProperty('access_token');
      expect(tokenResponse).toHaveProperty('refresh_token');
      expect(tokenResponse).toHaveProperty('expires_in');
      expect(tokenResponse.token_type).toBe('Bearer');
      expect(tokenResponse.expires_in).toBe(7200); // 2 hours
    });

    it('should refresh access token', async () => {
      // First get tokens
      const code = 'test-auth-code-refresh';
      const initialTokens = await client.exchangeCodeForTokens(code);

      // Then refresh
      const refreshedTokens = await client.refreshAccessToken(initialTokens.refresh_token);

      expect(refreshedTokens).toHaveProperty('access_token');
      expect(refreshedTokens).toHaveProperty('refresh_token');
      expect(refreshedTokens.access_token).not.toBe(initialTokens.access_token);
      expect(refreshedTokens.refresh_token).not.toBe(initialTokens.refresh_token);
    });
  });

  describe('Glucose Reading Retrieval', () => {
    it('should fetch EGVs for date range', async () => {
      const code = 'test-auth-code-egv';
      const { access_token } = await client.exchangeCodeForTokens(code);

      const startDate = new Date('2025-01-01T00:00:00Z').toISOString();
      const endDate = new Date('2025-01-01T01:00:00Z').toISOString();

      const egvResponse = await client.getEGVs(access_token, startDate, endDate);

      expect(egvResponse).toHaveProperty('records');
      expect(Array.isArray(egvResponse.records)).toBe(true);
      expect(egvResponse.records.length).toBeGreaterThan(0);

      // Validate reading structure
      const firstReading = egvResponse.records[0];
      expect(firstReading).toHaveProperty('systemTime');
      expect(firstReading).toHaveProperty('displayTime');
      expect(firstReading).toHaveProperty('value');
      expect(firstReading).toHaveProperty('trend');
      expect(firstReading.unit).toBe('mg/dL');
    });

    it('should generate readings every 5 minutes', async () => {
      const code = 'test-auth-code-interval';
      const { access_token } = await client.exchangeCodeForTokens(code);

      const startDate = new Date('2025-01-01T00:00:00Z').toISOString();
      const endDate = new Date('2025-01-01T00:30:00Z').toISOString(); // 30 minutes

      const egvResponse = await client.getEGVs(access_token, startDate, endDate);

      // Should have 7 readings (0, 5, 10, 15, 20, 25, 30 minutes)
      expect(egvResponse.records.length).toBe(7);

      // Validate timestamps are 5 minutes apart
      for (let i = 1; i < egvResponse.records.length; i++) {
        const prev = new Date(egvResponse.records[i - 1].systemTime);
        const curr = new Date(egvResponse.records[i].systemTime);
        const diffMinutes = (curr.getTime() - prev.getTime()) / (1000 * 60);
        expect(diffMinutes).toBe(5);
      }
    });

    it('should generate realistic glucose values', async () => {
      const code = 'test-auth-code-values';
      const { access_token } = await client.exchangeCodeForTokens(code);

      const startDate = new Date('2025-01-01T00:00:00Z').toISOString();
      const endDate = new Date('2025-01-01T02:00:00Z').toISOString();

      const egvResponse = await client.getEGVs(access_token, startDate, endDate);

      // All values should be in realistic range (40-400 mg/dL)
      for (const reading of egvResponse.records) {
        expect(reading.value).toBeGreaterThanOrEqual(40);
        expect(reading.value).toBeLessThanOrEqual(400);
      }
    });
  });

  describe('Token Encryption', () => {
    it('should encrypt and decrypt tokens correctly', () => {
      const plaintext = 'test-access-token-123456789';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'test-access-token';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Different IVs should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same plaintext
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should fail decryption with tampered ciphertext', () => {
      const plaintext = 'test-access-token';
      const encrypted = encrypt(plaintext);

      // Tamper with ciphertext
      const parts = encrypted.split(':');
      parts[2] = parts[2].slice(0, -2) + 'ff'; // Change last byte
      const tampered = parts.join(':');

      // Should throw error
      expect(() => decrypt(tampered)).toThrow();
    });

    it('should handle encryption validation', () => {
      // Should not throw with valid key
      expect(() => validateEncryption()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid refresh token', async () => {
      const invalidRefreshToken = 'invalid-token-12345';

      await expect(client.refreshAccessToken(invalidRefreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should handle missing encryption key', () => {
      const originalKey = process.env.CGM_ENCRYPTION_KEY;
      delete process.env.CGM_ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('CGM_ENCRYPTION_KEY environment variable is not set');

      // Restore
      process.env.CGM_ENCRYPTION_KEY = originalKey;
    });

    it('should handle invalid encrypted format', () => {
      expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted format');
      expect(() => decrypt('part1:part2')).toThrow('Invalid encrypted format');
    });
  });

  describe('Performance', () => {
    it('should complete token exchange in reasonable time', async () => {
      const start = Date.now();
      const code = 'test-auth-code-perf';
      await client.exchangeCodeForTokens(code);
      const duration = Date.now() - start;

      // Mock should complete in <500ms
      expect(duration).toBeLessThan(500);
    });

    it('should fetch EGVs in reasonable time', async () => {
      const code = 'test-auth-code-egv-perf';
      const { access_token } = await client.exchangeCodeForTokens(code);

      const start = Date.now();
      const startDate = new Date('2025-01-01T00:00:00Z').toISOString();
      const endDate = new Date('2025-01-01T01:00:00Z').toISOString();
      await client.getEGVs(access_token, startDate, endDate);
      const duration = Date.now() - start;

      // Mock should complete in <1s
      expect(duration).toBeLessThan(1000);
    });
  });
});
