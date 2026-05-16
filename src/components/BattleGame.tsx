'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBattle } from '@/hooks/useBattle'
import { useKeyboard } from '@/hooks/useKeyboard'
import TetrisBoard from './TetrisBoard'
import HoldPiece from './HoldPiece'
import NextPieces from './NextPieces'
import OpponentMini from './OpponentMini'
import { createClient } from '@/lib/supabase/client'
import { useViewportTier } from '@/hooks/useViewportTier'
import { useLanguage } from '@/contexts/LanguageContext'
import { getPanelWidth } from '@/lib/tierSizes'

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
    myNickname, opponentNickname, opponentConnected,
    opponentState, result,
  } = useBattle(roomId)

  useKeyboard(actions, phase === 'playing')
  const tier = useViewportTier()
  const { t } = useLanguage()
  const panelW = getPanelWidth(tier)

  // 결과 저장 (로그인 유저만)
  useEffect(() => {
    if (!result) return
    const saveResult = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('is_guest').eq('id', user.id).single()
      if (profile?.is_guest) return

      await supabase.from('game_results').insert({
        room_id: roomId,
        player_id: user.id,
        my_score: result.myScore,
        opponent_score: result.opponentScore,
        is_win: result.isWin ?? false,
      })
    }
    saveResult()
  }, [result, roomId])

  return (
    <div className="flex items-start gap-3 justify-center">
      {/* 좌측 패널 */}
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

      {/* 내 보드 */}
      <div className="relative">
        <TetrisBoard
          board={gameState.board}
          currentPiece={gameState.currentPiece}
          ghostY={gameState.ghostY}
          flashRows={gameState.flashRows}
          tier={tier}
        />
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
        {phase === 'over' && result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-4">
            <p
              className={`text-3xl font-bold ${
                result.isWin === true ? 'text-cyan-400' :
                result.isWin === false ? 'text-red-400' : 'text-yellow-400'
              }`}
              style={{
                textShadow: result.isWin === true ? '0 0 15px #00f5ff'
                  : result.isWin === false ? '0 0 15px #ff3333'
                  : '0 0 15px #ffe600',
              }}
            >
              {result.isWin === true ? t('win') : result.isWin === false ? t('lose') : t('draw')}
            </p>
            <p className="text-gray-300 text-sm">{t('score')}: {result.myScore.toLocaleString()}</p>
            <p className="text-gray-300 text-sm">{t('opponent')}: {result.opponentScore.toLocaleString()}</p>
            <button
              onClick={() => router.push('/lobby')}
              className="mt-2 px-6 py-2 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition text-sm"
            >
              {t('backToLobby')}
            </button>
          </div>
        )}
      </div>

      {/* NEXT */}
      <div style={{ width: panelW }}>
        <NextPieces pieces={gameState.nextPieces} tier={tier} />
      </div>

      {/* 디바이더 */}
      <div className="w-px self-stretch bg-[#1a1a2e]" />

      {/* 상대방 rail */}
      <div className="flex flex-col items-center" style={{ width: panelW + 16 }}>
        <p className="text-[10px] text-red-500 uppercase tracking-widest mb-2">{t('opponent')}</p>
        <OpponentMini
          state={opponentState}
          nickname={opponentNickname || t('opponent')}
          isConnected={opponentConnected}
          tier={tier}
        />
      </div>
    </div>
  )
}
