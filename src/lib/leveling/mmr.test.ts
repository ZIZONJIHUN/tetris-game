import { calculateMmrDelta } from './mmr'

describe('calculateMmrDelta', () => {
  it('equal MMR, equal score → delta near 0', () => {
    const d = calculateMmrDelta({ myScore: 5000, oppScore: 5000, myMmr: 1200, oppMmr: 1200, mmrGames: 50 })
    expect(d).toBe(0)
  })

  it('equal MMR, double score win → positive delta around K/2', () => {
    const d = calculateMmrDelta({ myScore: 10000, oppScore: 5000, myMmr: 1200, oppMmr: 1200, mmrGames: 50 })
    // score_ratio = 5000/15000 = 0.333, actual = 0.667, expected = 0.5
    // delta = round(32 * (0.667 - 0.5)) = round(5.33) = 5
    expect(d).toBe(5)
  })

  it('equal MMR, total wipeout (opp scored 0) → near +K/2', () => {
    const d = calculateMmrDelta({ myScore: 10000, oppScore: 0, myMmr: 1200, oppMmr: 1200, mmrGames: 50 })
    // score_ratio = 1, actual = 1, expected = 0.5 → 32 * 0.5 = 16
    expect(d).toBe(16)
  })

  it('underdog winning gains more', () => {
    const d = calculateMmrDelta({ myScore: 8000, oppScore: 5000, myMmr: 1000, oppMmr: 1400, mmrGames: 50 })
    // expected for me ≈ 0.09; actual ≈ 0.615 → 32 * 0.525 ≈ 16.8 → 17
    expect(d).toBeGreaterThan(15)
    expect(d).toBeLessThanOrEqual(20)
  })

  it('placement (mmr_games < 10) doubles K', () => {
    const normal = calculateMmrDelta({ myScore: 10000, oppScore: 5000, myMmr: 1200, oppMmr: 1200, mmrGames: 50 })
    const placement = calculateMmrDelta({ myScore: 10000, oppScore: 5000, myMmr: 1200, oppMmr: 1200, mmrGames: 3 })
    expect(placement).toBe(normal * 2)
  })

  it('clamps to [-50, 50]', () => {
    const huge = calculateMmrDelta({ myScore: 100000, oppScore: 0, myMmr: 500, oppMmr: 2500, mmrGames: 0 })
    expect(huge).toBeLessThanOrEqual(50)
    const tank = calculateMmrDelta({ myScore: 0, oppScore: 100000, myMmr: 2500, oppMmr: 500, mmrGames: 0 })
    expect(tank).toBeGreaterThanOrEqual(-50)
  })

  it('returns 0 if both scores are 0 (degenerate)', () => {
    const d = calculateMmrDelta({ myScore: 0, oppScore: 0, myMmr: 1200, oppMmr: 1200, mmrGames: 50 })
    expect(d).toBe(0)
  })
})
