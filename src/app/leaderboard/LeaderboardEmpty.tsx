'use client'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LeaderboardEmpty() {
  const { t } = useLanguage()
  return <p className="text-center text-gray-600 py-12">{t('leaderboardEmpty')}</p>
}
