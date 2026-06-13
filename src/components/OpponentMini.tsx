'use client'
import { useEffect, useState } from 'react'
import TetrisBoard from './TetrisBoard'
import { BroadcastGameState } from '@/game/types'
import type { Tier as ViewportTier } from '@/lib/tierSizes'
import { createClient } from '@/lib/supabase/client'
import { tierForLevel } from '@/lib/leveling/xp'
import { TIER_COLORS } from '@/lib/leveling/tierColors'

type Props = {
  state: BroadcastGameState | null
  nickname: string
  isConnected: boolean
  opponentId: string | null
  tier?: ViewportTier
}

export default function OpponentMini({ state, nickname, isConnected, opponentId, tier }: Props) {
  void tier
  const emptyBoard = Array.from({ length: 20 }, () => Array(10).fill(0))
  const [oppLevel, setOppLevel] = useState<number | null>(null)

  useEffect(() => {
    if (!opponentId) { setOppLevel(null); return }
    let cancelled = false
    const supabase = createClient()
    supabase.from('player_stats').select('level').eq('player_id', opponentId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setOppLevel(data?.level ?? 1) })
    return () => { cancelled = true }
  }, [opponentId])

  const oppTier = oppLevel !== null ? tierForLevel(oppLevel) : null
  const oppColor = oppTier ? TIER_COLORS[oppTier] : '#888'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-500'}`}
          style={isConnected ? { boxShadow: '0 0 6px #4ade80' } : {}}
        />
        {oppLevel !== null && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: oppColor, color: '#000' }}>
            Lv {oppLevel}
          </span>
        )}
        <p className="text-orange-400 text-sm font-bold tracking-wider"
          style={{ textShadow: '0 0 6px #ff6600' }}>
          {nickname}
        </p>
      </div>
      <TetrisBoard board={state?.board ?? emptyBoard} mini />
      {state && (
        <div className="text-center">
          <p className="text-orange-400 text-sm tabular-nums"
            style={{ textShadow: '0 0 6px #ff6600' }}>
            {state.score.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">Lv.{state.level}</p>
        </div>
      )}
      {!isConnected && <p className="text-gray-600 text-xs">Waiting...</p>}
    </div>
  )
}
