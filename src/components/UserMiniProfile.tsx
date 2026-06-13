// src/components/UserMiniProfile.tsx
'use client'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { tierForLevel, totalXpFor, xpToNext } from '@/lib/leveling/xp'
import { TIER_COLORS } from '@/lib/leveling/tierColors'

export default function UserMiniProfile({ collapsed = false }: { collapsed?: boolean }) {
  const { profile } = useUserProfile()
  const { t } = useLanguage()

  if (!profile || profile.isGuest) return null

  const tier = tierForLevel(profile.level)
  const xpInLevel = profile.xp - totalXpFor(profile.level)
  const xpForLevel = xpToNext(profile.level)
  const pct = Math.min(100, (xpInLevel / xpForLevel) * 100)
  const color = TIER_COLORS[tier]

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1" title={`${profile.nickname} · Lv ${profile.level}`}>
        <div className="relative">
          <div className="w-8 h-8 rounded-full" style={{ background: 'linear-gradient(135deg, #c0a 0%, #f0f 100%)' }} aria-hidden />
          <span
            className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 rounded"
            style={{ background: color, color: '#000' }}
          >
            {profile.level}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-[#1a1a2e] rounded p-2.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg, #c0a 0%, #f0f 100%)' }} aria-hidden />
        <div className="flex flex-col min-w-0">
          <span className="text-white text-sm truncate">{profile.nickname}</span>
          <span className="text-[10px] font-bold" style={{ color }}>Lv {profile.level} · {tier}</span>
        </div>
      </div>
      <div className="h-1 bg-gray-800 rounded overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-gray-500 text-[10px] tabular-nums">
        {xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP
      </p>
      {profile.rank !== null && (
        <p className="text-yellow-400 text-xs tracking-wide">★ {t('rank')} #{profile.rank}</p>
      )}
      <p className="text-gray-500 text-xs tabular-nums">
        {t('bestScore')} {profile.bestScore.toLocaleString()}
      </p>
    </div>
  )
}
