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

/**
 * Check if the authenticated user is an admin
 * Uses admin_users table to verify admin status
 *
 * @param req - The incoming request
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export async function isAdmin(req: NextRequest): Promise<boolean> {
  try {
    const userId = await requireUserId(req);

    // Use Prisma to check admin_users table
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const adminUser = await prisma.adminUser.findUnique({
        where: { userId: userId },
      });

      return adminUser !== null;
    } finally {
      await prisma.$disconnect();
    }
  } catch {
    // If user is not authenticated or any error occurs, they're not admin
    return false;
  }
}
