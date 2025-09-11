import { PrismaClient } from '@prisma/client';
import { StubOcrProvider, type OcrProvider } from './providers/stub';

const prisma = new PrismaClient();
let provider: OcrProvider = new StubOcrProvider();

export function setOcrProvider(p: OcrProvider) {
  provider = p;
}

export async function processOcr(documentId: string, storagePath: string) {
  const result = await provider.extract(storagePath);
  let chunkId = 0;
  for (const page of result.pages) {
    for (const line of page.lines) {
      await prisma.docChunk.create({
        data: {
          documentId,
          chunkId: chunkId++,
          text: line.text,
          // embedding: null (left undefined)
          sourceAnchor: line.anchor,
        },
      });
    }
  }
}

export async function queueOcrJob(documentId: string, storagePath: string) {
  // TODO: integrate Vercel background/queues; run inline for MVP.
  // Fire-and-forget pattern to avoid blocking uploads.
  processOcr(documentId, storagePath).catch(() => {});
}

