import { GameEndStats } from './types'

export type AchievementSnapshot = {
  xp: number
  level: number
  totalGames: number
  totalWins: number
  totalTetrises: number
  totalPerfects: number
  maxComboEver: number
  bestScore: number
  alreadyEarned: Set<string>
  winStreak: number
}

export type AchievementDef = {
  id: string
  check: (stats: GameEndStats, snap: AchievementSnapshot) => boolean
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Milestone (5)
  { id: 'first_game',    check: (_s, snap) => snap.totalGames >= 1 },
  { id: 'first_win',     check: (s, snap)  => s.mode === 'battle' && snap.totalWins >= 1 },
  { id: 'first_tetris',  check: (s)        => s.tetrisCount >= 1 },
  { id: 'first_perfect', check: (s)        => s.perfectClears >= 1 },
  { id: 'first_combo_5', check: (s)        => s.maxCombo >= 5 },

  // Skill (10) — per-game thresholds
  { id: 'score_10k',      check: (s) => s.myScore >= 10_000 },
  { id: 'score_50k',      check: (s) => s.myScore >= 50_000 },
  { id: 'score_100k',     check: (s) => s.myScore >= 100_000 },
  { id: 'tetris_double',  check: (s) => s.tetrisCount >= 2 },
  { id: 'tetris_quad',    check: (s) => s.tetrisCount >= 4 },
  { id: 'combo_10',       check: (s) => s.maxCombo >= 10 },
  { id: 'combo_15',       check: (s) => s.maxCombo >= 15 },
  { id: 'perfect_triple', check: (s) => s.perfectClears >= 3 },
  { id: 'win_streak_5',   check: (_s, snap) => snap.winStreak >= 5 },
  { id: 'win_streak_10',  check: (_s, snap) => snap.winStreak >= 10 },

  // Cumulative (10) — totals after this game
  { id: 'games_10',     check: (_s, snap) => snap.totalGames >= 10 },
  { id: 'games_100',    check: (_s, snap) => snap.totalGames >= 100 },
  { id: 'games_500',    check: (_s, snap) => snap.totalGames >= 500 },
  { id: 'wins_10',      check: (_s, snap) => snap.totalWins >= 10 },
  { id: 'wins_50',      check: (_s, snap) => snap.totalWins >= 50 },
  { id: 'wins_100',     check: (_s, snap) => snap.totalWins >= 100 },
  { id: 'tetrises_50',  check: (_s, snap) => snap.totalTetrises >= 50 },
  { id: 'tetrises_500', check: (_s, snap) => snap.totalTetrises >= 500 },
  { id: 'level_10',     check: (_s, snap) => snap.level >= 10 },
  { id: 'level_25',     check: (_s, snap) => snap.level >= 25 },
]

export type UnlockedAchievement = { id: string }

export function checkAchievements(
  stats: GameEndStats,
  snap: AchievementSnapshot,
): UnlockedAchievement[] {
  return ACHIEVEMENT_DEFS
    .filter(def => !snap.alreadyEarned.has(def.id) && def.check(stats, snap))
    .map(def => ({ id: def.id }))
}
