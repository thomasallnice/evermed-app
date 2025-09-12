import crypto from 'node:crypto';

// Hash: scrypt with random salt, storing as: scrypt$base64(salt)$base64(key)
export function hashPasscode(passcode: string, pepper: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(Buffer.from(pepper + passcode), salt, 32, { N: 1 << 15, r: 8, p: 1 }) as Buffer;
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export function verifyPasscode(passcode: string, hash: string, pepper: string): boolean {
  try {
    if (!hash.startsWith('scrypt$')) return false;
    const parts = hash.split('$');
    if (parts.length !== 3) return false;
    const salt = Buffer.from(parts[1], 'base64');
    const expected = Buffer.from(parts[2], 'base64');
    const key = crypto.scryptSync(Buffer.from(pepper + passcode), salt, expected.length, { N: 1 << 15, r: 8, p: 1 }) as Buffer;
    return crypto.timingSafeEqual(key, expected);
  } catch { return false; }
}
