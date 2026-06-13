export type MmrInput = {
  myScore: number
  oppScore: number
  myMmr: number
  oppMmr: number
  mmrGames: number
}

export function calculateMmrDelta(input: MmrInput): number {
  const { myScore, oppScore, myMmr, oppMmr, mmrGames } = input
  const totalScore = myScore + oppScore
  if (totalScore === 0) return 0

  const expected = 1 / (1 + Math.pow(10, (oppMmr - myMmr) / 400))
  const scoreRatio = (myScore - oppScore) / totalScore  // -1..+1
  const actual = (scoreRatio + 1) / 2                   // 0..1

  const baseRaw = Math.round(32 * (actual - expected))
  const raw = mmrGames < 10 ? baseRaw * 2 : baseRaw
  return Math.max(-50, Math.min(50, raw))
}
