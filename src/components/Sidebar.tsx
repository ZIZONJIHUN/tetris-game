'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  { href: '/play', labelKey: 'navPlay', icon: '▶' },
  { href: '/lobby', labelKey: 'navBattle', icon: '⚔' },
  { href: '/leaderboard', labelKey: 'navBoard', icon: '★' },
  { href: '/profile', labelKey: 'navProfile', icon: '◍', guestDisabled: true },
]

const STORAGE_KEY = 'sidebar_collapsed'

export default function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { profile } = useUserProfile()
  const isGuest = profile?.isGuest ?? false
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  function toggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <aside
      className={`${collapsed ? 'w-[64px]' : 'w-[200px]'} shrink-0 bg-[#0a0a14] border-r border-[#1a1a2e] flex flex-col h-screen sticky top-0 transition-[width] duration-200`}
    >
      {/* Logo */}
      <Link
        href="/menu"
        className={`flex items-center ${collapsed ? 'justify-center' : ''} text-cyan-400 font-bold tracking-[2px] px-4 py-4`}
        style={{ textShadow: '0 0 8px #00f5ff', fontSize: collapsed ? '20px' : '18px' }}
      >
        {collapsed ? 'T' : 'TETRIS'}
      </Link>

      {/* Profile */}
      <div className="px-3">
        <UserMiniProfile collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 mt-3 px-2">
        {NAV.map(item => {
          const active =
            pathname === item.href ||
            (item.href === '/lobby' && pathname.startsWith('/battle/'))
          const disabled = item.guestDisabled && isGuest
          const label = t(item.labelKey)
          const base = `flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} rounded px-2 py-2 text-sm tracking-wide transition`
          if (disabled) {
            return (
              <span
                key={item.href}
                title={collapsed ? label : undefined}
                className={`${base} text-gray-700 cursor-not-allowed select-none`}
              >
                <span className="text-base">{item.icon}</span>
                {!collapsed && <span>{label}</span>}
              </span>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? label : undefined}
              className={`${base} ${
                active
                  ? 'text-fuchsia-400 bg-fuchsia-500/10'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
              }`}
              style={active ? { textShadow: '0 0 6px #f0f' } : {}}
            >
              <span className="text-base">{item.icon}</span>
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="mt-auto mb-3 mx-2 flex items-center justify-center rounded py-2 text-gray-500 hover:text-cyan-400 hover:bg-white/5 transition text-sm"
      >
        {collapsed ? '»' : '«'}
      </button>
    </aside>
  )
}
