import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import PWAInstaller from '@/components/PWAInstaller'

export const metadata: Metadata = {
  title: 'EverMed.ai - Personal Health Records',
  description: 'Your personal health records and metabolic insights, organized and accessible anywhere.',
  applicationName: 'EverMed',
  keywords: ['health', 'medical records', 'metabolic insights', 'pwa', 'personal health'],
  authors: [{ name: 'EverMed' }],
  manifest: '/manifest.json',
  icons: [
    { rel: 'icon', url: '/icon.svg', type: 'image/svg+xml' },
    { rel: 'apple-touch-icon', url: '/icon.svg' },
    { rel: 'icon', url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { rel: 'icon', url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
  appleWebApp: {
    capable: true,
    title: 'EverMed',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#2563eb',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EverMed" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="bg-gray-50">
        <Nav />
        <main className="container py-4 sm:py-6">{children}</main>
        <PWAInstaller />
      </body>
    </html>
  )
}
