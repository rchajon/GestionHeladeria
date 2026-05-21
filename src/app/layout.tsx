import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Helados Sombrilla Artesanal – Sistema de Gestión',
  description: 'Sistema ERP para distribución mayorista de helados artesanales. Sabores y tradición de Guatemala.',
  icons: {
    icon:             [
      { url: '/favicon.png', sizes: '32x32',   type: 'image/png' },
      { url: '/favicon.png', sizes: '16x16',   type: 'image/png' },
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
