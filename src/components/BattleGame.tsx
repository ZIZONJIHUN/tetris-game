'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBattle } from '@/hooks/useBattle'
import { useKeyboard } from '@/hooks/useKeyboard'
import TetrisBoard from './TetrisBoard'
import BoardEffects, { BoardEffect } from './BoardEffects'
import HoldPiece from './HoldPiece'
import NextPieces from './NextPieces'
import OpponentMini from './OpponentMini'
import GameEndModal from './GameEndModal'
import { useViewportTier } from '@/hooks/useViewportTier'
import { useLanguage } from '@/contexts/LanguageContext'
import { getPanelWidth } from '@/lib/tierSizes'
import { useUserProfile } from '@/contexts/UserProfileContext'

function formatTime(ms: number) {
  const secs = Math.ceil(ms / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function BattleGame({ roomId }: { roomId: string }) {
  const router = useRouter()
  const {
    gameState, actions, phase, countdown, timeLeft,
    myNickname, opponentNickname, opponentConnected, opponentState, opponentId,
    finalizeResult, finalizing, finalizeError,
  } = useBattle(roomId)

  useKeyboard(actions, phase === 'playing')
  const tier = useViewportTier()
  const { t } = useLanguage()
  const panelW = getPanelWidth(tier)
  const { profile } = useUserProfile()

  const [effect, setEffect] = useState<BoardEffect | null>(null)
  const prevStats = useRef({ tetrisCount: 0, perfectClears: 0, maxCombo: 0 })

  useEffect(() => {
    const p = prevStats.current
    if (gameState.tetrisCount > p.tetrisCount) setEffect({ kind: 'tetris' })
    else if (gameState.perfectClears > p.perfectClears) setEffect({ kind: 'perfect' })
    else if (gameState.maxCombo >= 5 && gameState.maxCombo > p.maxCombo) setEffect({ kind: 'combo', count: gameState.maxCombo })
    prevStats.current = { tetrisCount: gameState.tetrisCount, perfectClears: gameState.perfectClears, maxCombo: gameState.maxCombo }
  }, [gameState.tetrisCount, gameState.perfectClears, gameState.maxCombo])

  return (
    <div className="flex items-start gap-3 justify-center">
      {/* Left panel */}
      <div className="flex flex-col gap-3" style={{ width: panelW }}>
        <HoldPiece piece={gameState.holdPiece} tier={tier} />
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('score')}</p>
          <p className="text-cyan-400 font-bold text-lg tabular-nums" style={{ textShadow: '0 0 8px #00f5ff' }}>
            {gameState.score.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('time')}</p>
          <p className={`font-bold text-sm tabular-nums ${timeLeft < 30000 ? 'text-red-400' : 'text-yellow-400'}`}>
            {formatTime(timeLeft)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('level')}</p>
          <p className="text-purple-400 font-bold text-sm">{gameState.level}</p>
        </div>
        {myNickname && (
          <p className="text-cyan-400 text-[11px] truncate" style={{ textShadow: '0 0 4px #00f5ff' }}>
            {myNickname}
          </p>
        )}
      </div>

      {/* My board */}
      <div className="relative">
        <TetrisBoard
          board={gameState.board}
          currentPiece={gameState.currentPiece}
          ghostY={gameState.ghostY}
          flashRows={gameState.flashRows}
          tier={tier}
          skin={profile?.activeSkin ?? null}
        />
        <BoardEffects effect={effect} />
        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-8xl font-bold text-cyan-400" style={{ textShadow: '0 0 30px #00f5ff' }}>
              {countdown}
            </span>
          </div>
        )}
        {phase === 'waiting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
            <p className="text-cyan-400 tracking-widest text-sm">{t('waitingOpponent')}</p>
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {phase === 'over' && (
          <GameEndModal
            result={finalizeResult}
            loading={finalizing}
            error={finalizeError}
            onRetry={() => router.push('/lobby')}
            onExit={() => router.push('/menu')}
          />
        )}
      </div>

      <div style={{ width: panelW }}>
        <NextPieces pieces={gameState.nextPieces} tier={tier} />
      </div>

      <div className="w-px self-stretch bg-[#1a1a2e]" />

      <div className="flex flex-col items-center" style={{ width: panelW + 16 }}>
        <p className="text-[10px] text-red-500 uppercase tracking-widest mb-2">{t('opponent')}</p>
        <OpponentMini
          state={opponentState}
          nickname={opponentNickname || t('opponent')}
          isConnected={opponentConnected}
          opponentId={opponentId || null}
          tier={tier}
        />
      </div>
    </div>
  )
}
