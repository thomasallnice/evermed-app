import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const uploadMock = vi.fn(async () => ({ data: {}, error: null }));
const fromMock = vi.fn(() => ({ upload: uploadMock }));
const createClientMock = vi.fn(() => ({
  storage: {
    from: fromMock,
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

const createDocumentMock = vi.fn(async () => ({ id: 'doc-123' }));
vi.mock('@/lib/documents', () => ({
  createDocument: createDocumentMock,
}));

describe('Upload API (OCR stub)', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';
  });

  beforeEach(() => {
    createClientMock.mockClear();
    fromMock.mockClear();
    uploadMock.mockClear();
    createDocumentMock.mockClear();
    vi.resetModules();
  });

  it('uploads a file, calls createDocument, and logs OCR stub warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { POST } = await import('../../apps/web/src/app/api/uploads/route');

    const fileData = new Uint8Array([1, 2, 3, 4]);
    const file = {
      name: 'test.pdf',
      type: 'application/pdf',
      async arrayBuffer() {
        return fileData.buffer;
      },
    } as any;

    const form = {
      get(key: string) {
        if (key === 'file') return file;
        if (key === 'personId') return 'person-123';
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
    // Regression: ensure correct alias '@/lib/documents' is used, not '@/src/lib/documents'.
    expect(createDocumentMock).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[uploads] OCR worker not available; skipping');
    warnSpy.mockRestore();
  });
});
