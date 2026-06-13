// src/components/SoloGame.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useViewportTier } from '@/hooks/useViewportTier'
import TetrisBoard from './TetrisBoard'
import BoardEffects, { BoardEffect } from './BoardEffects'
import HoldPiece from './HoldPiece'
import NextPieces from './NextPieces'
import GameEndModal from './GameEndModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { getPanelWidth } from '@/lib/tierSizes'
import { finalizeGame, FinalizeGameResult } from '@/lib/leveling/finalize'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/contexts/UserProfileContext'

export default function SoloGame() {
  const { state, actions } = useGame()
  const { t } = useLanguage()
  const tier = useViewportTier()
  const { profile } = useUserProfile()
  useKeyboard(actions, state.status === 'playing')
  const router = useRouter()

  const [finalizing, setFinalizing] = useState(false)
  const [finalizeResult, setFinalizeResult] = useState<FinalizeGameResult | null>(null)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const prevStatus = useRef(state.status)

  const [effect, setEffect] = useState<BoardEffect | null>(null)
  const prevStats = useRef({ tetrisCount: 0, perfectClears: 0, maxCombo: 0 })

  useEffect(() => {
    const p = prevStats.current
    if (state.tetrisCount > p.tetrisCount) setEffect({ kind: 'tetris' })
    else if (state.perfectClears > p.perfectClears) setEffect({ kind: 'perfect' })
    else if (state.maxCombo >= 5 && state.maxCombo > p.maxCombo) setEffect({ kind: 'combo', count: state.maxCombo })
    prevStats.current = { tetrisCount: state.tetrisCount, perfectClears: state.perfectClears, maxCombo: state.maxCombo }
  }, [state.tetrisCount, state.perfectClears, state.maxCombo])

  useEffect(() => {
    if (prevStatus.current === 'playing' && state.status === 'over') {
      setFinalizing(true)
      setFinalizeResult(null)
      setFinalizeError(null)
      const roomId = `solo:${crypto.randomUUID()}`
      finalizeGame(
        {
          mode: 'solo',
          myScore: state.score,
          opponentScore: null,
          totalLines: state.lines,
          tetrisCount: state.tetrisCount,
          maxCombo: state.maxCombo,
          perfectClears: state.perfectClears,
        },
        roomId,
        null,
      )
        .then(res => { setFinalizeResult(res); setFinalizing(false) })
        .catch(err => { setFinalizeError(err.message ?? String(err)); setFinalizing(false) })
    }
    prevStatus.current = state.status
  }, [state.status, state.score, state.lines, state.tetrisCount, state.maxCombo, state.perfectClears])

  const panelW = getPanelWidth(tier)

  return (
    <div className="flex items-start gap-3 justify-center">
      <div className="flex flex-col gap-3" style={{ width: panelW }}>
        <HoldPiece piece={state.holdPiece} tier={tier} />
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('score')}</p>
          <p className="text-cyan-400 font-bold text-lg tabular-nums" style={{ textShadow: '0 0 8px #00f5ff' }}>
            {state.score.toLocaleString()}
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

      <div className="relative">
        <TetrisBoard
          board={state.board}
          currentPiece={state.currentPiece}
          ghostY={state.ghostY}
          flashRows={state.flashRows}
          tier={tier}
          skin={profile?.activeSkin ?? null}
        />
        <BoardEffects effect={effect} />
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
          <GameEndModal
            result={finalizeResult}
            loading={finalizing}
            error={finalizeError}
            onRetry={() => {
              setFinalizeResult(null)
              setFinalizing(false)
              setFinalizeError(null)
              actions.reset()
            }}
            onExit={() => router.push('/menu')}
          />
        )}
      </div>

      <div style={{ width: panelW }}>
        <NextPieces pieces={state.nextPieces} tier={tier} />
      </div>
    </div>
  )
}
