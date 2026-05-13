'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'
import { useLanguage } from '@/contexts/LanguageContext'

const CELL = 20

export default function HoldPiece({ piece }: { piece: Piece | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { t } = useLanguage()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, 80, 80)
    if (!piece) return
    const color = PIECE_COLORS[PIECE_ID[piece.type]]
    const cells = getPieceCells(piece.type, 0, 0, 0)
    ctx.fillStyle = color
    ctx.shadowBlur = 6
    ctx.shadowColor = color
    for (const { r, c } of cells) {
      ctx.fillRect(c * CELL + 1 + 10, r * CELL + 1 + 20, CELL - 2, CELL - 2)
    }
    ctx.shadowBlur = 0
  }, [piece])

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t('hold')}</p>
      <canvas ref={canvasRef} width={80} height={80} className="border border-cyan-500/20" />
    </div>
  )
}
