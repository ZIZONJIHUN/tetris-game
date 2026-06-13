// src/contexts/UserProfileContext.tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SkinKey } from '@/lib/leveling/skins'

export type UserProfile = {
  id: string
  nickname: string
  isGuest: boolean
  bestScore: number
  rank: number | null
  level: number
  xp: number
  mmr: number
  activeBadge: string | null
  activeSkin: SkinKey | null
}

type Ctx = {
  profile: UserProfile | null
  loading: boolean
  refresh: () => void
}

const UserProfileContext = createContext<Ctx>({ profile: null, loading: true, refresh: () => {} })

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('nickname, is_guest')
        .eq('id', user.id)
        .single()
      if (cancelled || !prof) { setLoading(false); return }

      const { data: stats } = await supabase
        .from('player_stats')
        .select('xp, level, mmr, best_score, active_badge_id, active_skin_id')
        .eq('player_id', user.id)
        .maybeSingle()

      const bestScore = stats?.best_score ?? 0
      let rank: number | null = null
      if (bestScore > 0) {
        const { count } = await supabase
          .from('leaderboard_view')
          .select('player_id', { count: 'exact', head: true })
          .gt('best_score', bestScore)
        rank = (count ?? 0) + 1
      }

      let activeSkin: SkinKey | null = null
      if (stats?.active_skin_id) {
        const { data: ach } = await supabase
          .from('achievements')
          .select('skin_key')
          .eq('id', stats.active_skin_id)
          .maybeSingle()
        activeSkin = (ach?.skin_key ?? null) as SkinKey | null
      }

      if (cancelled) return
      setProfile({
        id: user.id,
        nickname: prof.nickname,
        isGuest: prof.is_guest,
        bestScore,
        rank,
        level: stats?.level ?? 1,
        xp: stats?.xp ?? 0,
        mmr: stats?.mmr ?? 1200,
        activeBadge: stats?.active_badge_id ?? null,
        activeSkin,
      })
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [tick])

  return (
    <UserProfileContext.Provider value={{ profile, loading, refresh: () => setTick(t => t + 1) }}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  return useContext(UserProfileContext)
}
