import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { requireUserId } from '@/lib/auth';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const { name, locale, role } = await req.json();

    const existing = await prisma.person.findFirst({ where: { ownerId: userId } });
    if (existing) {
      await prisma.person.update({
        where: { id: existing.id },
        data: {
          givenName: name ? String(name).trim() : existing.givenName,
          locale: locale ? String(locale) : existing.locale,
        },
      });
    } else {
      await prisma.person.create({
        data: {
          ownerId: userId,
          givenName: name ? String(name).trim() : null,
          locale: locale ? String(locale) : 'en-US',
        },
      });
    }

    // TODO: persist caregiver role metadata once schema is defined.

    const admin = adminClient();
    if (admin && name) {
      try {
        await (admin as any).auth.admin.updateUserById(userId, {
          user_metadata: { name: String(name).trim() },
        });
      } catch {}
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
