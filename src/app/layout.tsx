import type { Metadata } from 'next'
import { Orbitron, Share_Tech_Mono, Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { KeybindingsProvider } from '@/contexts/KeybindingsContext'
import { UserProfileProvider } from '@/contexts/UserProfileContext'
import SettingsButton from '@/components/SettingsButton'

const orbitron = Orbitron({ variable: '--font-orbitron', subsets: ['latin'], weight: ['400', '700', '900'] })
const shareTechMono = Share_Tech_Mono({ variable: '--font-share-tech-mono', subsets: ['latin'], weight: '400' })
const notoSansKR = Noto_Sans_KR({
  variable: '--font-noto-kr',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'TETRIS.IO',
  description: '1vs1 Neon Tetris Battle',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${orbitron.variable} ${shareTechMono.variable} ${notoSansKR.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <KeybindingsProvider>
            <UserProfileProvider>
              <SettingsButton />
              {children}
            </UserProfileProvider>
          </KeybindingsProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
