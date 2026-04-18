import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.is_guest) redirect('/')

  const { data: results } = await supabase
    .from('game_results')
    .select('*')
    .eq('player_id', user.id)
    .order('played_at', { ascending: false })
    .limit(20)

  const totalGames = results?.length ?? 0
  const wins = results?.filter(r => r.is_win).length ?? 0
  const bestScore = results && results.length > 0 ? Math.max(...results.map(r => r.my_score)) : 0
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

  const stats = [
    { label: 'Games', value: totalGames },
    { label: 'Wins', value: wins },
    { label: 'Win Rate', value: `${winRate}%` },
    { label: 'Best Score', value: bestScore.toLocaleString() },
  ]

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
            {profile.nickname}
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {stats.map(({ label, value }) => (
            <div key={label} className="bg-white border border-[var(--border)] rounded-lg p-4 text-center shadow-sm">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Recent games */}
        <div className="bg-white border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)]" style={{ background: 'var(--bg)' }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Recent Games</p>
          </div>
          {results?.map(r => (
            <div key={r.id}
              className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)] transition">
              <span className="text-sm font-bold w-12"
                style={{ color: r.is_win ? 'var(--accent)' : 'var(--danger)' }}>
                {r.is_win ? 'WIN' : 'LOSE'}
              </span>
              <span className="text-sm tabular-nums font-bold" style={{ color: 'var(--text)' }}>
                {r.my_score.toLocaleString()}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                vs {r.opponent_score.toLocaleString()}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {new Date(r.played_at).toLocaleDateString()}
              </span>
            </div>
          ))}
          {totalGames === 0 && (
            <p className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
              No games played yet.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
