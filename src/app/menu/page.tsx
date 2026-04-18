'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/i18n'

export default function MenuPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [nickname, setNickname] = useState('')
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      supabase.from('profiles').select('nickname, is_guest').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) { setNickname(data.nickname); setIsGuest(data.is_guest) }
        })
    })
  }, [router])

  const menuItems: Array<{
    key: TranslationKey
    icon: string
    href: string
    guestDisabled?: boolean
  }> = [
    { key: 'singleGame', icon: '▶', href: '/play' },
    { key: 'battleMode', icon: '⚔', href: '/lobby' },
    { key: 'leaderboard', icon: '◆', href: '/leaderboard' },
    { key: 'profile', icon: '○', href: '/profile', guestDisabled: true },
  ]

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        {/* 타이틀 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-widest" style={{ color: 'var(--text)' }}>TETRIS</h1>
          {nickname && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {nickname}
              {isGuest && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>(guest)</span>}
            </p>
          )}
        </div>

        {/* 메뉴 카드 */}
        <div className="bg-white border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {t('selectMode')}
            </p>
          </div>
          {menuItems.map((item, idx) => {
            const disabled = item.guestDisabled && isGuest
            return (
              <Link
                key={item.key}
                href={disabled ? '#' : item.href}
                onClick={disabled ? (e) => e.preventDefault() : undefined}
                className={`flex items-center gap-4 px-4 py-4 transition ${
                  idx < menuItems.length - 1 ? 'border-b border-[var(--border)]' : ''
                } ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[var(--bg)] cursor-pointer'}`}
              >
                <span className="w-8 h-8 flex items-center justify-center rounded text-sm font-bold"
                  style={{ background: disabled ? '#f0f0f0' : 'var(--accent-bg)', color: disabled ? 'var(--text-muted)' : 'var(--accent)' }}>
                  {item.icon}
                </span>
                <span className="text-sm font-bold tracking-wider" style={{ color: disabled ? 'var(--text-muted)' : 'var(--text)' }}>
                  {t(item.key)}
                </span>
                {disabled ? (
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>로그인 필요</span>
                ) : (
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>›</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
