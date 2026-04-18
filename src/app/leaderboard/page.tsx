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

const rankStyle = (i: number) => {
  if (i === 0) return { color: '#b8860b', fontWeight: '700' }
  if (i === 1) return { color: '#777777', fontWeight: '700' }
  if (i === 2) return { color: '#b36a00', fontWeight: '700' }
  return { color: 'var(--text-muted)', fontWeight: '400' }
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('leaderboard_view')
    .select('*')
    .order('best_score', { ascending: false })
    .limit(50)

  const rows: LeaderboardRow[] = data ?? []

  return (
    <main className="min-h-screen flex flex-col items-center py-10 px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/menu"
            className="px-3 py-1.5 text-xs rounded border border-[var(--border)] hover:bg-white transition"
            style={{ color: 'var(--text-secondary)' }}>
            ← Menu
          </Link>
          <h1 className="text-xl font-black tracking-widest" style={{ color: 'var(--text)' }}>
            LEADERBOARD
          </h1>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
          <div className="grid grid-cols-5 px-5 py-3 border-b border-[var(--border)]"
            style={{ background: 'var(--bg)' }}>
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>#</span>
            <span className="col-span-2 text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Player</span>
            <span className="text-right text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Best</span>
            <span className="text-right text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Win%</span>
          </div>

          {rows.map((row, i) => (
            <div key={row.player_id}
              className="grid grid-cols-5 px-5 py-3.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)] transition items-center">
              <span className="text-sm" style={rankStyle(i)}>{i + 1}</span>
              <span className="col-span-2 text-sm font-bold" style={{ color: 'var(--text)' }}>{row.nickname}</span>
              <span className="text-right text-sm tabular-nums font-bold" style={{ color: 'var(--accent)' }}>
                {Number(row.best_score).toLocaleString()}
              </span>
              <span className="text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                {row.win_rate}%
                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                  ({row.total_wins}W)
                </span>
              </span>
            </div>
          ))}

          {rows.length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
              No records yet.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
