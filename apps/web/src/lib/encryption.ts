/**
 * Encryption Utilities
 *
 * Provides AES-256-GCM encryption for sensitive data (API tokens, refresh tokens).
 * Uses environment variable ENCRYPTION_KEY for symmetric encryption.
 *
 * Security Notes:
 * - Encryption key must be 32 bytes (256 bits)
 * - Each encryption generates a unique IV (Initialization Vector)
 * - Uses authenticated encryption (GCM mode) for integrity
 * - Encrypted format: iv:authTag:encryptedData (all hex-encoded)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment
 * In production, this must be set in environment variables
 * In development, we'll generate a temporary key (NOT SECURE FOR PRODUCTION)
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;

  if (envKey) {
    // Ensure key is 32 bytes (256 bits)
    if (Buffer.from(envKey, 'hex').length !== 32) {
      throw new Error(
        'ENCRYPTION_KEY must be 32 bytes (64 hex characters). Generate with: openssl rand -hex 32'
      );
    }
    return Buffer.from(envKey, 'hex');
  }

  // Development fallback (NOT SECURE FOR PRODUCTION)
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[Encryption] WARNING: Using insecure development key. Set ENCRYPTION_KEY in production!'
    );
    // Generate a consistent key for development (based on a known seed)
    return crypto.scryptSync('dev-encryption-key-not-secure', 'salt', 32);
  }

  throw new Error(
    'ENCRYPTION_KEY environment variable is required. Generate with: openssl rand -hex 32'
  );
}

/**
 * Encrypt a string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (hex-encoded)
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string that was encrypted with encrypt()
 * @param encryptedData - Encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();

    // Parse encrypted data format: iv:authTag:encryptedData
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Encryption] Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash a value using SHA-256 (for non-reversible hashing)
 * Use this for checksums, not for sensitive data encryption
 * @param value - Value to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a cryptographically secure random string
 * @param length - Number of bytes (output will be 2x length in hex)
 * @returns Hex-encoded random string
 */
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
