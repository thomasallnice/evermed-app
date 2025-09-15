import { describe, it, expect, vi, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Mock Supabase client for storage upload
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(async () => ({ data: { path: 'ok' }, error: null })),
        })),
      },
    })),
  };
});

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}

describe.runIf(hasDb)('Upload API (service role client)', () => {
  const prisma = new PrismaClient();

  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';
  });

  it('returns documentId when uploading a small file', async () => {
    const person = await prisma.person.create({ data: { ownerId: 'test-user' } });
    const { POST } = await import('../../apps/web/src/app/api/uploads/route');
    // Build FormData with file & personId
    const fd = new FormData();
    const file = new File([new Blob([new Uint8Array([1,2,3,4])])], 'tiny.pdf', { type: 'application/pdf' });
    fd.append('file', file as any);
    fd.append('personId', person.id);
    const req = new Request('http://localhost/api/uploads', { method: 'POST', body: fd as any }) as any;
    (req as any).formData = async () => fd; // ensure formData() exists
    const res = await POST(req);
    expect((res as Response).ok).toBe(true);
    const json = await (res as Response).json();
    expect(typeof json.documentId).toBe('string');
  });
});

