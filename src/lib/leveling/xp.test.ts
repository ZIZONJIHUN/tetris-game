import { calculateXpGain, levelFromXp, xpToNext, totalXpFor, tierForLevel } from './xp'
import { GameEndStats } from './types'

describe('xpToNext', () => {
  it('returns 50×L² for the gap from L to L+1', () => {
    expect(xpToNext(1)).toBe(50)
    expect(xpToNext(2)).toBe(200)
    expect(xpToNext(10)).toBe(5000)
    expect(xpToNext(20)).toBe(20000)
  })
})

describe('totalXpFor', () => {
  it('returns cumulative XP required to reach level L', () => {
    expect(totalXpFor(1)).toBe(0)
    expect(totalXpFor(2)).toBe(50)
    expect(totalXpFor(11)).toBe(19250)  // sum of 50×n² for n=1..10
    expect(totalXpFor(21)).toBe(143500)
  })
})

describe('levelFromXp', () => {
  it('returns 1 for 0 XP', () => {
    expect(levelFromXp(0)).toBe(1)
  })
  it('returns the highest L such that totalXpFor(L) <= xp', () => {
    expect(levelFromXp(49)).toBe(1)
    expect(levelFromXp(50)).toBe(2)
    expect(levelFromXp(249)).toBe(2)
    expect(levelFromXp(250)).toBe(3)
    expect(levelFromXp(19249)).toBe(10)
    expect(levelFromXp(19250)).toBe(11)
  })
  it('caps at MAX_LEVEL (50)', () => {
    expect(levelFromXp(999999999)).toBe(50)
  })
})

describe('tierForLevel', () => {
  it.each([
    [1, 'Bronze'], [10, 'Bronze'],
    [11, 'Silver'], [20, 'Silver'],
    [21, 'Gold'], [30, 'Gold'],
    [31, 'Platinum'], [40, 'Platinum'],
    [41, 'Diamond'], [50, 'Diamond'],
  ])('level %i → %s', (level, tier) => {
    expect(tierForLevel(level)).toBe(tier)
  })
})

describe('calculateXpGain', () => {
  const baseStats: GameEndStats = {
    mode: 'solo',
    myScore: 12000,
    opponentScore: null,
    totalLines: 30,
    tetrisCount: 2,
    maxCombo: 5,
    perfectClears: 1,
  }

  it('solo example: 12000 score + 2 tetris + 5 combo + 1 perfect = 1560 XP', () => {
    const result = calculateXpGain(baseStats, { isPersonalBest: false, isWin: false, winStreak: 0 })
    // base 1200 + tetris 100 + combo (5-2)*20=60 + perfect 200 = 1560
    expect(result.total).toBe(1560)
    expect(result.breakdown.base).toBe(1200)
    expect(result.breakdown.tetris).toBe(100)
    expect(result.breakdown.combo).toBe(60)
    expect(result.breakdown.perfect).toBe(200)
  })

  it('battle example: win + personal best + 3-win streak adds bonuses', () => {
    const stats: GameEndStats = {
      mode: 'battle',
      myScore: 25000,
      opponentScore: 18000,
      totalLines: 50,
      tetrisCount: 3,
      maxCombo: 8,
      perfectClears: 0,
    }
    const result = calculateXpGain(stats, { isPersonalBest: true, isWin: true, winStreak: 3 })
    // base 2500 + tetris 150 + combo (8-2)*20=120 + perfect 0
    //   + personalBest 300 + win 200 + winStreak(3) 200 = 3470
    expect(result.total).toBe(3470)
    expect(result.breakdown.personalBest).toBe(300)
    expect(result.breakdown.win).toBe(200)
    expect(result.breakdown.winStreak).toBe(200)
  })

  it('combo below 3 grants no combo bonus', () => {
    const stats = { ...baseStats, maxCombo: 2, perfectClears: 0, tetrisCount: 0 }
    const result = calculateXpGain(stats, { isPersonalBest: false, isWin: false, winStreak: 0 })
    expect(result.breakdown.combo).toBe(0)
  })

  it('win streak tiers: 2→100, 3→200, 4→200, 5→500, 10→500', () => {
    const stats = { ...baseStats, mode: 'battle' as const, opponentScore: 5000 }
    const opts = { isPersonalBest: false, isWin: true }
    expect(calculateXpGain(stats, { ...opts, winStreak: 1 }).breakdown.winStreak).toBe(0)
    expect(calculateXpGain(stats, { ...opts, winStreak: 2 }).breakdown.winStreak).toBe(100)
    expect(calculateXpGain(stats, { ...opts, winStreak: 3 }).breakdown.winStreak).toBe(200)
    expect(calculateXpGain(stats, { ...opts, winStreak: 4 }).breakdown.winStreak).toBe(200)
    expect(calculateXpGain(stats, { ...opts, winStreak: 5 }).breakdown.winStreak).toBe(500)
    expect(calculateXpGain(stats, { ...opts, winStreak: 10 }).breakdown.winStreak).toBe(500)
  })

  it('solo never grants win or winStreak bonus', () => {
    // even if caller incorrectly passes isWin=true for solo, function ignores it
    const result = calculateXpGain(baseStats, { isPersonalBest: false, isWin: true, winStreak: 5 })
    expect(result.breakdown.win).toBe(0)
    expect(result.breakdown.winStreak).toBe(0)
  })
})
