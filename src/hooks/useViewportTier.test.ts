import { renderHook, act } from '@testing-library/react'
import { useViewportTier } from './useViewportTier'

function setHeight(h: number) {
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: h })
  window.dispatchEvent(new Event('resize'))
}

describe('useViewportTier', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it('returns sm when height ≤ 900', () => {
    setHeight(800)
    const { result } = renderHook(() => useViewportTier())
    expect(result.current).toBe('sm')
  })

  it('returns md when 901 ≤ height ≤ 1200', () => {
    setHeight(1080)
    const { result } = renderHook(() => useViewportTier())
    expect(result.current).toBe('md')
  })

  it('returns lg when height ≥ 1201', () => {
    setHeight(1440)
    const { result } = renderHook(() => useViewportTier())
    expect(result.current).toBe('lg')
  })

  it('returns sm at boundary height 900', () => {
    setHeight(900)
    const { result } = renderHook(() => useViewportTier())
    expect(result.current).toBe('sm')
  })

  it('returns md just past sm boundary at 901', () => {
    setHeight(901)
    const { result } = renderHook(() => useViewportTier())
    expect(result.current).toBe('md')
  })

  it('returns md at boundary height 1200', () => {
    setHeight(1200)
    const { result } = renderHook(() => useViewportTier())
    expect(result.current).toBe('md')
  })

  it('returns lg just past md boundary at 1201', () => {
    setHeight(1201)
    const { result } = renderHook(() => useViewportTier())
    expect(result.current).toBe('lg')
  })

  it('updates tier on debounced resize', () => {
    setHeight(800)
    const { result } = renderHook(() => useViewportTier())
    expect(result.current).toBe('sm')

    act(() => { setHeight(1080) })
    // before debounce timer fires, still 'sm'
    expect(result.current).toBe('sm')
    act(() => { jest.advanceTimersByTime(120) })
    expect(result.current).toBe('md')
  })
})
