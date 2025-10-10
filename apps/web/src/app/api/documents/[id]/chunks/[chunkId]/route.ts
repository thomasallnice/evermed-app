import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; chunkId: string } }
) {
  try {
    const userId = await requireUserId(req);
    const documentId = params.id;
    const chunkId = parseInt(params.chunkId, 10);

    if (isNaN(chunkId)) {
      return NextResponse.json({ error: 'Invalid chunk ID' }, { status: 400 });
    }

    // Fetch the document to verify ownership
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { person: true }
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!doc.person || doc.person.ownerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the specific chunk
    const chunk = await prisma.docChunk.findUnique({
      where: {
        documentId_chunkId: {
          documentId: documentId,
          chunkId: chunkId
        }
      }
    });

    if (!chunk) {
      return NextResponse.json({ error: 'Chunk not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: chunk.id,
      chunkId: chunk.chunkId,
      text: chunk.text,
      sourceAnchor: chunk.sourceAnchor
    });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching chunk:', e);
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
