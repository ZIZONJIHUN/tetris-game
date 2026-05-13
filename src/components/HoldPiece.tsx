'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'
import { useLanguage } from '@/contexts/LanguageContext'
import { getCellSize, getCanvasSize, type Tier } from '@/lib/tierSizes'

type Props = {
  piece: Piece | null
  tier?: Tier
}

export default function HoldPiece({ piece, tier = 'md' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { t } = useLanguage()
  const cell = getCellSize(tier).hold
  const { width, height } = getCanvasSize(tier).hold

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, width, height)
    if (!piece) return
    const color = PIECE_COLORS[PIECE_ID[piece.type]]
    const cells = getPieceCells(piece.type, 0, 0, 0)
    ctx.fillStyle = color
    ctx.shadowBlur = 6
    ctx.shadowColor = color
    // 중앙 정렬: 4×4 그리드 기준 piece 위치
    const offsetX = (width - cell * 4) / 2
    const offsetY = (height - cell * 4) / 2
    for (const { r, c } of cells) {
      ctx.fillRect(c * cell + 1 + offsetX, r * cell + 1 + offsetY, cell - 2, cell - 2)
    }
    ctx.shadowBlur = 0
  }, [piece, cell, width, height])

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t('hold')}</p>
      <canvas ref={canvasRef} width={width} height={height} className="border border-cyan-500/20" />
    </div>
  )
}
