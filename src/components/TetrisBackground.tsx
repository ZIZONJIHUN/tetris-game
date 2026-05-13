'use client'
import { useEffect, useRef } from 'react'
import { PIECE_MATRICES, PIECE_COLORS, PIECE_ID } from '@/game/pieces'
import type { PieceType } from '@/game/types'

const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
const CELL = 26
const COUNT = 14

type Block = {
  type: PieceType
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  alpha: number
}

function spawn(w: number, h: number): Block {
  const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)]
  const angle = Math.random() * Math.PI * 2
  const speed = 6 + Math.random() * 14
  return {
    type,
    x: Math.random() * w,
    y: Math.random() * h,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    alpha: 0.08 + Math.random() * 0.12,
  }
}

export default function TetrisBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let dpr = window.devicePixelRatio || 1
    let w = 0
    let h = 0
    let blocks: Block[] = []

    const resize = () => {
      dpr = window.devicePixelRatio || 1
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    blocks = Array.from({ length: COUNT }, () => spawn(w, h))

    let raf = 0
    let last = performance.now()
    let running = true

    const tick = (now: number) => {
      if (!running) return
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      ctx.clearRect(0, 0, w, h)

      const margin = CELL * 5
      for (const b of blocks) {
        b.x += b.vx * dt
        b.y += b.vy * dt
        b.rot += b.vr * dt

        if (b.x < -margin) b.x = w + margin
        if (b.x > w + margin) b.x = -margin
        if (b.y < -margin) b.y = h + margin
        if (b.y > h + margin) b.y = -margin

        const matrix = PIECE_MATRICES[b.type][0]
        const color = PIECE_COLORS[PIECE_ID[b.type]]

        ctx.save()
        ctx.translate(b.x, b.y)
        ctx.rotate(b.rot)
        ctx.globalAlpha = b.alpha
        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = 16
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (matrix[r][c]) {
              const px = (c - 2) * CELL
              const py = (r - 2) * CELL
              ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2)
            }
          }
        }
        ctx.restore()
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    />
  )
}
