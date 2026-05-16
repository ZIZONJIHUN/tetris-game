'use client'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { useLanguage } from '@/contexts/LanguageContext'

export default function UserMiniProfile({ collapsed = false }: { collapsed?: boolean }) {
  const { profile } = useUserProfile()
  const { t } = useLanguage()

  if (!profile || profile.isGuest) return null

  if (collapsed) {
    return (
      <div className="flex justify-center" title={profile.nickname}>
        <div
          className="w-8 h-8 rounded-full"
          style={{ background: 'linear-gradient(135deg, #c0a 0%, #f0f 100%)' }}
          aria-hidden
        />
      </div>
    )
  }

  return (
    <div className="border border-[#1a1a2e] rounded p-2.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full shrink-0"
          style={{ background: 'linear-gradient(135deg, #c0a 0%, #f0f 100%)' }}
          aria-hidden
        />
        <span className="text-white text-sm truncate">{profile.nickname}</span>
      </div>
      {profile.rank !== null && (
        <p className="text-yellow-400 text-xs tracking-wide">
          ★ {t('rank')} #{profile.rank}
        </p>
      )}
      <p className="text-gray-500 text-xs tabular-nums">
        {t('bestScore')} {profile.bestScore.toLocaleString()}
      </p>
    </div>
  )
}
