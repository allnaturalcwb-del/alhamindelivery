import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Al'hamin Delivery Control",
  description: "Controle de entregas Al'hamin",
}

export const viewport: Viewport = {
  themeColor: '#2B6344',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.className} bg-[#F5F0E6] min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
