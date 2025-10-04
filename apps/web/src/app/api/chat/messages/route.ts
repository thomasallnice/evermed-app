import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { requireUserId } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: { document: true },
    });

    const admin = getAdmin();
    const mapped = await Promise.all(
      messages.map(async (msg) => {
        let attachment: { id: string; filename: string; signedUrl: string; fileType: string } | undefined;
        if (msg.document && admin) {
          try {
            const { data } = await admin.storage
              .from('documents')
              .createSignedUrl(msg.document.storagePath, 60 * 60);
            if (data?.signedUrl) {
              attachment = {
                id: msg.document.id,
                filename: msg.document.filename,
                signedUrl: data.signedUrl,
                fileType: msg.document.kind,
              };
            }
          } catch {}
        }
        return {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
          attachment,
        };
      }),
    );

    return NextResponse.json({ messages: mapped });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const { role, content, documentId } = await req.json();
    if (!role || !content) {
      return NextResponse.json({ error: 'role and content required' }, { status: 400 });
    }

    let docIdToLink: string | undefined;
    if (documentId) {
      const doc = await prisma.document.findUnique({
        where: { id: String(documentId) },
        include: { person: true },
      });
      if (!doc || doc.person?.ownerId !== userId) {
        return NextResponse.json({ error: 'document forbidden' }, { status: 403 });
      }
      docIdToLink = doc.id;
    }

    const message = await prisma.chatMessage.create({
      data: {
        userId,
        role: String(role),
        content: String(content),
        documentId: docIdToLink,
      },
      include: { document: true },
    });

    return NextResponse.json({ id: message.id });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
