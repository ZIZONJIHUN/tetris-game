// src/app/leaderboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { tierForLevel } from '@/lib/leveling/xp'
import { TIER_COLORS } from '@/lib/leveling/tierColors'
import LeaderboardHeader from './LeaderboardHeader'
import LeaderboardEmpty from './LeaderboardEmpty'

type LeaderboardRow = {
  player_id: string
  nickname: string
  level: number
  xp: number
  best_score: number
  total_wins: number
  total_games: number
  win_rate: number
  mmr: number
  active_badge_id: string | null
}

export const revalidate = 60

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort } = await searchParams
  const orderBy = sort === 'level' ? 'level' : 'best_score'

  const supabase = await createClient()
  const { data } = await supabase
    .from('leaderboard_view')
    .select('*')
    .order(orderBy, { ascending: false })
    .order('xp', { ascending: false })
    .limit(50)

  const rows: LeaderboardRow[] = data ?? []

  return (
    <AppShell>
      <LeaderboardHeader orderBy={orderBy} />

      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-6 text-xs text-gray-500 uppercase tracking-widest px-4 pb-2 border-b border-gray-800">
          <span>#</span>
          <span>Lv</span>
          <span className="col-span-2">Player</span>
          <span className="text-right">{orderBy === 'level' ? 'XP' : 'Best Score'}</span>
          <span className="text-right">Win Rate</span>
        </div>
        {rows.map((row, i) => {
          const tier = tierForLevel(row.level)
          const color = TIER_COLORS[tier]
          return (
            <div key={row.player_id} className="grid grid-cols-6 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/20 transition items-center">
              <span className={`font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                {i + 1}
              </span>
              <span className="font-bold text-xs" style={{ color }}>{row.level}</span>
              <span className="col-span-2 text-white truncate">
                {row.nickname}
                {row.active_badge_id && <span className="ml-2 text-xs text-gray-500">[{row.active_badge_id}]</span>}
              </span>
              <span className="text-right text-cyan-400 tabular-nums font-bold">
                {orderBy === 'level' ? row.xp.toLocaleString() : Number(row.best_score).toLocaleString()}
              </span>
              <span className="text-right text-gray-400 text-sm">
                {row.win_rate}% <span className="text-gray-600">({row.total_wins}W/{row.total_games}G)</span>
              </span>
            </div>
          )
        })}
        {rows.length === 0 && <LeaderboardEmpty />}
      </div>
    </AppShell>
  )
}
