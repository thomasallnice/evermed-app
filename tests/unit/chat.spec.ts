import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}

describe.runIf(hasDb)('Chat + RAG', () => {
  const prisma = new PrismaClient();

  it('answers with citations when chunks exist', async () => {
    const p = await prisma.person.create({ data: { ownerId: 'userA' } });
    const d = await prisma.document.create({ data: { personId: p.id, kind: 'pdf', filename: 'test.pdf', storagePath: 'documents/x.pdf', sha256: 'x' } });
    await prisma.docChunk.create({ data: { documentId: d.id, chunkId: 1, text: 'Hemoglobin 12.9 g/dL', sourceAnchor: 'p1.l2' } });
    const { POST } = await import('../../apps/web/src/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ question: 'What is my hemoglobin?', personId: p.id }) }) as any;
    const res = await POST(req);
    const j = await (res as Response).json();
    expect(Array.isArray(j.citations)).toBe(true);
    expect(j.citations.length).toBeGreaterThan(0);
  });

  it('refuses when no relevant chunks', async () => {
    const p = await prisma.person.create({ data: { ownerId: 'userB' } });
    const { POST } = await import('../../apps/web/src/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ question: 'Any A1c?', personId: p.id }) }) as any;
    const res = await POST(req);
    const j = await (res as Response).json();
    expect(String(j.answer)).toContain("I don’t have that in your records.");
    expect(j.safetyTag).toBe('refusal');
  });

  it('refuses banned topics', async () => {
    const { POST } = await import('../../apps/web/src/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ question: 'Can you diagnose pneumonia?', personId: 'p' }) }) as any;
    const res = await POST(req);
    const j = await (res as Response).json();
    expect(j.safetyTag).toBe('refusal');
  });

  it('escalates red flags', async () => {
    const { POST } = await import('../../apps/web/src/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ question: 'I have chest pain', personId: 'p' }) }) as any;
    const res = await POST(req);
    const j = await (res as Response).json();
    expect(j.safetyTag).toBe('escalation');
  });
});

