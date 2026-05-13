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
    if (state.status === 'idle') {
      setIsNewBest(false)
    }
    prevStatus.current = state.status
  }, [state.status, state.score])

  return (
    <div className="flex items-start gap-6 justify-center">
      {/* Left panel */}
      <div className="flex flex-col gap-4 w-24">
        <HoldPiece piece={state.holdPiece} />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">{t('score')}</p>
          <p className="text-cyan-400 font-bold text-xl tabular-nums" style={{ textShadow: '0 0 8px #00f5ff' }}>
            {state.score.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">{t('bestScore')}</p>
          <p className="text-yellow-500 font-bold text-base tabular-nums">
            {bestScore.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">{t('level')}</p>
          <p className="text-purple-400 font-bold text-lg">{state.level}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">{t('lines')}</p>
          <p className="text-gray-300 font-bold text-lg">{state.lines}</p>
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

      {/* Right panel */}
      <div className="w-24">
        <NextPieces pieces={state.nextPieces} />
      </div>
    </div>
  )
}
