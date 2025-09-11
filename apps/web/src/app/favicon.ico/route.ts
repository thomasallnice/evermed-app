import { NextRequest, NextResponse } from 'next/server'

export function GET(req: NextRequest) {
  // Redirect /favicon.ico to the app icon (SVG). Avoid 404 noise in dev.
  const origin = new URL(req.url).origin
  const url = new URL('/icon.svg', origin)
  return NextResponse.redirect(url, 308)
}

