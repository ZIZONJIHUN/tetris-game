// src/lib/leveling/finalize.ts
import { createClient } from '@/lib/supabase/client'
import { GameEndStats } from './types'

export type FinalizeGameResult = {
  xp_breakdown: {
    base: number
    tetris: number
    combo: number
    perfect: number
    personal_best: number
    win: number
    win_streak: number
    achievement_bonus: number
  }
  xp_gained: number
  prev_xp: number
  new_xp: number
  prev_level: number
  new_level: number
  prev_mmr: number | null
  new_mmr: number | null
  mmr_delta: number | null
  unlocked: Array<{
    id: string
    name_ko: string
    name_en: string
    xp_reward: number
    badge_label: string | null
    skin_key: string | null
  }>
}

export async function finalizeGame(
  stats: GameEndStats,
  roomId: string,
  opponentId: string | null,
): Promise<FinalizeGameResult> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('finalize_game', {
    p_mode: stats.mode,
    p_room_id: roomId,
    p_opponent_id: opponentId,
    p_my_score: stats.myScore,
    p_opponent_score: stats.opponentScore ?? 0,
    p_total_lines: stats.totalLines,
    p_tetris_count: stats.tetrisCount,
    p_max_combo: stats.maxCombo,
    p_perfect_clears: stats.perfectClears,
  })
  if (error) throw error
  return data as FinalizeGameResult
}
