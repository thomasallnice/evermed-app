import crypto from 'node:crypto';

const PEPPER = process.env.SHARE_LINK_PEPPER || '';

export async function hashPasscode(passcode: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const toHash = Buffer.from(PEPPER + passcode);
  const derived = await scryptAsync(toHash, salt, 32);
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifyPasscode(hash: string, passcode: string): Promise<boolean> {
  try {
    if (!hash.startsWith('scrypt$')) return false;
    const [, , saltB64, keyB64] = hash.match(/^(scrypt)\$(.+?)\$(.+)$/) || [];
    if (!saltB64 || !keyB64) return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(keyB64, 'base64');
    const toHash = Buffer.from(PEPPER + passcode);
    const derived = await scryptAsync(toHash, salt, expected.length);
    return crypto.timingSafeEqual(derived, expected);
  } catch { return false; }
}

function scryptAsync(password: Buffer, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, { N: 1 << 15, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

