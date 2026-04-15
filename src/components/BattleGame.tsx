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
    <div className="flex items-start gap-6 justify-center">
      {/* 왼쪽 패널 */}
      <div className="flex flex-col gap-4 w-24">
        <HoldPiece piece={gameState.holdPiece} />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Score</p>
          <p className="text-cyan-400 font-bold text-xl tabular-nums"
            style={{ textShadow: '0 0 8px #00f5ff' }}>
            {gameState.score.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Time</p>
          <p className={`font-bold text-lg ${timeLeft < 30000 ? 'text-red-400' : 'text-yellow-400'}`}>
            {formatTime(timeLeft)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Level</p>
          <p className="text-purple-400 font-bold">{gameState.level}</p>
        </div>
        {myNickname && (
          <p className="text-cyan-400 text-xs truncate" style={{ textShadow: '0 0 4px #00f5ff' }}>
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
        />

        {/* 카운트다운 오버레이 */}
        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-8xl font-bold text-cyan-400"
              style={{ textShadow: '0 0 30px #00f5ff' }}>
              {countdown}
            </span>
          </div>
        )}

        {/* 대기 오버레이 */}
        {phase === 'waiting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
            <p className="text-cyan-400 tracking-widest text-sm">Waiting for opponent...</p>
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 결과 오버레이 */}
        {phase === 'over' && result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-4">
            <p className={`text-3xl font-bold ${
              result.isWin === true ? 'text-cyan-400' :
              result.isWin === false ? 'text-red-400' : 'text-yellow-400'
            }`} style={{
              textShadow: result.isWin === true ? '0 0 15px #00f5ff'
                : result.isWin === false ? '0 0 15px #ff3333'
                : '0 0 15px #ffe600'
            }}>
              {result.isWin === true ? 'WIN' : result.isWin === false ? 'LOSE' : 'DRAW'}
            </p>
            <p className="text-gray-300 text-sm">My: {result.myScore.toLocaleString()}</p>
            <p className="text-gray-300 text-sm">Opp: {result.opponentScore.toLocaleString()}</p>
            <button onClick={() => router.push('/lobby')}
              className="mt-2 px-6 py-2 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition text-sm">
              Back to Lobby
            </button>
          </div>
        )}
      </div>

      {/* 오른쪽 패널 */}
      <div className="flex flex-col gap-4">
        <NextPieces pieces={gameState.nextPieces} />
        <div className="mt-4">
          <OpponentMini
            state={opponentState}
            nickname={opponentNickname || 'Opponent'}
            isConnected={opponentConnected}
          />
        </div>
      </div>
    </div>
  )
}
