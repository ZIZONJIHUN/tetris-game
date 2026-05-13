export type Tier = 'sm' | 'md' | 'lg'

export type CanvasSize = {
  board: { width: number; height: number }
  hold:  { width: number; height: number }
  next:  { width: number; height: number }
}

export function getCellSize(tier: Tier): { board: number; hold: number; next: number } {
  switch (tier) {
    case 'sm': return { board: 24, hold: 16, next: 12 }
    case 'md': return { board: 32, hold: 20, next: 16 }
    case 'lg': return { board: 40, hold: 26, next: 20 }
    default: {
      const _exhaustive: never = tier
      throw new Error(`Unhandled tier: ${_exhaustive as string}`)
    }
  }
}

export function getPanelWidth(tier: Tier): number {
  switch (tier) {
    case 'sm': return 74
    case 'md': return 90
    case 'lg': return 112
    default: {
      const _exhaustive: never = tier
      throw new Error(`Unhandled tier: ${_exhaustive as string}`)
    }
  }
}

export function getCanvasSize(tier: Tier): CanvasSize {
  const cell = getCellSize(tier)
  return {
    board: { width: cell.board * 10, height: cell.board * 20 },
    hold:  { width: cell.hold * 4,   height: cell.hold * 4 },
    next:  { width: cell.next * 4,   height: cell.next * 10 },
  }
}
