import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'All Natural Delivery',
  description: 'Controle de entregas All Natural',
}

export const viewport: Viewport = {
  themeColor: '#F7941D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.className} bg-[#FFF8F0] min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
