import { NextResponse } from 'next/server';

// This API route provides the icon SVG data that can be converted to PNG by browsers
// For production, you should generate proper PNG icons using a tool like sharp or imagemagick

const iconSVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="128" fill="#2563eb"/>
  <rect x="196" y="128" width="120" height="256" rx="16" fill="white"/>
  <rect x="128" y="196" width="256" height="120" rx="16" fill="white"/>
  <path d="M128 340 L180 340 L200 300 L220 380 L240 340 L384 340" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
</svg>`;

export async function GET() {
  return new NextResponse(iconSVG, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
