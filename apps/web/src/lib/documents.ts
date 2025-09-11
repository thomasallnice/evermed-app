import { PrismaClient } from '@prisma/client';
import { getSignedUrlForDocument } from './storage';

const prisma = new PrismaClient();

export async function createDocument(opts: {
  personId: string;
  kind: string;
  topic?: string | null;
  filename: string;
  storagePath: string;
  sha256: string;
}) {
  return prisma.document.create({ data: {
    personId: opts.personId,
    kind: opts.kind,
    topic: opts.topic ?? null,
    filename: opts.filename,
    storagePath: opts.storagePath,
    sha256: opts.sha256,
  }});
}

export async function getDocumentAuthorized(docId: string, userId: string) {
  const doc = await prisma.document.findUnique({ where: { id: docId }, include: { person: true } });
  if (!doc) return null;
  if (!doc.person || doc.person.ownerId !== userId) return null;
  const signedUrl = await getSignedUrlForDocument(doc.storagePath, 3600);
  return {
    id: doc.id,
    filename: doc.filename,
    kind: doc.kind,
    uploadedAt: doc.uploadedAt,
    signedUrl,
  };
}

