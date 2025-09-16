import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const uploadMock = vi.fn(async () => ({ data: { path: 'ok' }, error: null }));
const fromMock = vi.fn(() => ({ upload: uploadMock }));
const createClientMock = vi.fn(() => ({
  storage: {
    from: fromMock,
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}

describe('uploads route service role client', () => {
  beforeEach(() => {
    createClientMock.mockClear();
    fromMock.mockClear();
    uploadMock.mockClear();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('completes upload successfully even if OCR worker is missing', async () => {
    vi.resetModules();
    const createDocumentMock = vi.fn(async () => ({ id: 'doc-stub' }));
    vi.doMock('../../apps/web/src/lib/documents', () => ({
      createDocument: createDocumentMock,
    }));

    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { POST } = await import('../../apps/web/src/app/api/uploads/route');

    const fd = new FormData();
    const file = new File([new Blob([new Uint8Array([1, 2, 3, 4])])], 'tiny.pdf', {
      type: 'application/pdf',
    });
    fd.append('file', file as any);
    fd.append('personId', 'person-1');
    const req = new Request('http://localhost/api/uploads', { method: 'POST', body: fd as any }) as any;
    req.formData = async () => fd;

    const res = await POST(req);
    expect((res as Response).ok).toBe(true);
    const json = await (res as Response).json();
    expect(json).toEqual({ documentId: 'doc-stub' });
    expect(createDocumentMock).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[uploads] OCR worker not available; skipping');

    warnSpy.mockRestore();
    vi.unmock('../../apps/web/src/lib/documents');
    vi.resetModules();
  });

  it('initializes Supabase client with service role key', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

    const { getServiceRoleClient } = await import('../../apps/web/src/app/api/uploads/route');
    getServiceRoleClient();

    expect(createClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'service-role');
  });

  it('throws if service role key missing', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';

    const { getServiceRoleClient } = await import('../../apps/web/src/app/api/uploads/route');
    expect(() => getServiceRoleClient()).toThrowError(
      'SUPABASE_SERVICE_ROLE_KEY missing: uploads require service role in dev/test',
    );
  });
});

describe.runIf(hasDb)('Upload API (service role client)', () => {
  const prisma = new PrismaClient();

  beforeAll(() => {
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';
  });

  it('returns documentId when uploading a small file', async () => {
    const person = await prisma.person.create({ data: { ownerId: 'test-user' } });
    const { POST } = await import('../../apps/web/src/app/api/uploads/route');

    const fd = new FormData();
    const file = new File([new Blob([new Uint8Array([1, 2, 3, 4])])], 'tiny.pdf', {
      type: 'application/pdf',
    });
    fd.append('file', file as any);
    fd.append('personId', person.id);
    const req = new Request('http://localhost/api/uploads', { method: 'POST', body: fd as any }) as any;
    req.formData = async () => fd;

    const res = await POST(req);
    expect((res as Response).ok).toBe(true);
    const json = await (res as Response).json();
    expect(typeof json.documentId).toBe('string');
  });
});
