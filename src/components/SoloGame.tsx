'use client'
import { useGame } from '@/hooks/useGame'
import { useKeyboard } from '@/hooks/useKeyboard'
import TetrisBoard from './TetrisBoard'
import HoldPiece from './HoldPiece'
import NextPieces from './NextPieces'

export default function SoloGame() {
  const { state, actions } = useGame()
  useKeyboard(actions, state.status === 'playing')

  return (
    <div className="flex items-start gap-6 justify-center">
      {/* Left panel */}
      <div className="flex flex-col gap-4 w-24">
        <HoldPiece piece={state.holdPiece} />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Score</p>
          <p className="text-cyan-400 font-bold text-xl tabular-nums" style={{ textShadow: '0 0 8px #00f5ff' }}>
            {state.score.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Level</p>
          <p className="text-purple-400 font-bold text-lg">{state.level}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Lines</p>
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
              START
            </button>
          </div>
        )}
        {state.status === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
            <p className="text-red-400 font-bold text-2xl" style={{ textShadow: '0 0 10px #ff3333' }}>
              GAME OVER
            </p>
            <p className="text-gray-300">Score: {state.score.toLocaleString()}</p>
            <button
              onClick={actions.reset}
              className="px-6 py-2 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition"
            >
              RETRY
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
