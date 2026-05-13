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

  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
        <h1 className="text-purple-400 font-bold text-2xl tracking-widest"
          style={{ textShadow: '0 0 10px #ff00ff' }}>
          {profile.nickname}
        </h1>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-10 w-full max-w-2xl">
        {[
          { label: 'Games', value: totalGames, color: 'text-gray-300' },
          { label: 'Wins', value: wins, color: 'text-cyan-400' },
          { label: 'Win Rate', value: `${winRate}%`, color: 'text-purple-400' },
          { label: 'Best Score', value: bestScore.toLocaleString(), color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-gray-800 p-4 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">{label}</p>
            <p className={`${color} font-bold text-xl`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="text-gray-400 text-sm uppercase tracking-widest mb-3">Recent Games</h2>
        <div className="flex flex-col gap-1">
          {results?.map(r => (
            <div key={r.id}
              className="flex items-center justify-between px-4 py-2 border border-gray-800/50">
              <span className={`text-sm font-bold ${r.is_win ? 'text-cyan-400' : 'text-red-400'}`}>
                {r.is_win ? 'WIN' : 'LOSE'}
              </span>
              <span className="text-gray-300 tabular-nums">{r.my_score.toLocaleString()}</span>
              <span className="text-gray-600 text-xs">vs {r.opponent_score.toLocaleString()}</span>
              <span className="text-gray-600 text-xs">
                {new Date(r.played_at).toLocaleDateString()}
              </span>
            </div>
          ))}
          {totalGames === 0 && (
            <p className="text-center text-gray-600 py-8">No games played yet.</p>
          )}
        </div>
      </div>
    </main>
  )
}
