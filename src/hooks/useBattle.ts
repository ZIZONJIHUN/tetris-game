'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { BroadcastGameState } from '@/game/types'
import { useGame } from './useGame'
import { createBattleChannel, sendGameState, sendGameEvent } from '@/lib/realtime'
import { createClient } from '@/lib/supabase/client'

const BATTLE_DURATION_MS = 2 * 60 * 1000 // 2분
const SYNC_INTERVAL_MS = 100

export type BattlePhase = 'waiting' | 'countdown' | 'playing' | 'over'

export type BattleResult = {
  myScore: number
  opponentScore: number
  isWin: boolean | null // null = 무승부
}

export function useBattle(roomId: string) {
  const { state: gameState, actions } = useGame()
  const gameStateRef = useRef(gameState)
  gameStateRef.current = gameState

  const [phase, setPhase] = useState<BattlePhase>('waiting')
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft] = useState(BATTLE_DURATION_MS)
  const [opponentNickname, setOpponentNickname] = useState('')
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [opponentState, setOpponentState] = useState<BroadcastGameState | null>(null)
  const [result, setResult] = useState<BattleResult | null>(null)
  const [myNickname, setMyNickname] = useState('')
  const [userId, setUserId] = useState('')

  const channelRef = useRef<RealtimeChannel | null>(null)
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const disconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef<number>(0)
  const opponentFinalScoreRef = useRef<number | null>(null)

  // 내 프로필 로드
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles').select('nickname').eq('id', user.id).single()
        .then(({ data }) => { if (data) setMyNickname(data.nickname) })
    })
  }, [])

  const endBattle = useCallback((myFinalScore: number, opponentFinalScore: number) => {
    setPhase('over')
    const isWin =
      myFinalScore > opponentFinalScore ? true
      : myFinalScore < opponentFinalScore ? false
      : null
    setResult({ myScore: myFinalScore, opponentScore: opponentFinalScore, isWin })

    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const startCountdown = useCallback(() => {
    setPhase('countdown')
    let count = 3
    setCountdown(count)
    const interval = setInterval(() => {
      count--
      setCountdown(count)
      if (count <= 0) {
        clearInterval(interval)
        setPhase('playing')
        actions.start()
        startTimeRef.current = Date.now()

        // 게임 상태 100ms마다 sync
        syncIntervalRef.current = setInterval(() => {
          const s = gameStateRef.current
          sendGameState(channelRef.current!, {
            board: s.board, score: s.score, lines: s.lines, level: s.level,
          })
        }, SYNC_INTERVAL_MS)

        // 2분 타이머
        timerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current
          const left = Math.max(0, BATTLE_DURATION_MS - elapsed)
          setTimeLeft(left)
          if (left <= 0) {
            const s = gameStateRef.current
            sendGameEvent(channelRef.current!, 'over')
            endBattle(s.score, opponentFinalScoreRef.current ?? 0)
          }
        }, 200)
      }
    }, 1000)
  }, [actions, endBattle])

  // 채널 연결
  useEffect(() => {
    if (!userId || !myNickname) return

    const channel = createBattleChannel(
      roomId, userId, myNickname,
      (nick) => {
        setOpponentNickname(nick)
        setOpponentConnected(true)
        if (disconnectTimeoutRef.current) clearTimeout(disconnectTimeoutRef.current)
        startCountdown()
      },
      () => {
        setOpponentConnected(false)
        // 30초 대기 후 자동 승리
        disconnectTimeoutRef.current = setTimeout(() => {
          const s = gameStateRef.current
          endBattle(s.score, -1)
        }, 30000)
      },
      (state) => {
        opponentFinalScoreRef.current = state.score
        setOpponentState(state)
      },
      (event) => {
        if (event === 'over') {
          const s = gameStateRef.current
          endBattle(s.score, opponentFinalScoreRef.current ?? 0)
        }
      },
    )

    channelRef.current = channel
    return () => {
      channel.unsubscribe()
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (disconnectTimeoutRef.current) clearTimeout(disconnectTimeoutRef.current)
    }
  }, [userId, myNickname, roomId, startCountdown, endBattle])

  // 게임오버 감지
  useEffect(() => {
    if (gameState.status === 'over' && phase === 'playing') {
      sendGameEvent(channelRef.current!, 'over')
      endBattle(gameState.score, opponentFinalScoreRef.current ?? 0)
    }
  }, [gameState.status, phase, gameState.score, endBattle])

  return {
    gameState, actions, phase, countdown, timeLeft,
    myNickname, opponentNickname, opponentConnected, opponentState, result,
  }
}
