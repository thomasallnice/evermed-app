import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { suggestTopics, TopicSuggestion } from '@/lib/topic-suggester';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// Simple in-memory cache with TTL
const cache = new Map<string, { suggestions: TopicSuggestion[]; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Rate limiting map: userId -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10; // 10 requests per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset window
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireUserId(req);
    const documentId = params.id;

    // Validate documentId is UUID (basic check)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId)) {
      return NextResponse.json(
        { error: 'Invalid documentId format' },
        { status: 400 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 requests per minute.' },
        { status: 429 }
      );
    }

    // Check cache first
    const cached = cache.get(documentId);
    if (cached && Date.now() < cached.expiry) {
      return NextResponse.json({ suggestions: cached.suggestions });
    }

    // Fetch document and verify ownership
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        person: true,
        chunks: {
          select: {
            text: true,
          },
          orderBy: {
            chunkId: 'asc',
          },
          take: 5, // Get first few chunks for context
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!doc.person || doc.person.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: you do not own this document' },
        { status: 403 }
      );
    }

    // Gather OCR text from chunks
    const ocrText = doc.chunks.map((c) => c.text).join('\n');

    // Call suggester
    const suggestions = await suggestTopics({
      filename: doc.filename,
      kind: doc.kind,
      ocrText: ocrText || null,
    });

    // Cache the result
    cache.set(documentId, {
      suggestions,
      expiry: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({ suggestions });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in suggest-topic endpoint:', e);
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
