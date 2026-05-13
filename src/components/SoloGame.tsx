'use client'
import { useEffect, useRef, useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useViewportTier } from '@/hooks/useViewportTier'
import TetrisBoard from './TetrisBoard'
import HoldPiece from './HoldPiece'
import NextPieces from './NextPieces'
import { useLanguage } from '@/contexts/LanguageContext'
import { getPanelWidth } from '@/lib/tierSizes'

const BEST_SCORE_KEY = 'tetris_best_score'

export default function SoloGame() {
  const { state, actions } = useGame()
  const { t } = useLanguage()
  const tier = useViewportTier()
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

  const panelW = getPanelWidth(tier)

  return (
    <div className="flex items-start gap-3 justify-center">
      {/* 좌측 패널: HOLD + 통계 */}
      <div className="flex flex-col gap-3" style={{ width: panelW }}>
        <HoldPiece piece={state.holdPiece} tier={tier} />
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('score')}</p>
          <p
            className="text-cyan-400 font-bold text-lg tabular-nums"
            style={{ textShadow: '0 0 8px #00f5ff' }}
          >
            {state.score.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('bestScore')}</p>
          <p className="text-yellow-500 font-bold text-sm tabular-nums">
            {bestScore.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('level')}</p>
          <p className="text-purple-400 font-bold text-sm">{state.level}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('lines')}</p>
          <p className="text-gray-300 font-bold text-sm">{state.lines}</p>
        </div>
      </div>

      {/* 보드 */}
      <div className="relative">
        <TetrisBoard
          board={state.board}
          currentPiece={state.currentPiece}
          ghostY={state.ghostY}
          flashRows={state.flashRows}
          tier={tier}
        />
        {state.status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <button
              onClick={actions.start}
              className="px-8 py-3 bg-cyan-500/20 border border-cyan-500 text-cyan-400 font-bold text-lg hover:bg-cyan-500/40 transition"
              style={{ textShadow: '0 0 8px #00f5ff', boxShadow: '0 0 20px rgba(0,245,255,0.3)' }}
            >
              {t('start')}
            </button>
          </div>
        )}
        {state.status === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
            <p className="text-red-400 font-bold text-2xl" style={{ textShadow: '0 0 10px #ff3333' }}>
              {t('gameOver')}
            </p>
            {isNewBest && (
              <p className="text-yellow-400 font-bold text-sm" style={{ textShadow: '0 0 8px #ffd700' }}>
                {t('newBest')}
              </p>
            )}
            <p className="text-gray-300">{t('score')}: {state.score.toLocaleString()}</p>
            <button
              onClick={actions.reset}
              className="px-6 py-2 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition"
            >
              {t('retry')}
            </button>
          </div>
        )}
      </div>

      {/* 우측 패널: NEXT */}
      <div style={{ width: panelW }}>
        <NextPieces pieces={state.nextPieces} tier={tier} />
      </div>
    </div>
  )
}
