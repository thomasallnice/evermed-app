import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { NextRequest } from 'next/server';
import { hashPasscode, verifyPasscode } from '../../apps/web/src/lib/passcode';

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}
process.env.SHARE_LINK_PEPPER = process.env.SHARE_LINK_PEPPER || Buffer.from('test-pepper').toString('base64');
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Share Pack passcode helpers', () => {
  it("hashes and verifies passcode '1234' with safe scrypt params", () => {
    const pepper = Buffer.from('demo-pepper').toString('base64');
    const hash = hashPasscode('1234', pepper);
    expect(hash).toMatch(/^[a-f0-9]+$/);
    expect(verifyPasscode(hash, '1234', pepper)).toBe(true);
  });
});

describe.runIf(hasDb)('Share Pack API', () => {
  const prisma = new PrismaClient();

  it('persists SharePackItem rows and returns linked documents', async () => {
    const person = await prisma.person.create({ data: { ownerId: 'userA' } });
    const doc = await prisma.document.create({ data: { personId: person.id, kind: 'pdf', filename: 't.pdf', storagePath: 'documents/t.pdf', sha256: 'x' } });

    const { POST } = await import('../../apps/web/src/app/api/share-packs/route');
    const createRes = await POST(
      new Request('http://localhost/api/share-packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: person.id, title: 'Visit', audience: 'clinician', items: [doc.id], passcode: '1234', expiryDays: 7 }),
      }) as unknown as NextRequest,
    );
    const created = await (createRes as Response).json();
    expect(created.documents).toHaveLength(1);
    expect(Array.isArray(created.observations)).toBe(true);
    const packId = created.shareId as string;

    const { POST: VERIFY } = await import('../../apps/web/src/app/api/share-packs/[id]/verify/route');
    const verifyRes = await VERIFY(
      new Request(`http://localhost/api/share-packs/${packId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: '1234' }),
      }) as unknown as NextRequest,
      { params: { id: packId } },
    );
    expect((verifyRes as Response).ok).toBe(true);

    const { GET } = await import('../../apps/web/src/app/api/share-packs/[id]/route');
    const viewReq = {
      headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
      cookies: {
        get(name: string) {
          if (name === `sp_${packId}`) return { value: 'ok' } as any;
          return undefined;
        },
      },
    } as unknown as NextRequest;
    const viewRes = await GET(viewReq, { params: { id: packId } });
    const viewJson = await (viewRes as Response).json();
    expect(viewJson.documents).toHaveLength(1);
  });
});
