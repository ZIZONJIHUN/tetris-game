'use client'
import { useEffect, useRef, useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { useKeyboard } from '@/hooks/useKeyboard'
import TetrisBoard from './TetrisBoard'
import HoldPiece from './HoldPiece'
import NextPieces from './NextPieces'
import { useLanguage } from '@/contexts/LanguageContext'

const BEST_SCORE_KEY = 'tetris_best_score'

export default function SoloGame() {
  const { state, actions } = useGame()
  const { t } = useLanguage()
  useKeyboard(actions, state.status === 'playing')

  const [bestScore, setBestScore] = useState(0)
  const [isNewBest, setIsNewBest] = useState(false)
  const prevStatus = useRef(state.status)

  useEffect(() => {
    const stored = parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10)
    setBestScore(isNaN(stored) ? 0 : stored)
  }, [])

  useEffect(() => {
    if (prevStatus.current === 'playing' && state.status === 'over') {
      const stored = parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10)
      const prev = isNaN(stored) ? 0 : stored
      if (state.score > prev) {
        localStorage.setItem(BEST_SCORE_KEY, String(state.score))
        setBestScore(state.score)
        setIsNewBest(true)
      } else {
        setIsNewBest(false)
      }
    }
    if (state.status === 'idle') setIsNewBest(false)
    prevStatus.current = state.status
  }, [state.status, state.score])

  const statLabel = "text-xs uppercase tracking-widest mb-0.5"
  const statValue = "font-bold text-lg tabular-nums"

  return (
    <div className="flex items-start gap-5 justify-center">
      {/* Left panel */}
      <div className="flex flex-col gap-4 w-24">
        <HoldPiece piece={state.holdPiece} />
        <div className="bg-white border border-[var(--border)] rounded p-3">
          <p className={statLabel} style={{ color: 'var(--text-muted)' }}>{t('score')}</p>
          <p className={statValue} style={{ color: 'var(--text)' }}>{state.score.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-[var(--border)] rounded p-3">
          <p className={statLabel} style={{ color: 'var(--text-muted)' }}>{t('bestScore')}</p>
          <p className={`${statValue} text-base`} style={{ color: 'var(--accent)' }}>{bestScore.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-[var(--border)] rounded p-3">
          <p className={statLabel} style={{ color: 'var(--text-muted)' }}>{t('level')}</p>
          <p className={statValue} style={{ color: 'var(--text)' }}>{state.level}</p>
        </div>
        <div className="bg-white border border-[var(--border)] rounded p-3">
          <p className={statLabel} style={{ color: 'var(--text-muted)' }}>{t('lines')}</p>
          <p className={statValue} style={{ color: 'var(--text)' }}>{state.lines}</p>
        </div>
      </div>

      {/* Game board */}
      <div className="relative">
        <TetrisBoard
          board={state.board}
          currentPiece={state.currentPiece}
          ghostY={state.ghostY}
          flashRows={state.flashRows}
        />
        {state.status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(42,45,54,0.85)' }}>
            <button
              onClick={actions.start}
              className="px-8 py-3 text-sm font-bold tracking-wider rounded transition"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {t('start')}
            </button>
          </div>
        )}
        {state.status === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: 'rgba(42,45,54,0.9)' }}>
            <p className="font-bold text-2xl text-white tracking-wider">{t('gameOver')}</p>
            {isNewBest && (
              <p className="text-sm font-bold" style={{ color: '#f7d308' }}>{t('newBest')}</p>
            )}
            <p className="text-sm text-white/80">{t('score')}: {state.score.toLocaleString()}</p>
            <button
              onClick={actions.reset}
              className="px-6 py-2 text-sm font-bold rounded transition"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {t('retry')}
            </button>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-24">
        <NextPieces pieces={state.nextPieces} />
      </div>
    </div>
  )
}
