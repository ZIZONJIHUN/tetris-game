'use client'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { useLanguage } from '@/contexts/LanguageContext'

export default function UserMiniProfile() {
  const { profile } = useUserProfile()
  const { t } = useLanguage()

  if (!profile || profile.isGuest) return null

  return (
    <div className="border border-[#1a1a2e] rounded p-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full"
          style={{ background: 'linear-gradient(135deg, #c0a 0%, #f0f 100%)' }}
          aria-hidden
        />
        <span className="text-white text-xs truncate">{profile.nickname}</span>
      </div>
      {profile.rank !== null && (
        <p className="text-yellow-400 text-[10px] tracking-widest">
          ★ {t('rank')} #{profile.rank}
        </p>
      )}
      <p className="text-gray-500 text-[10px] tabular-nums">
        {t('bestScore')} {profile.bestScore.toLocaleString()}
      </p>
    </div>
  )
}
