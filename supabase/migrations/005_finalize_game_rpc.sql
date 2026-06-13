-- supabase/migrations/005_finalize_game_rpc.sql

create or replace function public.finalize_game(
  p_mode text,
  p_room_id text,
  p_opponent_id uuid,
  p_my_score int,
  p_opponent_score int,
  p_total_lines int,
  p_tetris_count int,
  p_max_combo int,
  p_perfect_clears int
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_is_guest boolean;
  v_is_win boolean;
  v_my_mmr int := 1200;
  v_opp_mmr int := 1200;
  v_my_stats record;
  v_xp_delta int;
  v_mmr_delta int := null;
  v_win_streak int := 0;
  v_is_personal_best boolean := false;
  v_already_earned text[];
  v_provisional_xp bigint;
  v_provisional_level int;
  v_provisional_games int;
  v_provisional_wins int;
  v_provisional_tetrises int;
  v_provisional_perfects int;
  v_provisional_combo int;
  v_provisional_best int;
  v_new_xp bigint;
  v_new_level int;
  v_unlocked jsonb := '[]'::jsonb;
  v_achievement_xp_bonus int := 0;
  v_breakdown jsonb;
  v_prev_level int;
  v_prev_xp bigint;
  v_prev_mmr int;
  v_ach record;
begin
  -- 1. Authn
  if v_player_id is null then
    raise exception 'unauthenticated';
  end if;

  -- 2. Guest gate
  select is_guest into v_is_guest from public.profiles where id = v_player_id;
  if v_is_guest is null then raise exception 'profile not found'; end if;
  if v_is_guest then raise exception 'guests cannot finalize games'; end if;

  -- 3. Sanity checks
  if p_mode not in ('solo','battle') then raise exception 'invalid mode'; end if;
  if p_my_score < 0 or p_my_score > 9999999 then raise exception 'score out of range'; end if;
  if p_tetris_count * 4 > p_total_lines then raise exception 'tetris_count vs total_lines mismatch'; end if;
  if p_max_combo > p_total_lines then raise exception 'max_combo exceeds total_lines'; end if;
  if p_perfect_clears > p_total_lines then raise exception 'perfect_clears exceeds total_lines'; end if;
  if p_mode = 'battle' then
    if p_opponent_id is null then raise exception 'battle requires opponent_id'; end if;
    if p_opponent_score is null or p_opponent_score < 0 then raise exception 'invalid opponent_score'; end if;
  end if;

  -- 4. Ensure player_stats row exists, lock it
  insert into public.player_stats (player_id) values (v_player_id)
    on conflict (player_id) do nothing;
  select * into v_my_stats from public.player_stats where player_id = v_player_id for update;
  v_prev_level := v_my_stats.level;
  v_prev_xp    := v_my_stats.xp;
  v_prev_mmr   := v_my_stats.mmr;
  v_my_mmr     := v_my_stats.mmr;

  -- 5. Battle: load opponent MMR (default 1200 if no row)
  if p_mode = 'battle' then
    v_is_win := p_my_score > p_opponent_score;
    select coalesce((select mmr from public.player_stats where player_id = p_opponent_id), 1200) into v_opp_mmr;
  end if;

  -- 6. Insert game_results (unique constraint enforces idempotency)
  begin
    insert into public.game_results
      (room_id, player_id, opponent_id, my_score, opponent_score, is_win,
       mode, total_lines, tetris_count, max_combo, perfect_clears)
    values
      (p_room_id, v_player_id, p_opponent_id, p_my_score,
       case when p_mode = 'battle' then p_opponent_score else null end,
       case when p_mode = 'battle' then v_is_win else null end,
       p_mode, p_total_lines, p_tetris_count, p_max_combo, p_perfect_clears);
  exception when unique_violation then
    raise exception 'game already finalized';
  end;

  -- 7. Compute win streak and personal best
  v_is_personal_best := p_my_score > v_my_stats.best_score;
  if p_mode = 'battle' then
    v_win_streak := public.recent_consecutive_battle_wins(v_player_id);
    v_mmr_delta := public.calc_mmr_delta(p_my_score, p_opponent_score, v_my_mmr, v_opp_mmr, v_my_stats.mmr_games);
  end if;

  -- 8. XP delta
  v_xp_delta := public.calc_xp_gain(
    p_mode, p_my_score, p_tetris_count, p_max_combo, p_perfect_clears,
    v_is_personal_best, coalesce(v_is_win, false), v_win_streak
  );

  -- 9. Provisional new stats (used for achievement checks)
  v_provisional_xp       := v_my_stats.xp + v_xp_delta;
  v_provisional_level    := public.level_from_xp(v_provisional_xp);
  v_provisional_games    := v_my_stats.total_games + 1;
  v_provisional_wins     := v_my_stats.total_wins + (case when v_is_win then 1 else 0 end);
  v_provisional_tetrises := v_my_stats.total_tetrises + p_tetris_count;
  v_provisional_perfects := v_my_stats.total_perfects + p_perfect_clears;
  v_provisional_combo    := greatest(v_my_stats.max_combo_ever, p_max_combo);
  v_provisional_best     := greatest(v_my_stats.best_score, p_my_score);

  -- 10. Achievement check
  select coalesce(array_agg(achievement_id), '{}') into v_already_earned
  from public.player_achievements where player_id = v_player_id;

  for v_ach in
    select a.id, a.name_ko, a.name_en, a.xp_reward, a.badge_label, a.skin_key
    from public.achievements a
    where a.id <> all(v_already_earned)
      and public.achievement_check(
            a.id, p_mode, p_my_score, p_tetris_count, p_max_combo, p_perfect_clears,
            v_provisional_games,
            v_provisional_wins,
            v_provisional_tetrises,
            v_provisional_perfects,
            v_provisional_level,
            v_win_streak
          )
  loop
    v_unlocked := v_unlocked || jsonb_build_object(
      'id', v_ach.id, 'name_ko', v_ach.name_ko, 'name_en', v_ach.name_en,
      'xp_reward', v_ach.xp_reward, 'badge_label', v_ach.badge_label, 'skin_key', v_ach.skin_key
    );
    v_achievement_xp_bonus := v_achievement_xp_bonus + v_ach.xp_reward;
    insert into public.player_achievements (player_id, achievement_id)
    values (v_player_id, v_ach.id) on conflict do nothing;
  end loop;

  -- 11. Final xp / level after adding achievement bonuses
  v_new_xp := v_provisional_xp + v_achievement_xp_bonus;
  v_new_level := public.level_from_xp(v_new_xp);

  -- 12. UPDATE player_stats (single statement)
  update public.player_stats set
    xp              = v_new_xp,
    level           = v_new_level,
    mmr             = case when p_mode = 'battle' then v_my_mmr + v_mmr_delta else mmr end,
    mmr_games       = case when p_mode = 'battle' then mmr_games + 1 else mmr_games end,
    best_score      = greatest(best_score, p_my_score),
    total_games     = total_games + 1,
    total_wins      = total_wins + (case when v_is_win then 1 else 0 end),
    total_tetrises  = total_tetrises + p_tetris_count,
    total_perfects  = total_perfects + p_perfect_clears,
    max_combo_ever  = greatest(max_combo_ever, p_max_combo),
    updated_at      = now()
  where player_id = v_player_id;

  -- 13. Build breakdown for client
  v_breakdown := jsonb_build_object(
    'base',          floor(p_my_score / 10)::int,
    'tetris',        p_tetris_count * 50,
    'combo',         greatest(0, p_max_combo - 2) * 20,
    'perfect',       p_perfect_clears * 200,
    'personal_best', case when v_is_personal_best then 300 else 0 end,
    'win',           case when p_mode = 'battle' and coalesce(v_is_win,false) then 200 else 0 end,
    'win_streak',    case when p_mode = 'battle' then public.win_streak_bonus(v_win_streak) else 0 end,
    'achievement_bonus', v_achievement_xp_bonus
  );

  return jsonb_build_object(
    'xp_breakdown', v_breakdown,
    'xp_gained',    v_xp_delta + v_achievement_xp_bonus,
    'prev_xp',      v_prev_xp,
    'new_xp',       v_new_xp,
    'prev_level',   v_prev_level,
    'new_level',    v_new_level,
    'prev_mmr',     case when p_mode = 'battle' then v_prev_mmr else null end,
    'new_mmr',      case when p_mode = 'battle' then v_my_mmr + v_mmr_delta else null end,
    'mmr_delta',    v_mmr_delta,
    'unlocked',     v_unlocked
  );
end;
$$;

-- Helper: achievement_check — mirrors TS rules
create or replace function public.achievement_check(
  ach_id text,
  p_mode text, p_my_score int, p_tetris_count int, p_max_combo int, p_perfect_clears int,
  p_total_games int, p_total_wins int, p_total_tetrises int, p_total_perfects int,
  p_level int, p_win_streak int
) returns boolean language sql immutable as $$
  select case ach_id
    when 'first_game'    then p_total_games >= 1
    when 'first_win'     then p_mode = 'battle' and p_total_wins >= 1
    when 'first_tetris'  then p_tetris_count >= 1
    when 'first_perfect' then p_perfect_clears >= 1
    when 'first_combo_5' then p_max_combo >= 5
    when 'score_10k'     then p_my_score >= 10000
    when 'score_50k'     then p_my_score >= 50000
    when 'score_100k'    then p_my_score >= 100000
    when 'tetris_double' then p_tetris_count >= 2
    when 'tetris_quad'   then p_tetris_count >= 4
    when 'combo_10'      then p_max_combo >= 10
    when 'combo_15'      then p_max_combo >= 15
    when 'perfect_triple' then p_perfect_clears >= 3
    when 'win_streak_5'  then p_win_streak >= 5
    when 'win_streak_10' then p_win_streak >= 10
    when 'games_10'      then p_total_games >= 10
    when 'games_100'     then p_total_games >= 100
    when 'games_500'     then p_total_games >= 500
    when 'wins_10'       then p_total_wins >= 10
    when 'wins_50'       then p_total_wins >= 50
    when 'wins_100'      then p_total_wins >= 100
    when 'tetrises_50'   then p_total_tetrises >= 50
    when 'tetrises_500'  then p_total_tetrises >= 500
    when 'level_10'      then p_level >= 10
    when 'level_25'      then p_level >= 25
    else false
  end
$$;

grant execute on function public.finalize_game(text, text, uuid, int, int, int, int, int, int) to authenticated;
