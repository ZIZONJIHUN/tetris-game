'use client'
import { useEffect } from 'react'
import { useKeybindings } from '@/contexts/KeybindingsContext'

type Actions = {
  moveLeft: () => void
  moveRight: () => void
  softDrop: () => void
  hardDrop: () => void
  rotateClockwise: () => void
  rotateCounterClockwise: () => void
  hold: () => void
}

const DAS_MS = 140                // 좌우 이동 초기 딜레이
const ARR_MS = 28                 // 좌우 이동 반복 간격
const SOFT_DROP_INITIAL_MS = 80   // 소프트 드롭 처음 간격 (느림 → 회전 여유)
const SOFT_DROP_MIN_MS = 38       // 소프트 드롭 최고 속도 (최소 간격, 캡)
const SOFT_DROP_RAMP_MS = 700     // 이 시간만큼 누르면 최고 속도 도달

function softDropInterval(elapsedMs: number): number {
  if (elapsedMs >= SOFT_DROP_RAMP_MS) return SOFT_DROP_MIN_MS
  const t = elapsedMs / SOFT_DROP_RAMP_MS
  return SOFT_DROP_INITIAL_MS - (SOFT_DROP_INITIAL_MS - SOFT_DROP_MIN_MS) * t
}

export function useKeyboard(actions: Actions, enabled = true) {
  const { bindings, capturingFor } = useKeybindings()

  useEffect(() => {
    if (!enabled) return
    if (capturingFor) return

    const pressed = new Set<string>()
    const timers = new Map<string, { initial: ReturnType<typeof setTimeout> | null; repeat: ReturnType<typeof setInterval> | null }>()

    const clearTimers = (code: string) => {
      const t = timers.get(code)
      if (!t) return
      if (t.initial) clearTimeout(t.initial)
      if (t.repeat) clearInterval(t.repeat)
      timers.delete(code)
    }

    const startAutoRepeat = (code: string, fn: () => void, dasMs: number, arrMs: number) => {
      fn()
      const initial = setTimeout(() => {
        fn()
        const repeat = setInterval(fn, arrMs)
        timers.set(code, { initial: null, repeat })
      }, dasMs)
      timers.set(code, { initial, repeat: null })
    }

    // 소프트 드롭: 누른 시간이 길수록 간격이 짧아지는(=속도가 빨라지는) self-rescheduling
    const startSoftDrop = (code: string) => {
      const startTime = performance.now()
      actions.softDrop()
      const scheduleNext = () => {
        const elapsed = performance.now() - startTime
        const interval = softDropInterval(elapsed)
        const id = setTimeout(() => {
          actions.softDrop()
          scheduleNext()
        }, interval)
        timers.set(code, { initial: id, repeat: null })
      }
      scheduleNext()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (pressed.has(e.code)) return
      const code = e.code

      let matched = true
      if (code === bindings.moveLeft) startAutoRepeat(code, actions.moveLeft, DAS_MS, ARR_MS)
      else if (code === bindings.moveRight) startAutoRepeat(code, actions.moveRight, DAS_MS, ARR_MS)
      else if (code === bindings.softDrop) startSoftDrop(code)
      else if (code === bindings.rotateCW) actions.rotateClockwise()
      else if (code === bindings.rotateCCW) actions.rotateCounterClockwise()
      else if (code === bindings.hardDrop) actions.hardDrop()
      else if (code === bindings.hold) actions.hold()
      else matched = false

      if (matched) {
        pressed.add(code)
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      pressed.delete(e.code)
      clearTimers(e.code)
    }

    // 창 포커스를 잃으면 stuck-key 방지: 모두 해제
    const handleBlur = () => {
      for (const k of pressed) clearTimers(k)
      pressed.clear()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      for (const t of timers.values()) {
        if (t.initial) clearTimeout(t.initial)
        if (t.repeat) clearInterval(t.repeat)
      }
    }
  }, [actions, enabled, bindings, capturingFor])
}
