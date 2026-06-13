import { checkAchievements, ACHIEVEMENT_DEFS } from './achievements'
import { GameEndStats } from './types'

const baseStats: GameEndStats = {
  mode: 'solo',
  myScore: 0,
  opponentScore: null,
  totalLines: 0,
  tetrisCount: 0,
  maxCombo: 0,
  perfectClears: 0,
}

const baseSnapshot = {
  xp: 0,
  level: 1,
  totalGames: 0,
  totalWins: 0,
  totalTetrises: 0,
  totalPerfects: 0,
  maxComboEver: 0,
  bestScore: 0,
  alreadyEarned: new Set<string>(),
  winStreak: 0,
}

describe('checkAchievements', () => {
  it('catalog has exactly 25 achievements', () => {
    expect(ACHIEVEMENT_DEFS.length).toBe(25)
  })

  it('first_game triggers on the first finished game', () => {
    const unlocked = checkAchievements(
      { ...baseStats, myScore: 100 },
      { ...baseSnapshot, totalGames: 1 },  // post-update snapshot
    )
    expect(unlocked.map(a => a.id)).toContain('first_game')
  })

  it('first_tetris triggers when tetrisCount >= 1 in this game', () => {
    const unlocked = checkAchievements(
      { ...baseStats, tetrisCount: 1 },
      { ...baseSnapshot, totalGames: 1, totalTetrises: 1 },
    )
    expect(unlocked.map(a => a.id)).toContain('first_tetris')
  })

  it('does not re-trigger an already-earned achievement', () => {
    const unlocked = checkAchievements(
      { ...baseStats, tetrisCount: 1 },
      { ...baseSnapshot, totalGames: 1, totalTetrises: 1, alreadyEarned: new Set(['first_tetris', 'first_game']) },
    )
    expect(unlocked.map(a => a.id)).not.toContain('first_tetris')
    expect(unlocked.map(a => a.id)).not.toContain('first_game')
  })

  it('score_10k triggers when myScore >= 10000', () => {
    const unlocked = checkAchievements(
      { ...baseStats, myScore: 10000 },
      { ...baseSnapshot, totalGames: 1 },
    )
    expect(unlocked.map(a => a.id)).toContain('score_10k')
  })

  it('combo_10 triggers when maxCombo >= 10', () => {
    const unlocked = checkAchievements(
      { ...baseStats, maxCombo: 10 },
      { ...baseSnapshot, totalGames: 1, maxComboEver: 10 },
    )
    expect(unlocked.map(a => a.id)).toContain('combo_10')
  })

  it('wins_100 triggers when totalWins crosses 100', () => {
    const unlocked = checkAchievements(
      { ...baseStats, mode: 'battle', myScore: 5000, opponentScore: 1000 },
      { ...baseSnapshot, totalGames: 200, totalWins: 100 },
    )
    expect(unlocked.map(a => a.id)).toContain('wins_100')
  })

  it('level_10 triggers when level reaches 10', () => {
    const unlocked = checkAchievements(
      { ...baseStats, myScore: 50000 },
      { ...baseSnapshot, totalGames: 1, level: 10, xp: 20000 },
    )
    expect(unlocked.map(a => a.id)).toContain('level_10')
  })

  it('win_streak_5 triggers when winStreak reaches 5', () => {
    const unlocked = checkAchievements(
      { ...baseStats, mode: 'battle', myScore: 5000, opponentScore: 1000 },
      { ...baseSnapshot, totalGames: 5, totalWins: 5, winStreak: 5 },
    )
    expect(unlocked.map(a => a.id)).toContain('win_streak_5')
  })
})
