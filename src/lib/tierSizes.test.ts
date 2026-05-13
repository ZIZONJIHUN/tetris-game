import { getCellSize, getPanelWidth, getCanvasSize, type Tier } from './tierSizes'

describe('getCellSize', () => {
  it('returns 24 for sm tier', () => {
    expect(getCellSize('sm')).toEqual({ board: 24, hold: 16, next: 12 })
  })
  it('returns 32 for md tier', () => {
    expect(getCellSize('md')).toEqual({ board: 32, hold: 20, next: 16 })
  })
  it('returns 40 for lg tier', () => {
    expect(getCellSize('lg')).toEqual({ board: 40, hold: 26, next: 20 })
  })
})

describe('getPanelWidth', () => {
  it('returns 74 / 90 / 112 by tier', () => {
    expect(getPanelWidth('sm')).toBe(74)
    expect(getPanelWidth('md')).toBe(90)
    expect(getPanelWidth('lg')).toBe(112)
  })
})

describe('getCanvasSize', () => {
  it('returns board 10x20 cells, hold 4x4 cells, next 4x10 cells', () => {
    const sizes = getCanvasSize('md')
    expect(sizes.board).toEqual({ width: 320, height: 640 })
    expect(sizes.hold).toEqual({ width: 80, height: 80 })
    expect(sizes.next).toEqual({ width: 64, height: 160 })
  })
})
