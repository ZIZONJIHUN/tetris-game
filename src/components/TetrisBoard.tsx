'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'

const CELL = 30
const MINI_CELL = 12

type Props = {
  board: number[][]
  currentPiece?: Piece
  ghostY?: number
  mini?: boolean
  flashRows?: number[]
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  c: number,
  r: number,
  colorHex: string,
  cellSize: number,
  glow = true,
) {
  ctx.fillStyle = colorHex
  if (glow) {
    ctx.shadowBlur = 8
    ctx.shadowColor = colorHex
  }
  ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2)
  ctx.shadowBlur = 0
}

export default function TetrisBoard({
  board, currentPiece, ghostY, mini = false, flashRows = [],
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cellSize = mini ? MINI_CELL : CELL
  const width = 10 * cellSize
  const height = 20 * cellSize

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // Background
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, width, height)

    // Grid lines
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 0.5
    for (let r = 0; r <= 20; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * cellSize); ctx.lineTo(width, r * cellSize); ctx.stroke()
    }
    for (let c = 0; c <= 10; c++) {
      ctx.beginPath(); ctx.moveTo(c * cellSize, 0); ctx.lineTo(c * cellSize, height); ctx.stroke()
    }

    // Board blocks
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 10; c++) {
        const id = board[r][c]
        if (!id) continue
        if (flashRows.includes(r)) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2)
        } else {
          drawCell(ctx, c, r, PIECE_COLORS[id], cellSize, !mini)
        }
      }
    }

    // Ghost piece and current piece (only in normal mode)
    if (!mini && currentPiece) {
      const color = PIECE_COLORS[PIECE_ID[currentPiece.type]]

      // Ghost piece (20% opacity)
      if (ghostY !== undefined) {
        ctx.globalAlpha = 0.2
        const ghostCells = getPieceCells(currentPiece.type, currentPiece.rotation, currentPiece.x, ghostY)
        for (const { r, c } of ghostCells) {
          if (r >= 0) drawCell(ctx, c, r, color, cellSize, false)
        }
        ctx.globalAlpha = 1
      }

      // Current piece
      const cells = getPieceCells(currentPiece.type, currentPiece.rotation, currentPiece.x, currentPiece.y)
      for (const { r, c } of cells) {
        if (r >= 0) drawCell(ctx, c, r, color, cellSize, true)
      }
    }
  }, [board, currentPiece, ghostY, mini, flashRows, cellSize, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-cyan-500/30"
      style={{ boxShadow: mini ? 'none' : '0 0 20px rgba(0,245,255,0.1)' }}
    />
  )
}
