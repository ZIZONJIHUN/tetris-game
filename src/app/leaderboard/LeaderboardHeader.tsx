'use client'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LeaderboardHeader({ orderBy }: { orderBy: 'best_score' | 'level' }) {
  const { t } = useLanguage()
  return (
    <>
      <h1
        className="text-yellow-400 font-bold text-2xl tracking-widest mb-4"
        style={{ textShadow: '0 0 10px #ffe600' }}
      >
        {t('leaderboardTitle')}
      </h1>
      <div className="flex gap-3 mb-4 text-sm">
        <Link
          href="/leaderboard?sort=score"
          className={orderBy === 'best_score' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-gray-500'}
        >
          {t('tabBestScore')}
        </Link>
        <Link
          href="/leaderboard?sort=level"
          className={orderBy === 'level' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-gray-500'}
        >
          {t('tabLevel')}
        </Link>
      </div>
    </>
  )
}
