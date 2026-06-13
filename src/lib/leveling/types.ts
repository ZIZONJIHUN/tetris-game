export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'

export type GameMode = 'solo' | 'battle'

export type GameEndStats = {
  mode: GameMode
  myScore: number
  opponentScore: number | null
  totalLines: number
  tetrisCount: number
  maxCombo: number
  perfectClears: number
}

export type XpBreakdown = {
  base: number
  tetris: number
  combo: number
  perfect: number
  personalBest: number
  win: number
  winStreak: number
  achievementBonus: number
}

export const MAX_LEVEL = 50
export const XP_COEFFICIENT = 50
