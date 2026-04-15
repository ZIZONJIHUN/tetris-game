import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type LeaderboardRow = {
  player_id: string
  nickname: string
  best_score: number
  total_wins: number
  total_games: number
  win_rate: number
}

export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('leaderboard_view')
    .select('*')
    .order('best_score', { ascending: false })
    .limit(50)

  const rows: LeaderboardRow[] = data ?? []

  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
        <h1 className="text-yellow-400 font-bold text-2xl tracking-widest"
          style={{ textShadow: '0 0 10px #ffe600' }}>
          LEADERBOARD
        </h1>
      </div>

      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-5 text-xs text-gray-500 uppercase tracking-widest px-4 pb-2 border-b border-gray-800">
          <span>#</span>
          <span className="col-span-2">Player</span>
          <span className="text-right">Best Score</span>
          <span className="text-right">Win Rate</span>
        </div>
        {rows.map((row, i) => (
          <div key={row.player_id}
            className="grid grid-cols-5 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/20 transition items-center">
            <span className={`font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
              {i + 1}
            </span>
            <span className="col-span-2 text-white">{row.nickname}</span>
            <span className="text-right text-cyan-400 tabular-nums font-bold">
              {Number(row.best_score).toLocaleString()}
            </span>
            <span className="text-right text-gray-400 text-sm">
              {row.win_rate}% <span className="text-gray-600">({row.total_wins}W/{row.total_games}G)</span>
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-center text-gray-600 py-12">No records yet.</p>
        )}
      </div>
    </main>
  )
}
