// apps/web/src/lib/services/dexcom.ts
import { PrismaClient } from '@prisma/client';
import { createDexcomClient, DexcomClient, DexcomAPIError } from './dexcom-client';
import { encrypt, decrypt } from '@/lib/encryption';
import crypto from 'crypto';

/**
 * Dexcom Service
 *
 * High-level service for managing Dexcom CGM integrations, including:
 * - OAuth 2.0 authorization flow
 * - Token management (encryption, refresh)
 * - Glucose data synchronization
 * - Connection status management
 *
 * Medical Safety: All glucose data is informational only.
 * This system does NOT provide medical advice, diagnosis, or dosing recommendations.
 */

const prisma = new PrismaClient();

// ============================================
// Service Interface
// ============================================

export interface DexcomAuthUrl {
  authUrl: string;
  state: string; // For CSRF protection, store in session
}

export interface DexcomConnectionStatus {
  connected: boolean;
  lastSyncAt: string | null;
  deviceId: string | null;
  error: string | null;
  provider: 'dexcom';
}

export interface DexcomSyncResult {
  readingsImported: number;
  lastSyncAt: string;
  syncCursor: string | null;
}

// ============================================
// Dexcom Service Class
// ============================================

export class DexcomService {
  private client: DexcomClient;

  constructor(client?: DexcomClient) {
    this.client = client || createDexcomClient();
  }

  /**
   * Generate authorization URL for user to connect Dexcom account
   * @param userId - User ID for tracking state
   * @returns Authorization URL and state parameter
   */
  async generateAuthUrl(userId: string): Promise<DexcomAuthUrl> {
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // In production, store state in session or database with userId
    // For now, we'll encode userId in state (in production use signed JWT)
    const stateWithUserId = Buffer.from(JSON.stringify({ state, userId })).toString('base64');

    const authUrl = this.client.getAuthorizationUrl(stateWithUserId);

    return {
      authUrl,
      state: stateWithUserId,
    };
  }

  /**
   * Handle OAuth callback and store connection
   * @param code - Authorization code from Dexcom
   * @param state - State parameter for CSRF validation
   * @returns Person ID for the connected user
   */
  async handleCallback(code: string, state: string): Promise<string> {
    try {
      // Parse state to get userId
      const { userId } = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));

      // Exchange code for tokens
      const tokenResponse = await this.client.exchangeCodeForTokens(code);

      // Encrypt tokens before storage
      const encryptedAccessToken = encrypt(tokenResponse.access_token);
      const encryptedRefreshToken = encrypt(tokenResponse.refresh_token);

      // Calculate token expiration
      const tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      // Find or create CGM connection
      const person = await prisma.person.findFirst({
        where: { ownerId: userId },
      });

      if (!person) {
        throw new Error('Person record not found for user');
      }

