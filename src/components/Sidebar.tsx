'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  { href: '/play', labelKey: 'navPlay', icon: '▸' },
  { href: '/lobby', labelKey: 'navBattle', icon: '⚔' },
  { href: '/leaderboard', labelKey: 'navBoard', icon: '★' },
  { href: '/profile', labelKey: 'navProfile', icon: '◐', guestDisabled: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { profile } = useUserProfile()
  const isGuest = profile?.isGuest ?? false

  return (
    <aside className="w-[140px] shrink-0 bg-[#0a0a14] border-r border-[#1a1a2e] flex flex-col gap-3 p-3.5 h-screen sticky top-0">
      <Link
        href="/menu"
        className="text-cyan-400 font-bold text-base tracking-[2px]"
        style={{ textShadow: '0 0 8px #00f5ff' }}
      >
        TETRIS
      </Link>

      <UserMiniProfile />

      <nav className="flex flex-col gap-1.5 mt-2">
        {NAV.map(item => {
          const active = pathname === item.href ||
            (item.href === '/lobby' && pathname.startsWith('/battle/'))
          const disabled = item.guestDisabled && isGuest
          if (disabled) {
            return (
              <span
                key={item.href}
                className="text-gray-700 text-xs tracking-wider cursor-not-allowed select-none"
              >
                {item.icon} {t(item.labelKey)}
              </span>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs tracking-wider transition ${
                active
                  ? 'text-fuchsia-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              style={active ? { textShadow: '0 0 6px #f0f' } : {}}
            >
              {active ? '▸' : item.icon} {t(item.labelKey)}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
