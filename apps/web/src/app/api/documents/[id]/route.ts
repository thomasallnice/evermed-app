import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = params;

    // Fetch document with person ownership check
    const document = await prisma.document.findFirst({
      where: {
        id,
        person: {
          ownerId: userId,
        },
      },
      select: {
        id: true,
        filename: true,
        kind: true,
        storagePath: true,
        uploadedAt: true,
        topic: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(document, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = params;

    // Fetch document to verify ownership and get storage path
    const document = await prisma.document.findFirst({
      where: {
        id,
        person: {
          ownerId: userId,
        },
      },
      select: {
        id: true,
        storagePath: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete from storage bucket first (safe to ignore if already missing)
    if (document.storagePath) {
      try {
        const supabase = getSupabase();
        await supabase.storage.from('documents').remove([document.storagePath]);
      } catch (storageError) {
        // Log but don't fail if storage deletion fails
        console.error('Storage deletion failed:', storageError);
      }
    }

    // Delete from database (cascades to related records via Prisma schema)
    await prisma.document.delete({
      where: {
        id: document.id,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
