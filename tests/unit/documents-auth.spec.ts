import { describe, it, expect, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn(async (_path: string, _ttl: number) => ({
            data: { signedUrl: 'https://signed.example/url' },
            error: null,
          })),
        })),
      },
    })),
  };
});

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';

describe.runIf(hasDb)('Document auth + signed URL', () => {
  const prisma = new PrismaClient();

  it('returns signedUrl for owner and denies others', async () => {
    const { getDocumentAuthorized } = await import('../../apps/web/src/lib/documents');
    const a = await prisma.person.create({ data: { ownerId: 'userA' } });
    const b = await prisma.person.create({ data: { ownerId: 'userB' } });
    const d = await prisma.document.create({ data: {
      personId: a.id, kind: 'pdf', filename: 'test.pdf', storagePath: 'documents/x.pdf', sha256: 'x',
    }});
    const ok = await getDocumentAuthorized(d.id, 'userA');
    expect(ok?.signedUrl).toContain('https://signed.example');
    const bad = await getDocumentAuthorized(d.id, 'userB');
    expect(bad).toBeNull();
  });
});

describe('documents route alias regression', () => {
  it('uses @/lib/documents alias', async () => {
    const getDocumentAuthorized = vi.fn(async () => ({ id: 'doc', filename: 'file.pdf', kind: 'pdf', uploadedAt: new Date(), signedUrl: 'https://signed.example/url' }));
    // Regression: ensure correct alias '@/lib/documents' is used, not '@/src/lib/documents'.
    vi.doMock('@/lib/documents', () => ({ getDocumentAuthorized }));

    const { GET } = await import('../../apps/web/src/app/api/documents/[id]/route');
    const req = { headers: new Headers({ 'x-user-id': 'user-1' }) } as unknown as NextRequest;
    await GET(req, { params: { id: 'doc' } });

    expect(getDocumentAuthorized).toHaveBeenCalledWith('doc', 'user-1');

    vi.resetModules();
    vi.doUnmock('@/lib/documents');
  });
});
