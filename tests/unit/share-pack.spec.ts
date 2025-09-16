import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { NextRequest } from 'next/server';
import { hashPasscode, verifyPasscode } from '@/lib/passcode';

const createSignedUrlMock = vi.fn(async () => ({ data: { signedUrl: 'https://signed.example/url' }, error: null }));
const storageFromMock = vi.fn(() => ({ createSignedUrl: createSignedUrlMock }));
const createClientMock = vi.fn(() => ({
  storage: {
    from: storageFromMock,
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}
process.env.SHARE_LINK_PEPPER = process.env.SHARE_LINK_PEPPER || Buffer.from('test-pepper').toString('base64');
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';

beforeEach(() => {
  createClientMock.mockClear();
  storageFromMock.mockClear();
  createSignedUrlMock.mockClear();
});

describe('Share Pack passcode helpers', () => {
  it("hashes and verifies passcode '1234' with service params", () => {
    const pepper = process.env.SHARE_LINK_PEPPER as string;
    const hash = hashPasscode('1234', pepper);
    expect(hash).toMatch(/^[a-f0-9]+$/);
    expect(verifyPasscode(hash, '1234', pepper)).toBe(true);
    expect(verifyPasscode(hash, '9999', pepper)).toBe(false);
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
    expect(j.documents).toHaveLength(1);
    expect(j.observations).toHaveLength(0);

    const { POST: VERIFY } = await import('../../apps/web/src/app/api/share-packs/[id]/verify/route');
    const vres = await VERIFY(new Request(`http://localhost/api/share-packs/${packId}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode: '1234' }) }) as any, { params: { id: packId } });
    expect((vres as Response).ok).toBe(true);

    const { GET } = await import('../../apps/web/src/app/api/share-packs/[id]/route');
    const req = {
      headers: new Headers(),
      cookies: {
        get(name: string) {
          if (name === `sp_${packId}`) return { value: 'ok' } as any;
          return undefined;
        },
      },
    } as unknown as NextRequest;

    const viewRes = await GET(req, { params: { id: packId } });
    expect(viewRes.status).toBe(200);
    const viewJson = await (viewRes as Response).json();
    expect(Array.isArray(viewJson.documents)).toBe(true);
    expect(viewJson.documents).toHaveLength(1);

    const { POST: REVOKE } = await import('../../apps/web/src/app/api/share-packs/[id]/revoke/route');
    const rres = await REVOKE(new Request(`http://localhost/api/share-packs/${packId}/revoke`, { method: 'POST', headers: { 'x-user-id': 'userA' } }) as any, { params: { id: packId } });
    expect((rres as Response).ok).toBe(true);
  });
});
