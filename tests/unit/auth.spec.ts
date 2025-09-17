import { describe, it, expect, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-123' } }, error: null }),
    },
  }),
}));

import { requireUserId } from '@/lib/auth';

describe('requireUserId', () => {
  it('uses dev bypass header when present', async () => {
    const req = new Request('http://localhost/test', {
      headers: { 'x-user-id': 'dev-user' },
    }) as unknown as NextRequest;
    const userId = await requireUserId(req);
    expect(userId).toBe('dev-user');
  });

  it('fetches Supabase user when header absent', async () => {
    const req = new Request('http://localhost/test') as unknown as NextRequest;
    const userId = await requireUserId(req);
    expect(userId).toBe('user-123');
  });
});
