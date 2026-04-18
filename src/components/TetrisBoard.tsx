'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'

const CELL = 30
const MINI_CELL = 12
const BOARD_BG = '#2a2d36'
const GRID_COLOR = '#353840'

type Props = {
  board: number[][]
  currentPiece?: Piece
  ghostY?: number
  mini?: boolean
  flashRows?: number[]
}

function drawCell(ctx: CanvasRenderingContext2D, c: number, r: number, colorHex: string, cellSize: number) {
  ctx.fillStyle = colorHex
  ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2)
  // subtle inner highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, 3)
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
    ctx.fillStyle = BOARD_BG
    ctx.fillRect(0, 0, width, height)

    // Grid lines
    ctx.strokeStyle = GRID_COLOR
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
          drawCell(ctx, c, r, PIECE_COLORS[id], cellSize)
        }
      }
    }

    if (!mini && currentPiece) {
      const color = PIECE_COLORS[PIECE_ID[currentPiece.type]]

      // Ghost piece
      if (ghostY !== undefined) {
        ctx.globalAlpha = 0.25
        const ghostCells = getPieceCells(currentPiece.type, currentPiece.rotation, currentPiece.x, ghostY)
        for (const { r, c } of ghostCells) {
          if (r >= 0) drawCell(ctx, c, r, color, cellSize)
        }
        ctx.globalAlpha = 1
      }

      // Current piece
      const cells = getPieceCells(currentPiece.type, currentPiece.rotation, currentPiece.x, currentPiece.y)
      for (const { r, c } of cells) {
        if (r >= 0) drawCell(ctx, c, r, color, cellSize)
      }
    }
  }, [board, currentPiece, ghostY, mini, flashRows, cellSize, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-[#3d4150]"
      style={{ borderRadius: '2px' }}
    />
  )
}
