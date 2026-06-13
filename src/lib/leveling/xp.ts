import { GameEndStats, Tier, XpBreakdown, MAX_LEVEL, XP_COEFFICIENT } from './types'

export function xpToNext(level: number): number {
  return XP_COEFFICIENT * level * level
}

export function totalXpFor(level: number): number {
  if (level <= 1) return 0
  const n = level - 1
  return (XP_COEFFICIENT * n * (n + 1) * (2 * n + 1)) / 6
}

export function levelFromXp(xp: number): number {
  let lo = 1
  let hi = MAX_LEVEL
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (totalXpFor(mid) <= xp) lo = mid
    else hi = mid - 1
  }
  return lo
}

export function tierForLevel(level: number): Tier {
  if (level <= 10) return 'Bronze'
  if (level <= 20) return 'Silver'
  if (level <= 30) return 'Gold'
  if (level <= 40) return 'Platinum'
  return 'Diamond'
}

export type XpContext = {
  isPersonalBest: boolean
  isWin: boolean
  winStreak: number
}

export type XpGainResult = {
  total: number
  breakdown: Omit<XpBreakdown, 'achievementBonus'>
}

function winStreakBonus(streak: number): number {
  if (streak >= 5) return 500
  if (streak >= 3) return 200
  if (streak >= 2) return 100
  return 0
}

export function calculateXpGain(stats: GameEndStats, ctx: XpContext): XpGainResult {
  const isBattle = stats.mode === 'battle'
  const base = Math.floor(stats.myScore / 10)
  const tetris = stats.tetrisCount * 50
  const combo = Math.max(0, stats.maxCombo - 2) * 20
  const perfect = stats.perfectClears * 200
  const personalBest = ctx.isPersonalBest ? 300 : 0
  const win = isBattle && ctx.isWin ? 200 : 0
  const winStreak = isBattle ? winStreakBonus(ctx.winStreak) : 0

  return {
    total: base + tetris + combo + perfect + personalBest + win + winStreak,
    breakdown: { base, tetris, combo, perfect, personalBest, win, winStreak },
  }
}
