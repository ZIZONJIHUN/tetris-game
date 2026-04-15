'use client'
import TetrisBoard from './TetrisBoard'
import { BroadcastGameState } from '@/game/types'

type Props = {
  state: BroadcastGameState | null
  nickname: string
  isConnected: boolean
}

export default function OpponentMini({ state, nickname, isConnected }: Props) {
  const emptyBoard = Array.from({ length: 20 }, () => Array(10).fill(0))

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-500'}`}
          style={isConnected ? { boxShadow: '0 0 6px #4ade80' } : {}}
        />
        <p className="text-orange-400 text-sm font-bold tracking-wider"
          style={{ textShadow: '0 0 6px #ff6600' }}>
          {nickname}
        </p>
      </div>
      <TetrisBoard board={state?.board ?? emptyBoard} mini />
      {state && (
        <div className="text-center">
          <p className="text-orange-400 text-sm tabular-nums"
            style={{ textShadow: '0 0 6px #ff6600' }}>
            {state.score.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">Lv.{state.level}</p>
        </div>
      )}
      {!isConnected && (
        <p className="text-gray-600 text-xs">Waiting...</p>
      )}
    </div>
  )
}
