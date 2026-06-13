'use client'
import { useEffect, useState } from 'react'

export type BoardEffect =
  | { kind: 'tetris' }
  | { kind: 'combo'; count: number }
  | { kind: 'perfect' }

export default function BoardEffects({ effect }: { effect: BoardEffect | null }) {
  const [show, setShow] = useState<BoardEffect | null>(null)

  useEffect(() => {
    if (!effect) return
    setShow(effect)
    const id = setTimeout(() => setShow(null), 900)
    return () => clearTimeout(id)
  }, [effect])

  if (!show) return null

  const text =
    show.kind === 'tetris' ? 'TETRIS!'
    : show.kind === 'combo' ? `${show.count} COMBO!`
    : 'PERFECT CLEAR'
  const color =
    show.kind === 'tetris' ? '#00f5ff'
    : show.kind === 'combo' ? '#ff00ff'
    : '#ffd700'

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
      <span
        className="font-bold text-4xl tracking-widest animate-pulse"
        style={{ color, textShadow: `0 0 20px ${color}, 0 0 40px ${color}` }}
      >
        {text}
      </span>
      {show.kind === 'perfect' && (
        <div className="absolute inset-0 bg-white animate-[flash_300ms_ease-out_forwards]" style={{ opacity: 0.3 }} />
      )}
    </div>
  )
}
