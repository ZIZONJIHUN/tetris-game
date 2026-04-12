import { createBag, refillBag, popPiece } from '@/game/bag'

describe('createBag', () => {
  it('returns exactly 7 pieces', () => {
    const bag = createBag()
    expect(bag).toHaveLength(7)
  })

  it('contains each piece type exactly once', () => {
    const bag = createBag()
    const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
    types.forEach(t => expect(bag).toContain(t))
    expect(new Set(bag).size).toBe(7) // no duplicates
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

describe('popPiece', () => {
  it('returns a valid PieceType', () => {
    const bag = createBag()
    const { piece } = popPiece(bag)
    expect(['I','O','T','S','Z','J','L']).toContain(piece)
  })

  it('returns a bag with one fewer item', () => {
    const bag = createBag() // length 7
    const { bag: remaining } = popPiece(bag)
    expect(remaining).toHaveLength(6)
  })

  it('refills automatically when bag is empty', () => {
    const { bag: remaining } = popPiece([])
    // empty bag → refill (7) → pop 1 → 6 remaining
    expect(remaining).toHaveLength(6)
  })
})
