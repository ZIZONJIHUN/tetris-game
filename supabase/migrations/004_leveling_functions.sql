-- supabase/migrations/004_leveling_functions.sql

-- xp_to_next(L) = 50 × L²
create or replace function public.xp_to_next(level int) returns bigint
  language sql immutable as $$
    select 50::bigint * level * level
  $$;

-- total_xp_for(L) = sum of 50×n² for n=1..L-1
create or replace function public.total_xp_for(level int) returns bigint
  language sql immutable as $$
    select case when level <= 1 then 0::bigint
                else (50::bigint * (level - 1) * level * (2 * (level - 1) + 1)) / 6
           end
  $$;

-- level_from_xp(xp) → integer level capped at 50
create or replace function public.level_from_xp(xp bigint) returns int
  language plpgsql immutable as $$
declare
  lo int := 1;
  hi int := 50;
  mid int;
begin
  while lo < hi loop
    mid := (lo + hi + 1) / 2;
    if public.total_xp_for(mid) <= xp then
      lo := mid;
    else
      hi := mid - 1;
    end if;
  end loop;
  return lo;
end;
$$;

-- Win streak bonus tiers
create or replace function public.win_streak_bonus(streak int) returns int
  language sql immutable as $$
    select case
      when streak >= 5 then 500
      when streak >= 3 then 200
      when streak >= 2 then 100
      else 0
    end
  $$;

-- XP gain — mirrors calculateXpGain in TS
create or replace function public.calc_xp_gain(
  mode text, my_score int, tetris_count int, max_combo int, perfect_clears int,
  is_personal_best boolean, is_win boolean, win_streak int
) returns int language sql immutable as $$
  select
    floor(my_score / 10)::int
    + tetris_count * 50
    + greatest(0, max_combo - 2) * 20
    + perfect_clears * 200
    + case when is_personal_best then 300 else 0 end
    + case when mode = 'battle' and is_win then 200 else 0 end
    + case when mode = 'battle' then public.win_streak_bonus(win_streak) else 0 end
$$;

-- MMR delta — mirrors calculateMmrDelta in TS
-- Note: placement (mmr_games < 10) doubles the ROUNDED base delta, not K directly.
-- This keeps server and client in sync (see src/lib/leveling/mmr.ts).
create or replace function public.calc_mmr_delta(
  my_score int, opp_score int, my_mmr int, opp_mmr int, mmr_games int
) returns int language plpgsql immutable as $$
declare
  total_score int := my_score + opp_score;
  expected float;
  actual float;
  base_raw int;
  raw int;
begin
  if total_score = 0 then return 0; end if;
  expected := 1.0 / (1.0 + power(10.0, (opp_mmr - my_mmr)::float / 400.0));
  actual := ((my_score - opp_score)::float / total_score + 1) / 2;
  base_raw := round(32 * (actual - expected))::int;
  raw := case when mmr_games < 10 then base_raw * 2 else base_raw end;
  return greatest(-50, least(50, raw));
end;
$$;

-- Recent consecutive battle wins for a player (including the just-inserted row)
create or replace function public.recent_consecutive_battle_wins(p_player_id uuid)
returns int language sql stable as $$
  with ordered as (
    select is_win,
           row_number() over (order by played_at desc) as rn
    from public.game_results
    where player_id = p_player_id
      and mode = 'battle'
      and is_win is not null
  ),
  first_loss as (
    select coalesce(min(rn), 999999) as loss_rn
    from ordered
    where is_win = false
  )
  select coalesce(count(*), 0)::int
  from ordered, first_loss
  where ordered.rn < first_loss.loss_rn
    and ordered.is_win = true
$$;
