'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'
import { useLanguage } from '@/contexts/LanguageContext'

const CELL = 20
const BOARD_BG = '#2a2d36'

export default function HoldPiece({ piece }: { piece: Piece | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { t } = useLanguage()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = BOARD_BG
    ctx.fillRect(0, 0, 80, 80)
    if (!piece) return
    const color = PIECE_COLORS[PIECE_ID[piece.type]]
    ctx.fillStyle = color
    const cells = getPieceCells(piece.type, 0, 0, 0)
    for (const { r, c } of cells) {
      ctx.fillRect(c * CELL + 1 + 10, r * CELL + 1 + 20, CELL - 2, CELL - 2)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(c * CELL + 1 + 10, r * CELL + 1 + 20, CELL - 2, 3)
      ctx.fillStyle = color
    }
  }, [piece])

  return (
    <div>
      <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{t('hold')}</p>
      <canvas ref={canvasRef} width={80} height={80} className="border border-[#3d4150]" style={{ borderRadius: '2px' }} />
    </div>
  )
}
