import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  vi.clearAllMocks();
});

describe('Share Pack passcode helpers', () => {
  it("hashes and verifies passcode '1234' with safe scrypt params", () => {
    const pepper = Buffer.from('demo-pepper').toString('base64');
    const hash = hashPasscode('1234', pepper);
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^[a-f0-9]+$/);
    expect(verifyPasscode(hash, '1234', pepper)).toBe(true);
    expect(verifyPasscode(hash, '9999', pepper)).toBe(false);
  });
});

describe.runIf(hasDb)('Share Pack API', () => {
  const prisma = new PrismaClient();

  it('creates pack with mixed items, verifies, and exposes docs/observations', async () => {
    const person = await prisma.person.create({ data: { ownerId: 'userA' } });
    const doc = await prisma.document.create({ data: { personId: person.id, kind: 'pdf', filename: 't.pdf', storagePath: 'documents/t.pdf', sha256: 'x' } });
    const obs = await prisma.observation.create({
      data: {
        personId: person.id,
        code: '4548-4',
        display: 'TSH',
        valueNum: 2.1,
        unit: 'mIU/L',
        refLow: 0.4,
        refHigh: 4,
        effectiveAt: new Date('2025-01-05T00:00:00Z'),
        sourceDocId: doc.id,
        sourceAnchor: 'p1',
      },
    });

    const { POST } = await import('../../apps/web/src/app/api/share-packs/route');
    const createRes = await POST(
      new Request('http://localhost/api/share-packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: person.id,
          title: 'Visit',
          audience: 'clinician',
          items: [doc.id, { observationId: obs.id }],
          passcode: '1234',
          expiryDays: 7,
        }),
      }) as unknown as NextRequest,
    );
    const created = await (createRes as Response).json();
    expect(created.documents).toHaveLength(1);
    expect(created.observations).toHaveLength(1);

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
    expect(viewRes.status).toBe(200);
    const viewJson = await (viewRes as Response).json();
    expect(viewJson.documents).toHaveLength(1);
    expect(viewJson.observations).toHaveLength(1);
    expect(viewJson.observations[0].trend).toBeDefined();

    const { POST: REVOKE } = await import('../../apps/web/src/app/api/share-packs/[id]/revoke/route');
    const revokeRes = await REVOKE(
      new Request(`http://localhost/api/share-packs/${packId}/revoke`, {
        method: 'POST',
        headers: { 'x-user-id': 'userA' },
      }) as unknown as NextRequest,
      { params: { id: packId } },
    );
    expect((revokeRes as Response).ok).toBe(true);
  });
});
