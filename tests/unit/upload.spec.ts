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

const runOcrMock = vi.fn(async () => ({ text: 'Sample OCR text chunk' }));
vi.mock('@/lib/ocr', () => ({
  runOcr: runOcrMock,
}));

const embedBatchMock = vi.fn(async () => [[0.1, 0.2, 0.3]]);
vi.mock('@/lib/embedding', () => ({
  embedBatch: embedBatchMock,
}));

const createManyMock = vi.fn();
const executeRawMock = vi.fn();
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    docChunk: { createMany: createManyMock },
    $executeRawUnsafe: executeRawMock,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
});

describe('upload API OCR + embeddings integration', () => {
  it('stores OCR text and embeddings', async () => {
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
    expect(runOcrMock).toHaveBeenCalled();
    expect(createManyMock).toHaveBeenCalled();
    expect(executeRawMock).toHaveBeenCalled();
    expect(embedBatchMock).toHaveBeenCalled();
  });
});
