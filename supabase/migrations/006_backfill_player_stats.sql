-- supabase/migrations/006_backfill_player_stats.sql
-- One-shot backfill: any player_id with prior game_results gets a player_stats row.
-- Bonus events are missing for historical games, so XP is score-based only.

insert into public.player_stats
  (player_id, xp, level, best_score, total_games, total_wins, mmr, mmr_games)
select
  gr.player_id,
  least((sum(gr.my_score) / 10)::bigint, 2146250)         as xp,        -- cap at level 50 total
  public.level_from_xp(least((sum(gr.my_score) / 10)::bigint, 2146250)) as level,
  max(gr.my_score)                                                       as best_score,
  count(*)                                                               as total_games,
  count(*) filter (where gr.is_win)                                      as total_wins,
  1200                                                                   as mmr,    -- everyone starts fresh on MMR
  0                                                                      as mmr_games
from public.game_results gr
where gr.player_id is not null
group by gr.player_id
on conflict (player_id) do nothing;
