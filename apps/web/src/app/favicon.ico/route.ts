import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(req: NextRequest) {
  // Serve the actual favicon.ico file from public directory
  try {
    const faviconPath = join(process.cwd(), 'apps/web/public/favicon.ico')
    const faviconBuffer = await readFile(faviconPath)

    return new NextResponse(faviconBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    // Fallback to PNG icon if ICO fails
    const origin = new URL(req.url).origin
    const url = new URL('/icon.png', origin)
    return NextResponse.redirect(url, 308)
  }
}

