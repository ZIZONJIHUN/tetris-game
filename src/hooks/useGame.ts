'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GameState } from '@/game/types'
import { createBag } from '@/game/bag'
import {
  createInitialState, startGame, tick,
  moveLeft, moveRight, softDrop, hardDrop,
  rotateClockwise, rotateCounterClockwise, hold,
} from '@/game/engine'

function makeInitialState(): GameState {
  return createInitialState(createBag())
}

export function useGame() {
  const [state, setState] = useState<GameState>(makeInitialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const lastTickRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  const loop = useCallback((timestamp: number) => {
    const s = stateRef.current
    if (s.status === 'playing') {
      if (timestamp - lastTickRef.current >= s.speed) {
        lastTickRef.current = timestamp
        setState(prev => tick(prev))
      }
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [loop])

  const actions = {
    start: () => setState(s => startGame(s)),
    reset: () => setState(makeInitialState),
    moveLeft: () => setState(s => moveLeft(s)),
    moveRight: () => setState(s => moveRight(s)),
    softDrop: () => setState(s => softDrop(s)),
    hardDrop: () => setState(s => hardDrop(s)),
    rotateClockwise: () => setState(s => rotateClockwise(s)),
    rotateCounterClockwise: () => setState(s => rotateCounterClockwise(s)),
    hold: () => setState(s => hold(s)),
  }

  return { state, actions }
}