      // Upsert CGM connection
      await prisma.cGMConnection.upsert({
        where: {
          personId_provider: {
            personId: person.id,
            provider: 'dexcom',
          },
        },
        create: {
          personId: person.id,
          provider: 'dexcom',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
          status: 'connected',
          errorMessage: null,
        },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
          status: 'connected',
          errorMessage: null,
        },
      });

      // Update Person.cgmConnected flag
      await prisma.person.update({
        where: { id: person.id },
        data: { cgmConnected: true },
      });

      console.log(`[Dexcom] Connected Dexcom for user ${userId}`);

      return person.id;
    } catch (error) {
      console.error('[Dexcom] OAuth callback failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Refresh access token if expired or about to expire
   * @param personId - Person ID
   * @returns Updated access token (decrypted)
   */
  private async ensureValidToken(personId: string): Promise<string> {
    const connection = await prisma.cGMConnection.findFirst({
      where: {
        personId,
        provider: 'dexcom',
      },
    });

    if (!connection) {
      throw new Error('Dexcom connection not found');
    }

    // Check if token is expired or will expire in next 5 minutes
    const now = new Date();
    const expiresIn = connection.tokenExpiresAt.getTime() - now.getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresIn > fiveMinutes) {
      // Token is still valid
      return decrypt(connection.accessToken);
    }

    // Token expired or expiring soon, refresh it
    console.log(`[Dexcom] Refreshing token for person ${personId}`);

    try {
      const decryptedRefreshToken = decrypt(connection.refreshToken);
      const tokenResponse = await this.client.refreshAccessToken(decryptedRefreshToken);

      // Encrypt new tokens
      const encryptedAccessToken = encrypt(tokenResponse.access_token);
      const encryptedRefreshToken = encrypt(tokenResponse.refresh_token);
      const tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      // Update connection with new tokens
      await prisma.cGMConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
          status: 'connected',
          errorMessage: null,
        },
      });

      return tokenResponse.access_token;
    } catch (error) {
      // Token refresh failed, mark connection as error
      await prisma.cGMConnection.update({
        where: { id: connection.id },
        data: {
          status: 'error',
          errorMessage:
            error instanceof Error ? error.message : 'Failed to refresh access token',
        },
      });

      throw new DexcomAPIError(
        'Failed to refresh Dexcom access token. Please reconnect your Dexcom account.',
        401,
        false
      );
    }
  }

  /**
   * Sync glucose readings from Dexcom API
   * @param personId - Person ID
   * @param startDate - Optional start date (ISO 8601). Defaults to lastSyncAt or 7 days ago.
   * @param endDate - Optional end date (ISO 8601). Defaults to now.
   * @returns Sync result with count of imported readings
   */
  async syncGlucoseReadings(
    personId: string,
    startDate?: string,
    endDate?: string
  ): Promise<DexcomSyncResult> {
    try {
      // Get connection
      const connection = await prisma.cGMConnection.findFirst({
        where: {
          personId,
          provider: 'dexcom',
        },
      });

      if (!connection) {
        throw new Error('Dexcom connection not found');
      }

      if (connection.status !== 'connected') {
        throw new Error('Dexcom connection is not active');
      }

      // Ensure token is valid
      const accessToken = await this.ensureValidToken(personId);

      // Calculate date range
      const end = endDate || new Date().toISOString();
      let start = startDate;

      if (!start) {
        if (connection.lastSyncAt) {
          start = connection.lastSyncAt.toISOString();
        } else {
          // Default to 7 days ago
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          start = sevenDaysAgo.toISOString();
        }
      }

      console.log(`[Dexcom] Syncing glucose readings for person ${personId}`, {
        start,
        end,
      });

      // Fetch EGVs from Dexcom
      const egvResponse = await this.client.getEGVs(accessToken, start, end);

      if (!egvResponse.records || egvResponse.records.length === 0) {
        console.log(`[Dexcom] No new readings to import`);

        // Update lastSyncAt even if no new readings
        await prisma.cGMConnection.update({
          where: { id: connection.id },
          data: {
            lastSyncAt: new Date(),
          },
        });

        return {
          readingsImported: 0,
          lastSyncAt: new Date().toISOString(),
          syncCursor: null,
        };
      }

      // Import readings to database
      const readingsToImport = egvResponse.records.map((egv) => ({
        personId,
        timestamp: new Date(egv.systemTime),
        value: egv.value,
        source: 'cgm' as const,
        deviceId: egv.transmitterId || egv.displayDevice || 'dexcom',
        cgmConnectionId: connection.id,
        confidence: egv.status === 'high' || egv.status === 'ok' ? 0.95 : 0.8,
      }));

      // Batch insert with upsert to avoid duplicates
      await prisma.$transaction(
        readingsToImport.map((reading) =>
          prisma.glucoseReading.upsert({
            where: {
              // Use composite unique constraint if available
              // For now, we'll create if not exists based on timestamp + personId
              id: `${reading.personId}-${reading.timestamp.toISOString()}`,
            },
            create: {
              ...reading,
              id: `${reading.personId}-${reading.timestamp.toISOString()}`,
            },
            update: reading,
          })
        )
      );

      // Update lastSyncAt and syncCursor
      const lastSyncAt = new Date();
      await prisma.cGMConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncAt,
          syncCursor: end, // Use end timestamp as cursor
        },
      });

      console.log(`[Dexcom] Imported ${readingsToImport.length} glucose readings`);

      return {
        readingsImported: readingsToImport.length,
        lastSyncAt: lastSyncAt.toISOString(),
        syncCursor: end,
      };
    } catch (error) {
      console.error('[Dexcom] Sync failed', {
        personId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Update connection status to error
      const connection = await prisma.cGMConnection.findFirst({
        where: { personId, provider: 'dexcom' },
      });

      if (connection) {
        await prisma.cGMConnection.update({
          where: { id: connection.id },
          data: {
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Sync failed',
          },
        });
      }

      throw error;
    }
  }

  /**
   * Get connection status for a user
   * @param personId - Person ID
   * @returns Connection status
   */
  async getConnectionStatus(personId: string): Promise<DexcomConnectionStatus> {
    const connection = await prisma.cGMConnection.findFirst({
      where: {
        personId,
        provider: 'dexcom',
      },
    });

    if (!connection) {
      return {
        connected: false,
        lastSyncAt: null,
        deviceId: null,
        error: null,
        provider: 'dexcom',
      };
    }

    return {
      connected: connection.status === 'connected',
      lastSyncAt: connection.lastSyncAt ? connection.lastSyncAt.toISOString() : null,
      deviceId: connection.deviceId,
      error: connection.errorMessage,
      provider: 'dexcom',
    };
  }

  /**
   * Disconnect Dexcom connection
   * @param personId - Person ID
   */
  async disconnect(personId: string): Promise<void> {
    const connection = await prisma.cGMConnection.findFirst({
      where: {
        personId,
        provider: 'dexcom',
      },
    });

    if (connection) {
      await prisma.cGMConnection.delete({
        where: { id: connection.id },
      });

      // Update Person.cgmConnected flag if no other CGM connections
      const otherConnections = await prisma.cGMConnection.count({
        where: { personId },
      });

      if (otherConnections === 0) {
        await prisma.person.update({
          where: { id: personId },
          data: { cgmConnected: false },
        });
      }

      console.log(`[Dexcom] Disconnected Dexcom for person ${personId}`);
    }
  }
}

// ============================================
// Service Factory
// ============================================

export function createDexcomService(): DexcomService {
  return new DexcomService();
}
