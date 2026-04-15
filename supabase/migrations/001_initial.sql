-- profiles 테이블
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  nickname    text not null,
  is_guest    boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "누구나 프로필 조회 가능"
  on public.profiles for select using (true);

create policy "본인 프로필만 생성 가능"
  on public.profiles for insert with check (auth.uid() = id);

create policy "본인 프로필만 수정 가능"
  on public.profiles for update using (auth.uid() = id);

-- game_results 테이블
create table public.game_results (
  id              uuid primary key default gen_random_uuid(),
  room_id         text not null,
  player_id       uuid references public.profiles on delete set null,
  opponent_id     uuid references public.profiles on delete set null,
  my_score        int not null,
  opponent_score  int not null,
  is_win          boolean not null,
  played_at       timestamptz not null default now()
);

alter table public.game_results enable row level security;

create policy "본인 게임 결과만 조회 가능"
  on public.game_results for select using (auth.uid() = player_id);

create policy "본인 게임 결과만 저장 가능"
  on public.game_results for insert with check (auth.uid() = player_id);

-- 리더보드 뷰
create view public.leaderboard_view as
select
  p.id            as player_id,
  p.nickname,
  max(gr.my_score)                                              as best_score,
  count(*) filter (where gr.is_win)                             as total_wins,
  count(*)                                                      as total_games,
  round(
    count(*) filter (where gr.is_win)::numeric
    / nullif(count(*), 0) * 100,
    1
  )                                                             as win_rate
from public.profiles p
join public.game_results gr on gr.player_id = p.id
where p.is_guest = false
group by p.id, p.nickname
order by best_score desc;
