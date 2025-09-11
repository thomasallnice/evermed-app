import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function embedQuestion(_question: string): number[] | null {
  // Stub: return null in tests/MVP to avoid requiring an embeddings provider.
  return null;
}

export type RetrievedChunk = {
  documentId: string;
  sourceAnchor: string | null;
  text: string;
};

export async function retrieveChunks(personId: string, question: string, limit = 6): Promise<RetrievedChunk[]> {
  const vec = embedQuestion(question);
  if (vec) {
    const vectorText = `[${vec.join(',')}]`;
    const sql = `
      SELECT dc."documentId" as "documentId", dc."sourceAnchor" as "sourceAnchor", dc."text" as text
      FROM "DocChunk" dc
      JOIN "Document" d ON d.id = dc."documentId"
      WHERE d."personId" = $1
      ORDER BY CASE WHEN dc.embedding IS NOT NULL THEN dc.embedding <-> '${vectorText}'::vector ELSE 1e9 END
      LIMIT $2
    `;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await prisma.$queryRawUnsafe(sql, personId, limit)) as any;
  }
  // Fallback: recent chunks for this person
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

