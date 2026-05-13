'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type GameAction =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'hold'

export const DEFAULT_BINDINGS: Record<GameAction, string> = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  softDrop: 'ArrowDown',
  hardDrop: 'Space',
  rotateCW: 'ArrowUp',
  rotateCCW: 'KeyZ',
  hold: 'KeyC',
}

export const ACTION_ORDER: GameAction[] = [
  'moveLeft', 'moveRight', 'softDrop', 'hardDrop', 'rotateCW', 'rotateCCW', 'hold',
]

const STORAGE_KEY = 'keybindings'

type Ctx = {
  bindings: Record<GameAction, string>
  setBinding: (action: GameAction, code: string) => void
  resetBindings: () => void
  capturingFor: GameAction | null
  startCapture: (action: GameAction) => void
  cancelCapture: () => void
}

const KeybindingsContext = createContext<Ctx>({
  bindings: DEFAULT_BINDINGS,
  setBinding: () => {},
  resetBindings: () => {},
  capturingFor: null,
  startCapture: () => {},
  cancelCapture: () => {},
})

export function KeybindingsProvider({ children }: { children: React.ReactNode }) {
  const [bindings, setBindings] = useState<Record<GameAction, string>>(DEFAULT_BINDINGS)
  const [capturingFor, setCapturingFor] = useState<GameAction | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Record<GameAction, string>>
        setBindings(prev => ({ ...prev, ...parsed }))
      }
    } catch {}
  }, [])

  const persist = (next: Record<GameAction, string>) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  const setBinding = useCallback((action: GameAction, code: string) => {
    setBindings(prev => {
      const oldCode = prev[action]
      const next: Record<GameAction, string> = { ...prev, [action]: code }
      const conflict = (Object.entries(prev) as [GameAction, string][])
        .find(([k, v]) => k !== action && v === code)
      if (conflict) next[conflict[0]] = oldCode
      persist(next)
      return next
    })
  }, [])

  const resetBindings = useCallback(() => {
    setBindings(DEFAULT_BINDINGS)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }, [])

  const startCapture = useCallback((action: GameAction) => {
    setCapturingFor(action)
  }, [])

  const cancelCapture = useCallback(() => {
    setCapturingFor(null)
  }, [])

  useEffect(() => {
    if (!capturingFor) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setCapturingFor(null)
        return
      }
      setBinding(capturingFor, e.code)
      setCapturingFor(null)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [capturingFor, setBinding])

  return (
    <KeybindingsContext.Provider value={{
      bindings, setBinding, resetBindings,
      capturingFor, startCapture, cancelCapture,
    }}>
      {children}
    </KeybindingsContext.Provider>
  )
}

export function useKeybindings() {
  return useContext(KeybindingsContext)
}

export function formatKeyCode(code: string): string {
  const map: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Space: 'Space',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl',
    AltLeft: 'Alt',
    AltRight: 'Alt',
    Enter: 'Enter',
    Escape: 'Esc',
    Tab: 'Tab',
    Backspace: '⌫',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
  }
  if (map[code]) return map[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6)
  return code
}
