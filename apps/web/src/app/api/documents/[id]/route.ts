import { NextRequest, NextResponse } from 'next/server';
import { getDocumentAuthorized } from '@/lib/documents';
import { requireUserId } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId(req);
    const data = await getDocumentAuthorized(params.id, userId);
    if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    // Verify user owns this document
    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: { person: true }
    });

    if (!doc) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    if (!doc.person || doc.person.ownerId !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Update allowed fields
    const updateData: { topic?: string | null; personId?: string } = {};

    if ('topic' in body) {
      updateData.topic = body.topic || null;
    }

    if ('personId' in body && body.personId) {
      // Verify the new person also belongs to the user
      const newPerson = await prisma.person.findUnique({ where: { id: body.personId } });
      if (!newPerson || newPerson.ownerId !== userId) {
        return NextResponse.json({ error: 'invalid personId' }, { status: 400 });
      }
      updateData.personId = body.personId;
    }

    const updated = await prisma.document.update({
      where: { id: params.id },
      data: updateData,
      include: { person: true }
    });

    return NextResponse.json({
      id: updated.id,
      filename: updated.filename,
      kind: updated.kind,
      topic: updated.topic,
      personId: updated.personId,
      uploadedAt: updated.uploadedAt,
      person: {
        id: updated.person.id,
        givenName: updated.person.givenName,
        familyName: updated.person.familyName
      }
    });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId(req);

    // Verify user owns this document
    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: { person: true }
    });

    if (!doc) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    if (!doc.person || doc.person.ownerId !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Delete from storage first (safe to ignore if already missing)
    try {
      const admin = getAdminSupabase();
      await admin.storage.from('documents').remove([doc.storagePath]);
    } catch (storageErr) {
      // Log but don't fail - file might already be deleted
      console.warn('Storage deletion warning:', storageErr);
    }

    // Delete from database (cascades to chunks, observations, etc.)
    await prisma.document.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
