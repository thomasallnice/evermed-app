import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPasscode, verifyPasscode } from '../../apps/web/src/lib/passcode';

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}
process.env.SHARE_LINK_PEPPER = process.env.SHARE_LINK_PEPPER || 'test-pepper';

describe('Share Pack passcode helpers', () => {
  it("hashes and verifies passcode '1234' with safe scrypt params", () => {
    const pepper = Buffer.from('demo-pepper').toString('base64');
    const hash = hashPasscode('1234', pepper);
    expect(hash.length).toBeGreaterThan(0);
    expect(verifyPasscode(hash, '1234', pepper)).toBe(true);
  });
});

describe.runIf(hasDb)('Share Pack API', () => {
  const prisma = new PrismaClient();

  it('creates pack with passcode, verifies, and revokes', async () => {
    const p = await prisma.person.create({ data: { ownerId: 'userA' } });
    const d = await prisma.document.create({ data: { personId: p.id, kind: 'pdf', filename: 't.pdf', storagePath: 'documents/t.pdf', sha256: 'x' } });

    const { POST } = await import('../../apps/web/src/app/api/share-packs/route');
    const res = await POST(new Request('http://localhost/api/share-packs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId: p.id, title: 'Visit', audience: 'clinician', items: [{ documentId: d.id }], passcode: '1234', expiryDays: 7 }) }) as any);
    const j = await (res as Response).json();
    expect(j.shareId).toBeTruthy();
    const packId = j.shareId as string;

    const { POST: VERIFY } = await import('../../apps/web/src/app/api/share-packs/[id]/verify/route');
    const vres = await VERIFY(new Request(`http://localhost/api/share-packs/${packId}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode: '1234' }) }) as any, { params: { id: packId } });
    expect((vres as Response).ok).toBe(true);

    const { POST: REVOKE } = await import('../../apps/web/src/app/api/share-packs/[id]/revoke/route');
    const rres = await REVOKE(new Request(`http://localhost/api/share-packs/${packId}/revoke`, { method: 'POST', headers: { 'x-user-id': 'userA' } }) as any, { params: { id: packId } });
    expect((rres as Response).ok).toBe(true);
  });
});
