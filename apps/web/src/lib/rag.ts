import { PrismaClient } from '@prisma/client';
import { embedText } from '@/lib/embedding';

const prisma = new PrismaClient();

export async function embedQuestion(question: string): Promise<number[] | null> {
  return embedText(question);
}

export type RetrievedChunk = {
  documentId: string;
  sourceAnchor: string | null;
  text: string;
};

export async function retrieveChunks(personId: string, question: string, limit = 6): Promise<RetrievedChunk[]> {
  const vec = await embedQuestion(question);
  if (vec) {
    const vectorLiteral = `[${vec.join(',')}]`;
    const sql = `
      SELECT dc."documentId", dc."sourceAnchor", dc."text"
      FROM "DocChunk" dc
      JOIN "Document" d ON d.id = dc."documentId"
      WHERE d."personId" = $1
      ORDER BY CASE WHEN dc.embedding IS NOT NULL THEN dc.embedding <-> '${vectorLiteral}'::vector ELSE 1e9 END
      LIMIT $2
    `;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await prisma.$queryRawUnsafe(sql, personId, limit)) as any;
  }

  // Fallback: recent chunks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await prisma.$queryRaw<RetrievedChunk[]>`
    SELECT dc."documentId", dc."sourceAnchor", dc."text"
    FROM "DocChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE d."personId" = ${personId}
    ORDER BY dc."createdAt" DESC
    LIMIT ${limit}
  `);
}

export async function retrieveChunksByCode(personId: string, code: string, limit = 4): Promise<RetrievedChunk[]> {
  const sql = `
    SELECT dc."documentId", dc."sourceAnchor", dc."text"
    FROM "DocChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    JOIN "Observation" o ON o."sourceDocId" = d.id
    WHERE d."personId" = $1 AND o.code = $2
    ORDER BY dc."createdAt" DESC
    LIMIT $3
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await prisma.$queryRawUnsafe(sql, personId, code, limit)) as any;
}
