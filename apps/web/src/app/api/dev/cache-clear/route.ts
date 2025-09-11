import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL('/api/dev/status', req.nextUrl.origin)
  url.searchParams.set('ts', Date.now().toString())
  return NextResponse.redirect(url.toString(), { status: 302 })
}

