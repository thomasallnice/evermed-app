import { describe, it, expect, vi } from 'vitest';
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

