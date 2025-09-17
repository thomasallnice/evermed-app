import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { NextRequest } from 'next/server';

const DEV_BYPASS_HEADER = 'x-user-id';

export async function requireUserId(req: NextRequest): Promise<string> {
  const headerUser = req.headers.get(DEV_BYPASS_HEADER);
  if (headerUser && process.env.NODE_ENV !== 'production') {
    return headerUser;
  }
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) {
    throw new Error('unauthorized');
  }
  return user.id;
}

export async function getOptionalUserId(req: NextRequest): Promise<string | null> {
  try {
    return await requireUserId(req);
  } catch {
    return null;
  }
}
