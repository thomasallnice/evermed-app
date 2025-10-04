import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);

    // Get all documents for persons owned by this user
    const documents = await prisma.document.findMany({
      where: {
        person: {
          ownerId: userId
        }
      },
      include: {
        person: {
          select: {
            id: true,
            givenName: true,
            familyName: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    return NextResponse.json({
      documents: documents.map(doc => ({
        id: doc.id,
        personId: doc.personId,
        kind: doc.kind,
        topic: doc.topic,
        filename: doc.filename,
        storagePath: doc.storagePath,
        uploadedAt: doc.uploadedAt,
        person: doc.person
      }))
    });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
