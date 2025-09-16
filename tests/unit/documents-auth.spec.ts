import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const createSignedUrlMock = vi.fn(async (_path: string, _ttl: number) => ({
  data: { signedUrl: 'https://signed.example/url' },
  error: null,
}));
const fromMock = vi.fn(() => ({ createSignedUrl: createSignedUrlMock }));
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

describe.runIf(hasDb)('GET /api/documents/:id', () => {
  const prisma = new PrismaClient();
  let supabaseUrl: string;
  let supabaseServiceRoleKey: string;

  beforeAll(() => {
    supabaseUrl = process.env.SUPABASE_URL || 'https://example.supabase.co';
    supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';
    process.env.SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey;
  });

  beforeEach(() => {
    createSignedUrlMock.mockClear();
    fromMock.mockClear();
    createClientMock.mockClear();
  });

  it('returns signedUrl for owner', async () => {
    const person = await prisma.person.create({ data: { ownerId: 'userA' } });
    const doc = await prisma.document.create({
      data: {
        personId: person.id,
        kind: 'pdf',
        filename: 'test.pdf',
        storagePath: 'documents/test.pdf',
        sha256: 'abc',
      },
    });
    const { GET } = await import('../../apps/web/src/app/api/documents/[id]/route');
    const req = { headers: new Headers({ 'x-user-id': 'userA' }) } as any;
    const res = await GET(req, { params: { id: doc.id } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ id: doc.id, filename: 'test.pdf', signedUrl: 'https://signed.example/url' });
    expect(createClientMock).toHaveBeenCalledWith(supabaseUrl, supabaseServiceRoleKey);
    expect(createSignedUrlMock).toHaveBeenCalledWith('documents/test.pdf', 600);
  });

  it('returns 403 for non-owner', async () => {
    const person = await prisma.person.create({ data: { ownerId: 'userC' } });
    const doc = await prisma.document.create({
      data: {
        personId: person.id,
        kind: 'pdf',
        filename: 'secret.pdf',
        storagePath: 'documents/secret.pdf',
        sha256: 'def',
      },
    });
    const { GET } = await import('../../apps/web/src/app/api/documents/[id]/route');
    const req = { headers: new Headers({ 'x-user-id': 'userD' }) } as any;
    const res = await GET(req, { params: { id: doc.id } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('forbidden');
  });

  it('returns 404 when document missing', async () => {
    const { GET } = await import('../../apps/web/src/app/api/documents/[id]/route');
    const req = { headers: new Headers({ 'x-user-id': 'someone' }) } as any;
    const res = await GET(req, { params: { id: 'does-not-exist' } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('not found');
  });
});
