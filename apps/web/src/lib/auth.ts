import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

const DEV_BYPASS_HEADER = 'x-user-id';

export async function requireUserId(req: NextRequest): Promise<string> {
  const headerUser = req.headers.get(DEV_BYPASS_HEADER);
  if (headerUser && process.env.NODE_ENV !== 'production') {
    return headerUser;
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

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
