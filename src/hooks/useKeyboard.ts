'use client'
import { useEffect } from 'react'

type Actions = {
  moveLeft: () => void
  moveRight: () => void
  softDrop: () => void
  hardDrop: () => void
  rotateClockwise: () => void
  rotateCounterClockwise: () => void
  hold: () => void
}

export function useKeyboard(actions: Actions, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const pressedKeys = new Set<string>()
    let softDropInterval: ReturnType<typeof setInterval> | null = null

    const handleKeyDown = (e: KeyboardEvent) => {
      if (pressedKeys.has(e.code)) return
      pressedKeys.add(e.code)
      e.preventDefault()

      switch (e.code) {
        case 'ArrowLeft':  actions.moveLeft(); break
        case 'ArrowRight': actions.moveRight(); break
        case 'ArrowUp':
        case 'KeyX':       actions.rotateClockwise(); break
        case 'KeyZ':       actions.rotateCounterClockwise(); break
        case 'Space':      actions.hardDrop(); break
        case 'KeyC':       actions.hold(); break
        case 'ArrowDown':
          actions.softDrop()
          softDropInterval = setInterval(() => actions.softDrop(), 50)
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code)
      if (e.code === 'ArrowDown' && softDropInterval) {
        clearInterval(softDropInterval)
        softDropInterval = null
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (softDropInterval) clearInterval(softDropInterval)
    }
  }, [actions, enabled])
}
