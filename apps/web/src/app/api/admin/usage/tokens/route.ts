import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const days = Number(url.searchParams.get('days') || 30);
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const rows = await prisma.tokenUsage.findMany({ where: { createdAt: { gte: since } } });
  const map = new Map<string, { feature: string; model: string; tokensIn: number; tokensOut: number; costUsd: number }>();
  for (const r of rows) {
    const k = `${r.feature}|${r.model}`;
    if (!map.has(k)) map.set(k, { feature: r.feature, model: r.model, tokensIn: 0, tokensOut: 0, costUsd: 0 });
    const agg = map.get(k)!;
    agg.tokensIn += r.tokensIn;
    agg.tokensOut += r.tokensOut;
    agg.costUsd += Number(r.costUsd || 0);
  }
  return NextResponse.json({ days, byFeatureModel: Array.from(map.values()) });
}

