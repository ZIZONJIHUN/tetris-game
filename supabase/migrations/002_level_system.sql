-- supabase/migrations/002_level_system.sql

-- 1. Extend game_results with mode + per-game event counts
alter table public.game_results
  add column mode            text not null default 'battle'
    check (mode in ('solo','battle')),
  add column total_lines     int  not null default 0,
  add column tetris_count    int  not null default 0,
  add column max_combo       int  not null default 0,
  add column perfect_clears  int  not null default 0;

-- Solo games have no opponent → loosen NOT NULL
alter table public.game_results
  alter column opponent_score drop not null,
  alter column is_win         drop not null;

-- Idempotency: same (room_id, player_id) cannot be finalized twice
alter table public.game_results
  add constraint game_results_room_player_unique unique (room_id, player_id);

-- Defense in depth: battle mode must have opponent_score and is_win populated
alter table public.game_results
  add constraint game_results_battle_requires_opponent
  check (
    mode = 'solo'
    or (opponent_score is not null and is_win is not null)
  );

-- 2. player_stats — denormalized cache, single source for leaderboards & profile
create table public.player_stats (
  player_id        uuid primary key references public.profiles on delete cascade,
  xp               bigint not null default 0,
  level            int    not null default 1,
  mmr              int    not null default 1200,
  mmr_games        int    not null default 0,
  best_score       int    not null default 0,
  total_games      int    not null default 0,
  total_wins       int    not null default 0,
  total_tetrises   int    not null default 0,
  total_perfects   int    not null default 0,
  max_combo_ever   int    not null default 0,
  active_badge_id  text,
  active_skin_id   text,
  updated_at       timestamptz not null default now()
);

alter table public.player_stats enable row level security;
create policy "stats public read" on public.player_stats for select using (true);
-- No INSERT/UPDATE policies → only security-definer RPC can write

create index player_stats_level_xp_idx   on public.player_stats (level desc, xp desc);
create index player_stats_best_score_idx on public.player_stats (best_score desc);
create index player_stats_mmr_idx        on public.player_stats (mmr desc);

-- 3. achievements catalog
create table public.achievements (
  id             text primary key,
  category       text not null check (category in ('milestone','skill','cumulative')),
  name_en        text not null,
  name_ko        text not null,
  description_en text not null,
  description_ko text not null,
  xp_reward      int  not null default 0,
  badge_label    text,
  skin_key       text,
  sort_order     int  not null default 0
);

alter table public.achievements enable row level security;
create policy "achievements public read" on public.achievements for select using (true);

-- 4. player_achievements (earned records)
create table public.player_achievements (
  player_id      uuid not null references public.profiles on delete cascade,
  achievement_id text not null references public.achievements,
  earned_at      timestamptz not null default now(),
  primary key (player_id, achievement_id)
);

alter table public.player_achievements enable row level security;
create policy "player_achievements public read"
  on public.player_achievements for select using (true);
-- No INSERT policy → only RPC writes

create index player_achievements_by_achievement_idx
  on public.player_achievements (achievement_id);

-- 5. Replace leaderboard_view to use player_stats
drop view if exists public.leaderboard_view;
create view public.leaderboard_view as
select
  p.id           as player_id,
  p.nickname,
  ps.level,
  ps.xp,
  ps.best_score,
  ps.total_wins,
  ps.total_games,
  case when ps.total_games > 0
       then round(ps.total_wins::numeric / ps.total_games * 100, 1)
       else 0 end as win_rate,
  ps.mmr,
  ps.active_badge_id
from public.profiles p
join public.player_stats ps on ps.player_id = p.id
where p.is_guest = false;
