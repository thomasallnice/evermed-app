import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = process.env.VERCEL_BYPASS_TOKEN || ''
  const vercelEnv = process.env.VERCEL_ENV || ''
  if (!token || vercelEnv !== 'preview') {
    return NextResponse.json({ error: 'unavailable', hint: 'Only enabled in Preview with VERCEL_BYPASS_TOKEN set' }, { status: 404 })
  }
  const to = req.nextUrl.searchParams.get('to') || '/api/health'
  const url = new URL(to, req.nextUrl.origin)
  url.searchParams.set('x-vercel-set-bypass-cookie', 'true')
  url.searchParams.set('x-vercel-protection-bypass', token)
  return NextResponse.redirect(url.toString(), { status: 302 })
}

