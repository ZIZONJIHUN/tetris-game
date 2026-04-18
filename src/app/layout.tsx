import type { Metadata } from 'next'
import { Orbitron, Share_Tech_Mono } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import SettingsButton from '@/components/SettingsButton'

const orbitron = Orbitron({ variable: '--font-orbitron', subsets: ['latin'], weight: ['400', '700', '900'] })
const shareTechMono = Share_Tech_Mono({ variable: '--font-share-tech-mono', subsets: ['latin'], weight: '400' })

export const metadata: Metadata = {
  title: 'TETRIS.IO',
  description: '1vs1 Neon Tetris Battle',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${shareTechMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <SettingsButton />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
