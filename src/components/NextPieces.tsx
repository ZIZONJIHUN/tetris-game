'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'

const CELL = 16
const SLOT_H = 60

export default function NextPieces({ pieces }: { pieces: Piece[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, 80, SLOT_H * 3)
    pieces.slice(0, 3).forEach((piece, i) => {
      const color = PIECE_COLORS[PIECE_ID[piece.type]]
      ctx.fillStyle = color
      ctx.shadowBlur = 4
      ctx.shadowColor = color
      const cells = getPieceCells(piece.type, 0, 0, 0)
      for (const { r, c } of cells) {
        ctx.fillRect(c * CELL + 1 + 8, r * CELL + 1 + i * SLOT_H + 8, CELL - 2, CELL - 2)
      }
      ctx.shadowBlur = 0
    })
  }, [pieces])

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Next</p>
      <canvas ref={canvasRef} width={80} height={SLOT_H * 3} className="border border-cyan-500/20" />
    </div>
  )
}
