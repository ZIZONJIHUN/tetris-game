'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserProfile = {
  id: string
  nickname: string
  isGuest: boolean
  bestScore: number
  rank: number | null  // null if no games played
}

type Ctx = {
  profile: UserProfile | null
  loading: boolean
}

const UserProfileContext = createContext<Ctx>({ profile: null, loading: true })

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

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
      if (cancelled) return
      if (!prof) { setLoading(false); return }

      // Best score from leaderboard_view (already aggregated)
      const { data: row } = await supabase
        .from('leaderboard_view')
        .select('best_score')
        .eq('player_id', user.id)
        .maybeSingle()
      const bestScore = row?.best_score ?? 0

      let rank: number | null = null
      if (bestScore > 0) {
        const { count } = await supabase
          .from('leaderboard_view')
          .select('player_id', { count: 'exact', head: true })
          .gt('best_score', bestScore)
        rank = (count ?? 0) + 1
      }

      if (cancelled) return
      setProfile({
        id: user.id,
        nickname: prof.nickname,
        isGuest: prof.is_guest,
        bestScore,
        rank,
      })
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <UserProfileContext.Provider value={{ profile, loading }}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  return useContext(UserProfileContext)
}
