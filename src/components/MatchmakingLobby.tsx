'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createWaitingRoomChannel } from '@/lib/realtime'
import { createClient } from '@/lib/supabase/client'

type LobbyMode = 'select' | 'matching'

export default function MatchmakingLobby() {
  const router = useRouter()
  const [mode, setMode] = useState<LobbyMode>('select')
  const [roomCode, setRoomCode] = useState('')
  const [waitTime, setWaitTime] = useState(0)
  const [userId, setUserId] = useState('')
  const [nickname, setNickname] = useState('')
  const channelRef = useRef<RealtimeChannel | null>(null)
  const waitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      setUserId(user.id)
      supabase.from('profiles').select('nickname').eq('id', user.id).single()
        .then(({ data }) => { if (data) setNickname(data.nickname) })
    })
  }, [router])

  const startRandomMatching = () => {
    if (!userId || !nickname) return
    setMode('matching')
    setWaitTime(0)

    waitTimerRef.current = setInterval(() => {
      setWaitTime(t => {
        if (t >= 60) {
          cancelMatching()
          return t
        }
        return t + 1
      })
    }, 1000)

    const channel = createWaitingRoomChannel(userId, nickname, (roomId) => {
      router.push(`/battle/${roomId}`)
    })
    channelRef.current = channel
  }

  const cancelMatching = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    if (waitTimerRef.current) clearInterval(waitTimerRef.current)
    setMode('select')
    setWaitTime(0)
  }

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    router.push(`/battle/${roomId}`)
  }

  const joinRoom = () => {
    if (!roomCode.trim()) return
    router.push(`/battle/${roomCode.trim().toUpperCase()}`)
  }

  return (
    <div className="flex flex-col items-center gap-8 w-80">
      {mode === 'select' && (
        <div className="w-full flex flex-col gap-3">
          <button onClick={startRandomMatching}
            className="py-4 border border-cyan-500 text-cyan-400 font-bold tracking-widest hover:bg-cyan-500/20 transition"
            style={{ boxShadow: '0 0 10px rgba(0,245,255,0.1)' }}>
            RANDOM MATCH
          </button>
          <button onClick={createRoom}
            className="py-4 border border-purple-500 text-purple-400 font-bold tracking-widest hover:bg-purple-500/20 transition">
            CREATE ROOM
          </button>
          <div className="flex gap-2">
            <input
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              className="flex-1 px-4 py-3 bg-transparent border border-gray-600 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400 tracking-widest text-center"
              onKeyDown={e => e.key === 'Enter' && joinRoom()}
            />
            <button onClick={joinRoom}
              className="px-4 py-3 border border-gray-600 text-gray-400 hover:bg-gray-600/20 transition">
              JOIN
            </button>
          </div>
        </div>
      )}

      {mode === 'matching' && (
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-cyan-400 tracking-widest">Searching for opponent...</p>
          <p className="text-gray-500 text-sm">{waitTime}s / 60s</p>
          {waitTime >= 60 && (
            <p className="text-yellow-400 text-sm">No opponent found.</p>
          )}
          <button onClick={cancelMatching}
            className="px-6 py-2 border border-gray-600 text-gray-400 hover:bg-gray-600/20 transition text-sm">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
