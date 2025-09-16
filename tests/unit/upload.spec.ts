import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const uploadMock = vi.fn(async () => ({ data: {}, error: null }));
const storageFromMock = vi.fn(() => ({ upload: uploadMock }));
const createClientMock = vi.fn(() => ({
  storage: {
    from: storageFromMock,
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

const createDocumentMock = vi.fn(async () => ({ id: 'doc-123' }));
vi.mock('@/lib/documents', () => ({
  createDocument: createDocumentMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
});

describe('upload route', () => {
  it('returns documentId and logs OCR stub warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { POST } = await import('../../apps/web/src/app/api/uploads/route');

    const fileData = new Uint8Array([1, 2, 3, 4]);
    const fakeFile = {
      name: 'test.pdf',
      type: 'application/pdf',
      async arrayBuffer() {
        return fileData.buffer;
      },
    } as File;

    const form = {
      get(key: string) {
        if (key === 'file') return fakeFile;
        if (key === 'personId') return 'person-1';
        return null;
      },
    } as unknown as FormData;

    const req = {
      async formData() {
        return form;
      },
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await (res as Response).json();
    expect(json.documentId).toBe('doc-123');
    expect(createDocumentMock).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[uploads] OCR worker not available; skipping');
    warnSpy.mockRestore();
  });
});
