'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'
import { useLanguage } from '@/contexts/LanguageContext'

const CELL = 16
const SLOT_H = 60
const BOARD_BG = '#2a2d36'

export default function NextPieces({ pieces }: { pieces: Piece[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { t } = useLanguage()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = BOARD_BG
    ctx.fillRect(0, 0, 80, SLOT_H * 3)
    pieces.slice(0, 3).forEach((piece, i) => {
      const color = PIECE_COLORS[PIECE_ID[piece.type]]
      const cells = getPieceCells(piece.type, 0, 0, 0)
      for (const { r, c } of cells) {
        ctx.fillStyle = color
        ctx.fillRect(c * CELL + 1 + 8, r * CELL + 1 + i * SLOT_H + 8, CELL - 2, CELL - 2)
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fillRect(c * CELL + 1 + 8, r * CELL + 1 + i * SLOT_H + 8, CELL - 2, 3)
      }
    })
  }, [pieces])

  return (
    <div>
      <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{t('next')}</p>
      <canvas ref={canvasRef} width={80} height={SLOT_H * 3} className="border border-[#3d4150]" style={{ borderRadius: '2px' }} />
    </div>
  )
}
