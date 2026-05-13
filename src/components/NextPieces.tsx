'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'
import { useLanguage } from '@/contexts/LanguageContext'
import { getCellSize, getCanvasSize, type Tier } from '@/lib/tierSizes'

type Props = {
  pieces: Piece[]
  tier?: Tier
}

export default function NextPieces({ pieces, tier = 'md' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { t } = useLanguage()
  const cell = getCellSize(tier).next
  const { width, height } = getCanvasSize(tier).next
  // 슬롯 높이 = height/3 (3개 슬롯)
  const slotH = height / 3

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, width, height)
    pieces.slice(0, 3).forEach((piece, i) => {
      const color = PIECE_COLORS[PIECE_ID[piece.type]]
      ctx.fillStyle = color
      ctx.shadowBlur = 4
      ctx.shadowColor = color
      const cells = getPieceCells(piece.type, 0, 0, 0)
      const offsetX = (width - cell * 4) / 2
      const offsetY = (slotH - cell * 4) / 2
      for (const { r, c } of cells) {
        ctx.fillRect(
          c * cell + 1 + offsetX,
          r * cell + 1 + i * slotH + offsetY,
          cell - 2,
          cell - 2,
        )
      }
      ctx.shadowBlur = 0
    })
  }, [pieces, cell, width, height, slotH])

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t('next')}</p>
      <canvas ref={canvasRef} width={width} height={height} className="border border-cyan-500/20" />
    </div>
  )
}
