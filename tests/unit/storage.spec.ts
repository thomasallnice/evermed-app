import { describe, it, expect, vi } from 'vitest';

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

describe('storage signed URL', () => {
  it('creates a signed URL server-side', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    const { getSignedUrlForDocument } = await import('../../apps/web/src/lib/storage');
    const url = await getSignedUrlForDocument('documents/foo.pdf', 600);
    expect(url).toContain('https://signed.example/url');
  });
});

