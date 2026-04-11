import { createBag, refillBag } from '@/game/bag'

describe('createBag', () => {
  it('returns exactly 7 pieces', () => {
    const bag = createBag()
    expect(bag).toHaveLength(7)
  })

  it('contains each piece type exactly once', () => {
    const bag = createBag()
    const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
    types.forEach(t => expect(bag).toContain(t))
  })

  it('produces different orders on repeated calls (probabilistic)', () => {
    const results = new Set(Array.from({ length: 10 }, () => createBag().join('')))
    expect(results.size).toBeGreaterThan(1)
  })
})

describe('refillBag', () => {
  it('returns bag unchanged if length >= 7', () => {
    const bag = createBag()
    expect(refillBag(bag)).toHaveLength(7)
  })

  it('appends new bag when length < 7', () => {
    const bag = createBag().slice(0, 3) // 3개만 남김
    const refilled = refillBag(bag)
    expect(refilled.length).toBe(10) // 3 + 7
  })
})
