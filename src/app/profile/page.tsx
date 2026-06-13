// src/app/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { tierForLevel, totalXpFor, xpToNext } from '@/lib/leveling/xp'
import { TIER_COLORS } from '@/lib/leveling/tierColors'
import { ProfileAchievementsHeading, ProfileRecentGamesHeading, ProfileNoGames } from './ProfileSectionHeadings'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.is_guest) redirect('/')

  const { data: stats } = await supabase
    .from('player_stats').select('*').eq('player_id', user.id).maybeSingle()

  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('id, name_en, name_ko, description_en, description_ko, xp_reward, badge_label, skin_key, category, sort_order')
    .order('sort_order')

  const { data: earned } = await supabase
    .from('player_achievements')
    .select('achievement_id, earned_at')
    .eq('player_id', user.id)

  const earnedSet = new Set((earned ?? []).map(e => e.achievement_id))

  const { data: results } = await supabase
    .from('game_results')
    .select('*')
    .eq('player_id', user.id)
    .order('played_at', { ascending: false })
    .limit(20)

  const level = stats?.level ?? 1
  const xp = stats?.xp ?? 0
  const tier = tierForLevel(level)
  const xpInLevel = xp - totalXpFor(level)
  const xpForLevel = xpToNext(level)
  const pct = Math.min(100, (xpInLevel / xpForLevel) * 100)
  const color = TIER_COLORS[tier]

  const totalGames = stats?.total_games ?? 0
  const wins = stats?.total_wins ?? 0
  const bestScore = stats?.best_score ?? 0
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

  return (
    <AppShell>
      <h1 className="text-purple-400 font-bold text-2xl tracking-widest mb-6" style={{ textShadow: '0 0 10px #ff00ff' }}>
        {profile.nickname}
      </h1>

      {/* Level panel */}
      <div className="border border-gray-800 p-5 mb-8 w-full max-w-2xl">
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-bold text-2xl" style={{ color }}>Lv {level}</span>
          <span className="text-sm" style={{ color }}>{tier}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded overflow-hidden">
          <div className="h-full" style={{ width: `${pct}%`, background: color }} />
        </div>
        <p className="text-xs text-gray-500 mt-1 tabular-nums">
          {xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP
        </p>
        {stats && stats.mmr_games > 0 && (
          <p className="text-sm text-cyan-400 mt-2">MMR {stats.mmr}</p>
        )}
      </div>

      {/* Stat cards */}
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

      {/* Achievements */}
      <div className="w-full max-w-2xl mb-10">
        <ProfileAchievementsHeading earnedCount={earnedSet.size} totalCount={allAchievements?.length ?? 0} />
        <div className="grid grid-cols-3 gap-2">
          {(allAchievements ?? []).map(a => {
            const got = earnedSet.has(a.id)
            return (
              <div
                key={a.id}
                className={`border p-2 text-xs ${got ? 'border-yellow-500/60 bg-yellow-500/5' : 'border-gray-800 bg-black/40 opacity-50'}`}
                title={a.description_ko}
              >
                <p className={got ? 'text-yellow-300 font-bold' : 'text-gray-500'}>
                  {got ? '✅' : '🔒'} {a.name_ko}
                </p>
                <p className="text-gray-500 text-[10px] mt-0.5">+{a.xp_reward} XP</p>
                {a.badge_label && <p className="text-gray-600 text-[10px]">{a.badge_label}</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent games */}
      <div className="w-full max-w-2xl">
        <ProfileRecentGamesHeading />
        <div className="flex flex-col gap-1">
          {results?.map(r => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2 border border-gray-800/50">
              <span className={`text-xs font-bold ${r.mode === 'solo' ? 'text-gray-400' : r.is_win ? 'text-cyan-400' : 'text-red-400'}`}>
                {r.mode === 'solo' ? 'SOLO' : r.is_win ? 'WIN' : 'LOSE'}
              </span>
              <span className="text-gray-300 tabular-nums">{r.my_score.toLocaleString()}</span>
              {r.opponent_score !== null && (
                <span className="text-gray-600 text-xs">vs {r.opponent_score.toLocaleString()}</span>
              )}
              <span className="text-gray-600 text-xs">{new Date(r.played_at).toLocaleDateString()}</span>
            </div>
          ))}
          {totalGames === 0 && <ProfileNoGames />}
        </div>
      </div>
    </AppShell>
  )
}
