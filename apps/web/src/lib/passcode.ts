import crypto from 'crypto';

// Pepper (base64) acts as salt. We derive a fixed-length key and store as hex.
export function hashPasscode(passcode: string, pepper: string): string {
  const salt = Buffer.from(pepper, 'base64');
  const keylen = 64;
  const hash = crypto.scryptSync(passcode, salt, keylen, { N: 16384, r: 8, p: 1 });
  return hash.toString('hex');
}

export function verifyPasscode(passcode: string, hash: string, pepper: string): boolean {
  const salt = Buffer.from(pepper, 'base64');
  const keylen = 64;
  const derived = crypto.scryptSync(passcode, salt, keylen, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derived as Buffer);
}
