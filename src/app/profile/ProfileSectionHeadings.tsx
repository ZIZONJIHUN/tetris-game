'use client'
import { useLanguage } from '@/contexts/LanguageContext'

export function ProfileAchievementsHeading({ earnedCount, totalCount }: { earnedCount: number; totalCount: number }) {
  const { t } = useLanguage()
  return (
    <h2 className="text-gray-400 text-sm uppercase tracking-widest mb-3">
      {t('profileAchievements')} ({earnedCount}/{totalCount})
    </h2>
  )
}

export function ProfileRecentGamesHeading() {
  const { t } = useLanguage()
  return <h2 className="text-gray-400 text-sm uppercase tracking-widest mb-3">{t('profileRecentGames')}</h2>
}

export function ProfileNoGames() {
  const { t } = useLanguage()
  return <p className="text-center text-gray-600 py-8">{t('profileNoGames')}</p>
}
