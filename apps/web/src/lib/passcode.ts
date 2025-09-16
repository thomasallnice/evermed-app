import { scryptSync, timingSafeEqual } from 'node:crypto';

const DEFAULT_PEPPER = process.env.SHARE_LINK_PEPPER || '';

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

const LEGACY_N = 1 << 15;
const LEGACY_R = 8;
const LEGACY_P = 1;

// TODO: migrate to Argon2id in production environments once available.

export function hashPasscode(passcode: string, pepper: string = DEFAULT_PEPPER): string {
  if (!pepper) throw new Error('SHARE_LINK_PEPPER missing');
  const salt = Buffer.from(pepper, 'base64');
  const derivedKey = scryptSync(passcode, salt, KEYLEN, { N, r: R, p: P });
  return derivedKey.toString('hex');
}

export function verifyPasscode(hash: string, passcode: string, pepper: string = DEFAULT_PEPPER): boolean {
  try {
    if (hash.startsWith('scrypt$')) {
      const [, saltB64, keyB64] = hash.split('$');
      if (!saltB64 || !keyB64) return false;
      const salt = Buffer.from(saltB64, 'base64');
      const expected = Buffer.from(keyB64, 'base64');
      const toHash = Buffer.from(`${pepper}${passcode}`);
      const derived = scryptSync(toHash, salt, expected.length, { N: LEGACY_N, r: LEGACY_R, p: LEGACY_P });
      return timingSafeEqual(derived, expected);
    }

    if (!pepper) return false;
    const salt = Buffer.from(pepper, 'base64');
    const expected = Buffer.from(hash, 'hex');
    if (!expected.length) return false;
    const derived = scryptSync(passcode, salt, expected.length, { N, r: R, p: P });
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
