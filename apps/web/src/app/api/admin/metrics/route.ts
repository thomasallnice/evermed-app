import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, AnalyticsEvent, TokenUsage } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin') === '1'; // TODO: replace with Supabase role check
}

function pct(numer: number, denom: number) {
  return denom > 0 ? Math.round((numer / denom) * 1000) / 10 : 0; // 1 decimal place
}

function p95(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function within24h(a: Date, b: Date) {
  return Math.abs(+a - +b) <= 24 * 3600 * 1000;
}

type Tiles = {
  activation: number;
  clarity: number;
  preparation: { wauWithSharePct: number; recipientThumbsUpPct: number };
  retention: number;
  trust: number;
  safety: { p0: number; p1: number; noCitationPct: number };
  latencyP95Ms: number;
  usage: { dau: number; wau: number; mau: number; uploadsPerUser: number; avgPagesPerDoc: number | null };
  tokens: { feature: string; model: string; tokensIn: number; tokensOut: number; costUsd: number }[];
};

async function computeTiles(days: number): Promise<Tiles> {
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 3600 * 1000);
  const ev: AnalyticsEvent[] = await prisma.analyticsEvent.findMany({ where: { createdAt: { gte: since } } });

  const byUser = new Map<string, AnalyticsEvent[]>();
  for (const e of ev) {
    const uid = String(e.userId || '');
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(e);
  }

  // Activation: % users with first_upload_done and explain_viewed within 24h
  let activated = 0;
  let newUsers = 0;
  for (const [uid, list] of byUser.entries()) {
    const ups = list.filter((x) => x.name === 'first_upload_done');
    if (ups.length) newUsers++;
    const expl = list.filter((x) => x.name === 'explain_viewed');
    if (ups.length && expl.length) {
      const ok = ups.some((u) => expl.some((x) => within24h(u.createdAt, x.createdAt)));
      if (ok) activated++;
    }
  }
  const activation = pct(activated, Math.max(1, newUsers));

  // Clarity: % “Explain helpful = Yes”
  const helpful = ev.filter((x) => x.name === 'explain_helpful');
  const helpfulYes = helpful.filter((x) => {
    const m = (x.meta ?? {}) as any;
    const v = String(m?.value ?? m?.thumbs ?? '').toLowerCase();
    return v === 'yes' || v === 'up';
  }).length;
  const clarity = pct(helpfulYes, helpful.length || 0);

  // Preparation: % WAU creating ≥1 pack; recipient thumbs-up %
  const wauUsers = new Set(ev.map((x) => String(x.userId || '')));
  const shareCreatedUsers = new Set(ev.filter((x) => x.name === 'share_pack_created').map((x) => String(x.userId || '')));
  const prepPct = pct(shareCreatedUsers.size, Math.max(1, wauUsers.size));
  const recip = ev.filter((x) => x.name === 'share_pack_recipient_feedback');
  const recipUp = recip.filter((x) => String(((x.meta ?? {}) as any)?.thumbs || '').toLowerCase() === 'up').length;
  const recipientThumbsUpPct = pct(recipUp, recip.length || 0);

  // Retention (simple): users with any event ≥30d ago who are active in this window
  const pastSince = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
  const pastEv = await prisma.analyticsEvent.findMany({ where: { createdAt: { gte: pastSince, lt: since } }, select: { userId: true } });
  const cohort = new Set(pastEv.map((x) => String(x.userId || '')));
  let retained = 0;
  for (const uid of cohort) {
    if (wauUsers.has(uid)) retained++;
  }
  const retention = pct(retained, cohort.size || 0);

  // Trust: profile_suggestion_accept_rate
  const shown = ev.filter((x) => x.name === 'profile_suggestion_shown').length;
  const accepted = ev.filter((x) => x.name === 'profile_suggestion_accepted').length;
  const trust = pct(accepted, shown || 0);

  // Safety: incidents and % answers without citations
  const incidents = ev.filter((x) => x.name === 'unsafe_report');
  const p0 = incidents.filter((x) => String(((x.meta ?? {}) as any)?.severity || '').toUpperCase() === 'P0').length;
  const p1 = incidents.filter((x) => String(((x.meta ?? {}) as any)?.severity || '').toUpperCase() === 'P1').length;
  const answers = ev.filter((x) => x.name === 'answer_generated');
  const noCite = answers.filter((x) => !Boolean(((x.meta ?? {}) as any)?.citations));
  const noCitationPct = pct(noCite.length, answers.length || 0);

  // Latency: p95 of latency_ms meta.ms
  const lats = ev.filter((x) => x.name === 'latency_ms').map((x) => Number(((x.meta ?? {}) as any)?.ms || 0)).filter((n) => n > 0);
  const latencyP95Ms = p95(lats);

  // Usage
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 3600 * 1000);
  const dau = new Set(ev.filter((x) => x.createdAt >= oneDayAgo).map((x) => String(x.userId || ''))).size;
  const wau = wauUsers.size;
  const mau = new Set((await prisma.analyticsEvent.findMany({ where: { createdAt: { gte: new Date(now.getTime() - 30 * 24 * 3600 * 1000) } }, select: { userId: true, createdAt: true } })).map((x) => String(x.userId || ''))).size;
  const uploads = ev.filter((x) => x.name === 'first_upload_done');
  const uploadUsers = new Set(uploads.map((x) => String(x.userId || ''))).size;
  const uploadsPerUser = uploadUsers ? Math.round((uploads.length / uploadUsers) * 10) / 10 : 0;

  // Avg pages/doc unavailable from events in MVP
  const avgPagesPerDoc: number | null = null;

  // Tokens/Costs aggregation
  const tus: TokenUsage[] = await prisma.tokenUsage.findMany({ where: { createdAt: { gte: since } } });
  const tokensMap = new Map<string, { feature: string; model: string; tokensIn: number; tokensOut: number; costUsd: number }>();
  for (const t of tus) {
    const k = `${t.feature}|${t.model}`;
    if (!tokensMap.has(k)) tokensMap.set(k, { feature: t.feature, model: t.model, tokensIn: 0, tokensOut: 0, costUsd: 0 });
    const agg = tokensMap.get(k)!;
    agg.tokensIn += t.tokensIn;
    agg.tokensOut += t.tokensOut;
    agg.costUsd += Number(t.costUsd || 0);
  }
  const tokens = Array.from(tokensMap.values());

  return {
    activation,
    clarity,
    preparation: { wauWithSharePct: prepPct, recipientThumbsUpPct },
    retention,
    trust,
    safety: { p0, p1, noCitationPct },
    latencyP95Ms,
    usage: { dau, wau, mau, uploadsPerUser, avgPagesPerDoc },
    tokens,
  };
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const last7 = await computeTiles(7);
  const last30 = await computeTiles(30);
  return NextResponse.json({ last7, last30 });
}

