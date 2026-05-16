'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUserProfile } from '@/contexts/UserProfileContext'
import type { TranslationKey } from '@/lib/i18n'
import AppShell from '@/components/AppShell'

export default function MenuPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { profile, loading } = useUserProfile()
  const nickname = profile?.nickname ?? ''
  const isGuest = profile?.isGuest ?? false

  useEffect(() => {
    if (!loading && !profile) router.push('/')
  }, [loading, profile, router])

  const menuItems: Array<{
    key: TranslationKey
    icon: string
    color: string
    glow: string
    href: string
    guestDisabled?: boolean
  }> = [
    {
      key: 'singleGame',
      icon: '🎮',
      color: 'border-cyan-500 text-cyan-400',
      glow: 'rgba(0,245,255,0.15)',
      href: '/play',
    },
    {
      key: 'battleMode',
      icon: '⚔️',
      color: 'border-purple-500 text-purple-400',
      glow: 'rgba(255,0,255,0.15)',
      href: '/lobby',
    },
    {
      key: 'leaderboard',
      icon: '🏆',
      color: 'border-yellow-500 text-yellow-400',
      glow: 'rgba(255,230,0,0.15)',
      href: '/leaderboard',
    },
    {
      key: 'profile',
      icon: '👤',
      color: 'border-gray-500 text-gray-300',
      glow: 'rgba(150,150,150,0.1)',
      href: '/profile',
      guestDisabled: true,
    },
  ]

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center gap-10 min-h-[calc(100vh-4rem)] w-full">
      {/* 타이틀 */}
      <div className="text-center">
        <h1
          className="text-7xl font-bold tracking-widest text-cyan-400"
          style={{ textShadow: '0 0 25px #00f5ff, 0 0 50px #00f5ff33' }}
        >
          TETRIS
        </h1>
        {nickname && (
          <p className="text-gray-500 mt-3 text-base tracking-widest">
            {nickname}
            {isGuest && <span className="text-gray-700 ml-2 text-sm">(guest)</span>}
          </p>
        )}
      </div>

      {/* 모드 선택 */}
      <div className="flex flex-col gap-4 w-[420px]">
        <p className="text-gray-600 text-sm uppercase tracking-widest text-center mb-1">
          {t('selectMode')}
        </p>
        {menuItems.map(item => {
          const disabled = item.guestDisabled && isGuest
          return (
            <Link
              key={item.key}
              href={disabled ? '#' : item.href}
              onClick={disabled ? (e) => e.preventDefault() : undefined}
              className={`
                flex items-center gap-5 px-7 py-5 border font-bold tracking-widest transition
                ${item.color}
                ${disabled
                  ? 'opacity-30 cursor-not-allowed border-gray-700 text-gray-600'
                  : 'hover:bg-white/5 cursor-pointer'
                }
              `}
              style={disabled ? {} : { boxShadow: `0 0 16px ${item.glow}` }}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-lg">{t(item.key)}</span>
              {disabled && (
                <span className="ml-auto text-xs text-gray-700 font-normal normal-case tracking-normal">
                  login required
                </span>
              )}
            </Link>
          )
        })}
      </div>
      </div>
    </AppShell>
  )
}
