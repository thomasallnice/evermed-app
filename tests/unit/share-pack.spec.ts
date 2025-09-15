import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}
process.env.SHARE_LINK_PEPPER = process.env.SHARE_LINK_PEPPER || 'test-pepper';

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

  it('viewer returns linked documents and observations', async () => {
    // Seed person, doc, and observation
    const p = await prisma.person.create({ data: { ownerId: 'userX' } });
    const d = await prisma.document.create({ data: { personId: p.id, kind: 'pdf', filename: 'lab.pdf', storagePath: 'documents/lab.pdf', sha256: 'y' } });
    const o = await prisma.observation.create({ data: { personId: p.id, code: '718-7', display: 'Hemoglobin', valueNum: 12.9, unit: 'g/dL', sourceDocId: d.id } });
    const { POST } = await import('../../apps/web/src/app/api/share-packs/route');
    // Use both shorthand (string) and object form for items
    const res = await POST(new Request('http://localhost/api/share-packs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId: p.id, title: 'Pack', audience: 'clinician', items: [ d.id, { observationId: o.id } ], passcode: '2222', expiryDays: 7 }) }) as any);
    const j = await (res as Response).json();
    const id = j.shareId as string;

    // Mock a request with verified cookie
    const { GET } = await import('../../apps/web/src/app/api/share-packs/[id]/route');
    const req: any = { headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }), cookies: { get: () => ({ value: 'ok' }) } };
    const gres = await GET(req, { params: { id } });
    const body = await (gres as Response).json();
    expect(Array.isArray(body.documents)).toBe(true);
    expect(Array.isArray(body.observations)).toBe(true);
    expect(body.documents.length).toBe(1);
    expect(body.observations.length).toBe(1);
  });
});

describe('passcode hashing', () => {
  it('hash + verify succeeds for same passcode and fails for wrong one', async () => {
    const { hashPasscode, verifyPasscode } = await import('../../apps/web/src/lib/passcode');
    const pepper = Buffer.from('test-pepper').toString('base64');
    const h = hashPasscode('1234', pepper);
    expect(h).toMatch(/^[a-f0-9]+$/);
    expect(verifyPasscode('1234', h, pepper)).toBe(true);
    expect(verifyPasscode('9999', h, pepper)).toBe(false);
  });
});
