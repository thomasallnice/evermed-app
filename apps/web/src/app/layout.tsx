import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

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
        <Nav />
        <main className="container py-6">{children}</main>
      </body>
    </html>
  )
}
