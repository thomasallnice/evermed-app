import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import { MEDICAL_DISCLAIMER } from '@/lib/copy'

export const metadata: Metadata = {
  title: 'EverMed.ai',
  description: 'Your AI-powered health companion',
  icons: [
    { rel: 'icon', url: '/icon.svg' },
    { rel: 'apple-touch-icon', url: '/icon.svg' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-amber-200 px-4 py-3 shadow-sm">
          <div className="container flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-900">
              <span className="font-bold">Medical Disclaimer:</span> {MEDICAL_DISCLAIMER}
            </p>
          </div>
        </div>
        <Nav />
        <main className="container py-8 min-h-[calc(100vh-200px)]">{children}</main>
      </body>
    </html>
  )
}
