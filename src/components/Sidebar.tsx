'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUserProfile } from '@/contexts/UserProfileContext'
import UserMiniProfile from './UserMiniProfile'
import type { TranslationKey } from '@/lib/i18n'

type NavItem = {
  href: string
  labelKey: TranslationKey
  icon: string
  guestDisabled?: boolean
}

const NAV: NavItem[] = [
  { href: '/menu', labelKey: 'navMenu', icon: '▢' },
  { href: '/lobby', labelKey: 'navBattle', icon: '⚔' },
  { href: '/leaderboard', labelKey: 'navBoard', icon: '★' },
  { href: '/profile', labelKey: 'navProfile', icon: '◍', guestDisabled: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()
  const { profile } = useUserProfile()
  const isGuest = profile?.isGuest ?? false
  const [hovered, setHovered] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  const expanded = hovered
  const inGame = pathname === '/play' || pathname.startsWith('/battle/')

  function handleNav(e: React.MouseEvent, href: string) {
    if (inGame) {
      e.preventDefault()
      setPendingHref(href)
    }
  }

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${expanded ? 'w-[200px]' : 'w-[64px]'} fixed left-0 top-0 z-40 bg-[#0a0a14] border-r border-[#1a1a2e] flex flex-col h-screen transition-[width] duration-200`}
    >
      {/* Logo */}
      <Link
        href="/menu"
        onClick={e => handleNav(e, '/menu')}
        className={`flex items-center ${!expanded ? 'justify-center' : ''} text-cyan-400 font-bold tracking-[2px] px-4 py-4`}
        style={{ textShadow: '0 0 8px #00f5ff', fontSize: !expanded ? '20px' : '18px' }}
      >
        {!expanded ? 'T' : 'TETRIS'}
      </Link>

      {/* Profile */}
      <div className="px-3">
        <UserMiniProfile collapsed={!expanded} />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 mt-3 px-2">
        {NAV.map(item => {
          const active =
            pathname === item.href ||
            (item.href === '/lobby' && pathname.startsWith('/battle/'))
          const disabled = item.guestDisabled && isGuest
          const label = t(item.labelKey)
          const base = `flex items-center ${!expanded ? 'justify-center' : 'gap-2.5'} rounded px-2 py-2 text-sm tracking-wide transition`
          if (disabled) {
            return (
              <span
                key={item.href}
                title={!expanded ? label : undefined}
                className={`${base} text-gray-700 cursor-not-allowed select-none`}
              >
                <span className="text-base">{item.icon}</span>
                {expanded && <span>{label}</span>}
              </span>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={e => handleNav(e, item.href)}
              title={!expanded ? label : undefined}
              className={`${base} ${
                active
                  ? 'text-fuchsia-400 bg-fuchsia-500/10'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
              }`}
              style={active ? { textShadow: '0 0 6px #f0f' } : {}}
            >
              <span className="text-base">{item.icon}</span>
              {expanded && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* 게임 이탈 확인 모달 */}
      {pendingHref && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPendingHref(null)}
        >
          <div
            className="bg-[#0d0d1f] border border-gray-700 p-6 w-80 flex flex-col gap-5"
            style={{ boxShadow: '0 0 30px rgba(0,0,0,0.8)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-gray-200 text-sm text-center tracking-wide leading-relaxed">
              {t('leaveGameConfirm')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  router.push(pendingHref)
                  setPendingHref(null)
                }}
                className="flex-1 py-2 border border-red-600 text-red-400 hover:bg-red-900/30 transition text-sm tracking-widest"
              >
                {t('leaveGame')}
              </button>
              <button
                onClick={() => setPendingHref(null)}
                className="flex-1 py-2 border border-gray-700 text-gray-400 hover:border-gray-500 transition text-sm tracking-widest"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
