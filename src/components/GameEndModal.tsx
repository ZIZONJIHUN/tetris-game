// src/components/GameEndModal.tsx
'use client'
import { useEffect, useState } from 'react'
import { FinalizeGameResult } from '@/lib/leveling/finalize'
import { tierForLevel, xpToNext, totalXpFor } from '@/lib/leveling/xp'
import { useLanguage } from '@/contexts/LanguageContext'

type Props = {
  result: FinalizeGameResult | null
  loading: boolean
  error: string | null
  onRetry: () => void
  onExit: () => void
}

export default function GameEndModal({ result, loading, error, onRetry, onExit }: Props) {
  const { t, lang } = useLanguage()
  const [animatedXp, setAnimatedXp] = useState(0)

  useEffect(() => {
    if (!result) return
    const start = result.prev_xp
    const end = result.new_xp
    const duration = 1200
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration)
      setAnimatedXp(Math.round(start + (end - start) * k))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [result])

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80">
        <p className="text-gray-300">{t('gameOver')}…</p>
      </div>
    )
  }
  if (error || !result) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
        <p className="text-red-400">{error ?? t('errorOccurred')}</p>
        <button onClick={onExit} className="px-4 py-2 border border-gray-500 text-gray-300">
          {t('backToLobby')}
        </button>
      </div>
    )
  }

  const tier = tierForLevel(result.new_level)
  const xpInLevel = animatedXp - totalXpFor(result.new_level)
  const xpForLevel = xpToNext(result.new_level)
  const pct = Math.min(100, (xpInLevel / xpForLevel) * 100)
  const leveledUp = result.new_level > result.prev_level

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/85">
      <div className="bg-gray-900 border border-cyan-500/50 p-6 max-w-md w-full flex flex-col gap-4">
        <h2 className="text-cyan-400 font-bold text-xl tracking-widest">{t('gameOver')}</h2>

        <div className="text-gray-300 text-sm flex flex-col gap-1">
          <p>+{result.xp_gained.toLocaleString()} XP</p>
          <ul className="text-xs text-gray-500 pl-2">
            <li>{t('xpBase')}: +{result.xp_breakdown.base}</li>
            {result.xp_breakdown.tetris > 0 && <li>Tetris: +{result.xp_breakdown.tetris}</li>}
            {result.xp_breakdown.combo > 0 && <li>Combo: +{result.xp_breakdown.combo}</li>}
            {result.xp_breakdown.perfect > 0 && <li>Perfect: +{result.xp_breakdown.perfect}</li>}
            {result.xp_breakdown.personal_best > 0 && <li>{t('xpPersonalBest')}: +{result.xp_breakdown.personal_best}</li>}
            {result.xp_breakdown.win > 0 && <li>{t('xpWin')}: +{result.xp_breakdown.win}</li>}
            {result.xp_breakdown.win_streak > 0 && <li>{t('xpWinStreak')}: +{result.xp_breakdown.win_streak}</li>}
            {result.xp_breakdown.achievement_bonus > 0 && <li>{t('xpAchievement')}: +{result.xp_breakdown.achievement_bonus}</li>}
          </ul>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Lv {result.new_level} · {tier}</span>
            <span>{xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded overflow-hidden">
            <div className="h-full bg-cyan-500" style={{ width: `${pct}%`, transition: 'width 0.2s' }} />
          </div>
          {leveledUp && (
            <p className="text-yellow-400 text-sm font-bold mt-2" style={{ textShadow: '0 0 8px #ffe600' }}>
              {t('levelUp')} → Lv {result.new_level}
            </p>
          )}
        </div>

        {result.mmr_delta !== null && (
          <p className="text-gray-300 text-sm">
            MMR {result.prev_mmr} → {result.new_mmr}
            {' '}
            <span className={result.mmr_delta >= 0 ? 'text-cyan-400' : 'text-red-400'}>
              ({result.mmr_delta >= 0 ? '+' : ''}{result.mmr_delta})
            </span>
          </p>
        )}

        {result.unlocked.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-yellow-400 font-bold text-sm">🏆 {t('achievementUnlocked')}</p>
            {result.unlocked.map(a => (
              <div key={a.id} className="border border-yellow-500/40 p-2">
                <p className="text-yellow-300 text-sm">{lang === 'ko' ? a.name_ko : a.name_en}</p>
                {a.xp_reward > 0 && <p className="text-xs text-gray-400">+{a.xp_reward} XP</p>}
                {a.badge_label && <p className="text-xs text-gray-400">{t('badge')}: {a.badge_label}</p>}
                {a.skin_key && <p className="text-xs text-gray-400">{t('skin')}: {a.skin_key}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end mt-2">
          <button onClick={onExit} className="px-4 py-2 border border-gray-500 text-gray-300 hover:bg-gray-800">
            {t('backToLobby')}
          </button>
          <button onClick={onRetry} className="px-4 py-2 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20">
            {t('retry')}
          </button>
        </div>
      </div>
    </div>
  )
}
