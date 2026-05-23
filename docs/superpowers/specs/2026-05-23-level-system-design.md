# 레벨 시스템 디자인

> 작성일: 2026-05-23
> 상태: 설계 승인 완료, 구현 계획 작성 대기

## 1. 개요

테트리스 게임에 **3-트랙 진행 시스템**을 도입한다.

| 트랙 | 의미 | 오르내림 | 모드 적용 |
|---|---|---|---|
| **XP 레벨** | 누적 플레이 보상 (1~50) | 누적 (떨어지지 않음) | 솔로 + 배틀 |
| **MMR** | 경쟁 실력 지표 (1200 시작) | 승패에 따라 변동 | 배틀만 |
| **업적** | 단계적 목표 달성 (25개) | 한 번 달성 = 영구 보유 | 솔로 + 배틀 |

게스트(채터 계정)는 모든 트랙에서 제외.

## 2. 결정 사항 요약

| 항목 | 결정 |
|---|---|
| XP 곡선 | `xp_to_next(L) = 50 × L²` (점진적 quadratic) |
| 티어 오버레이 | Bronze(1–10) / Silver(11–20) / Gold(21–30) / Platinum(31–40) / Diamond(41–50) |
| XP 소스 | 점수 base + 보너스(테트리스/콤보/퍼펙트/개인최고/승/연승) |
| MMR 방식 | ELO 변형 (점수차를 actual에 반영) |
| 업적 분량 | 25개 (Milestone 5 / Skill 10 / Cumulative 10) |
| 업적 보상 | XP + 배지/칭호 + 보드 스킨 + 디스플레이 목록 (전부) |
| 노출 위치 | 사이드바, 프로필, 게임 종료 모달, 리더보드, 배틀 상대 |
| 시각 효과 | 테트리스/콤보/퍼펙트 발생 시 보드 파티클 |
| 위변조 방지 | 클라 계산은 미리보기, 실제 저장은 서버 RPC가 재계산 |

## 3. 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│ Game Engine (src/game/engine.ts)                        │
│  변경: GameState에 tetrisCount, comboCount, maxCombo,   │
│        perfectClears 추적                                │
│  출력: GameEndStats { score, lines, tetris_count,       │
│        max_combo, perfect_clears }                       │
└─────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Leveling Logic (src/lib/leveling/) — 순수 함수           │
│  - xp.ts: calculateXpGain, levelFromXp, xpToNext        │
│  - mmr.ts: calculateMmrDelta                            │
│  - achievements.ts: checkAchievements                   │
│  PL/pgSQL 미러: calc_xp_gain, calc_mmr_delta,           │
│                  check_new_achievements (RPC 내부)       │
└─────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Supabase RPC: finalize_game(payload)                    │
│  - 단일 진입점, security definer                         │
│  - 입력 sanity 검증 → game_results INSERT               │
│  - 서버에서 XP/MMR/업적 재계산 → player_stats UPDATE     │
│  - 새 업적 player_achievements INSERT                   │
│  - 반환: 화면에 그대로 표시할 breakdown                  │
└─────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Game End Modal: XP 막대 애니메이션, 레벨업 fanfare,      │
│                 업적 토스트                              │
└─────────────────────────────────────────────────────────┘
```

**원칙**:
- 계산 로직을 클라이언트와 서버 모두 호출 가능한 순수 함수로 분리. 같은 공식을 두 곳에 작성하지 않도록 PL/pgSQL은 TypeScript 함수를 SQL로 직역만.
- 게임 엔진은 stats 추적만 늘리고, 레벨링은 외부 모듈이 책임.

## 4. DB 스키마

### 4.1 `game_results` 확장

```sql
alter table public.game_results
  add column mode            text not null default 'battle'
                              check (mode in ('solo','battle')),
  add column total_lines     int  not null default 0,
  add column tetris_count    int  not null default 0,
  add column max_combo       int  not null default 0,
  add column perfect_clears  int  not null default 0;

alter table public.game_results
  alter column opponent_score drop not null,
  alter column is_win         drop not null;

alter table public.game_results
  add constraint game_results_room_unique unique (room_id, player_id);
```

`room_id + player_id` UNIQUE로 RPC 멱등성 확보 (같은 게임 중복 finalize 차단).

### 4.2 신규 `player_stats`

```sql
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
create policy "stats 누구나 조회" on public.player_stats for select using (true);
-- INSERT/UPDATE 정책 없음 → security definer RPC만 쓰기 가능
```

### 4.3 신규 `achievements` (카탈로그)

```sql
create table public.achievements (
  id            text primary key,
  category      text not null check (category in ('milestone','skill','cumulative')),
  name_en       text not null,
  name_ko       text not null,
  description_en text not null,
  description_ko text not null,
  xp_reward     int  not null default 0,
  badge_label   text,
  skin_key      text,
  sort_order    int  not null default 0
);

alter table public.achievements enable row level security;
create policy "업적 카탈로그 공개" on public.achievements for select using (true);
```

### 4.4 신규 `player_achievements`

```sql
create table public.player_achievements (
  player_id      uuid not null references public.profiles on delete cascade,
  achievement_id text not null references public.achievements,
  earned_at      timestamptz not null default now(),
  primary key (player_id, achievement_id)
);

alter table public.player_achievements enable row level security;
create policy "달성 기록 누구나 조회" on public.player_achievements for select using (true);
-- INSERT 정책 없음 → RPC만 기록
```

### 4.5 `leaderboard_view` 재정의

```sql
drop view public.leaderboard_view;
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
```

정렬은 호출부에서 (`order by level desc, xp desc` 또는 `order by best_score desc` 또는 `order by mmr desc`).

## 5. XP / MMR / 업적 공식

### 5.1 XP 획득

```
base_xp        = floor(score / 10)

bonus_xp       = tetris_count       × 50
               + max(0, max_combo-2) × 20      // 3콤보부터 카운트
               + perfect_clears     × 200
               + (is_personal_best  ? 300 : 0)
               + (is_win            ? 200 : 0) // 배틀만
               + win_streak_bonus()

win_streak_bonus():
  연승 횟수 2 → +100
  연승 횟수 3~4 → +200
  연승 횟수 5+ → +500

total_xp_gain  = base_xp + bonus_xp
```

`win_streak`는 `game_results` 에서 player_id의 가장 최근 연속 is_win=true 카운트로 계산 (RPC 내부에서 조회).

**시뮬레이션**:
- 솔로 12,000점, 테트리스 2회, 5콤보, 퍼펙트 1회
  → `1,200 + 100 + 60 + 200 = 1,560 XP`
- 배틀 승리 25,000점, 테트리스 3회, 8콤보, 개인최고, 3연승
  → `2,500 + 150 + 120 + 300 + 200 + 200 = 3,470 XP`

### 5.2 레벨

```
xp_to_next(L)      = 50 × L²
total_xp_for(L)    = 50 × (L-1) × L × (2L-1) / 6
level_from_xp(xp)  = max L (1 ≤ L ≤ 50) s.t. total_xp_for(L) ≤ xp
```

레벨 50이 최대. 추가 XP는 누적되되 레벨은 50에서 고정.

레벨 50 도달 후에도 XP는 계속 누적되되 `level` 캐시는 50에서 고정.

**티어 매핑** (계산: `total_xp_for(L) = 50 × (L-1)L(2L-1)/6`):

| 티어 | 레벨 | 도달 누적 XP |
|---|---|---|
| Bronze | 1–10 | 0 ~ 19,250 |
| Silver | 11–20 | 19,250 ~ 143,500 |
| Gold | 21–30 | 143,500 ~ 472,750 |
| Platinum | 31–40 | 472,750 ~ 1,107,000 |
| Diamond | 41–50 | 1,107,000 ~ 2,146,250 |

### 5.3 MMR 델타 (배틀만)

```
expected    = 1 / (1 + 10^((opp_mmr - my_mmr) / 400))
score_ratio = (my_score - opp_score) / (my_score + opp_score)
actual      = (score_ratio + 1) / 2

K = 64 if mmr_games < 10 else 32   // 배치 10판은 가중치 2배
delta = round(K × (actual - expected))
delta = clamp(delta, -50, +50)

new_mmr = max(0, my_mmr + delta)
```

배치 10판 동안은 변동이 크고, 이후 안정화.

### 5.4 업적 25개 (출시 분량)

#### Milestone (첫 경험) — 5개

| id | 이름(ko) | 조건 | XP | 배지 | 스킨 |
|---|---|---|---|---|---|
| `first_game` | 첫 발걸음 | 게임 1판 완료 | 200 | – | – |
| `first_win` | 첫 승리 | 배틀 1승 | 300 | "신예" | – |
| `first_tetris` | 첫 테트리스 | 1판에 4줄 클리어 1회 | 300 | "테트리미노" | – |
| `first_perfect` | 첫 퍼펙트 | 1판에 퍼펙트 클리어 1회 | 500 | "청소부" | – |
| `first_combo_5` | 첫 콤보 | 1판에 5콤보 | 300 | – | – |

#### Skill (1판 성과) — 10개

| id | 이름(ko) | 조건 | XP | 배지 | 스킨 |
|---|---|---|---|---|---|
| `score_10k` | 만점 클럽 | 1판 10,000점 | 500 | – | – |
| `score_50k` | 5만 클럽 | 1판 50,000점 | 2,000 | "5만 클럽" | – |
| `score_100k` | 10만 클럽 | 1판 100,000점 | 5,000 | "10만 클럽" | "골드 블록" |
| `tetris_double` | 더블 테트리스 | 1판 테트리스 2회 | 1,000 | – | – |
| `tetris_quad` | 쿼드 테트리스 | 1판 테트리스 4회 | 3,000 | "테트리스 마스터" | – |
| `combo_10` | 콤보 마스터 | 1판 10콤보 | 3,000 | – | "네온 핑크" |
| `combo_15` | 콤보 황제 | 1판 15콤보 | 5,000 | "콤보 황제" | – |
| `perfect_triple` | 트리플 퍼펙트 | 1판 퍼펙트 클리어 3회 | 3,000 | "정결" | – |
| `win_streak_5` | 5연승 | 5연승 달성 | 2,000 | – | – |
| `win_streak_10` | 10연승 | 10연승 달성 | 5,000 | "불괴의 방패" | – |

#### Cumulative (누적) — 10개

| id | 이름(ko) | 조건 | XP | 배지 | 스킨 |
|---|---|---|---|---|---|
| `games_10` | 입문자 | 누적 10판 | 300 | – | – |
| `games_100` | 단골 | 누적 100판 | 1,500 | – | – |
| `games_500` | 중독자 | 누적 500판 | 5,000 | "중독자" | "다크 모드 보드" |
| `wins_10` | 10승 | 누적 10승 | 500 | – | – |
| `wins_50` | 50승 | 누적 50승 | 2,000 | – | – |
| `wins_100` | 백전노장 | 누적 100승 | 5,000 | "백전노장" | – |
| `tetrises_50` | 테트리스 50 | 누적 테트리스 50회 | 1,000 | – | – |
| `tetrises_500` | 테트리스 500 | 누적 테트리스 500회 | 5,000 | – | "갤럭시 보드" |
| `level_10` | 실버 도달 | XP 레벨 10 | 0 | "실버" | "실버 보드" |
| `level_25` | 골드 도달 | XP 레벨 25 | 0 | "골드" | "골드 보드" |

## 6. 서버 RPC `finalize_game`

### 6.1 시그니처

```typescript
// 입력 (클라이언트 → 서버)
type FinalizeGamePayload = {
  mode: 'solo' | 'battle'
  room_id: string              // 솔로는 클라이언트가 'solo:<uuid>' 형식으로 생성
  opponent_id: string | null   // 솔로는 null
  my_score: number
  opponent_score: number | null
  total_lines: number
  tetris_count: number
  max_combo: number
  perfect_clears: number
}

// 반환 (서버 → 클라이언트, GameEndModal에 그대로 표시)
type FinalizeGameResult = {
  xp_breakdown: {
    base: number
    tetris: number
    combo: number
    perfect: number
    personal_best: number
    win: number
    win_streak: number
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
```

### 6.2 실행 단계

1. 호출자 인증 (`auth.uid()`). 미인증 → reject.
2. `profiles.is_guest` 조회. 게스트 → reject.
3. 입력 sanity 체크:
   - `my_score`: 0 ≤ x ≤ 9,999,999
   - `tetris_count × 4 ≤ total_lines`
   - `max_combo ≤ total_lines`
   - `perfect_clears ≤ total_lines` (퍼펙트도 라인 클리어이므로 라인 수 초과 불가)
   - `opponent_score`: 있으면 0 이상
4. 배틀이면 `opponent_id` 로 `player_stats` 조회 — 미존재 시 1200으로 가정 (첫 게임 상대일 수 있음)
5. `game_results` INSERT (확장 컬럼 포함). UNIQUE 충돌 시 reject (멱등).
6. 서버 SQL 함수로 1차 재계산:
   - `is_personal_best = my_score > player_stats.best_score`
   - `win_streak = recent_consecutive_battle_wins(player_id)` — `game_results` 에서 `mode='battle' AND is_win IS NOT NULL` 만 필터, 가장 최근부터 연속 `is_win=true` 카운트 (이번 게임 INSERT 후 기준)
   - `xp_delta = calc_xp_gain(...)`
   - `mmr_delta = calc_mmr_delta(...)` (배틀만)
7. 가상 갱신 stats 계산 (DB 쓰기 전 단계):
   - `provisional = {
        xp: player_stats.xp + xp_delta,
        level: level_from_xp(provisional.xp),
        total_games: +1, total_wins: +is_win,
        total_tetrises: +tetris_count, total_perfects: +perfect_clears,
        max_combo_ever: max(...), best_score: max(...)
     }`
8. 업적 체크 (`check_new_achievements`):
   - 이미 `player_achievements` 에 있는 건 제외
   - 1판 성과 업적은 RPC 입력 + provisional 게임 stats 비교
   - 누적/레벨 업적은 provisional total / level 임계값 비교
   - `achievement_xp_bonus = sum(unlocked.xp_reward)`
9. 최종 stats 계산 + 단일 UPDATE:
   - `final_xp = provisional.xp + achievement_xp_bonus`
   - `final_level = level_from_xp(final_xp)`
   - `player_stats` 한 번에 UPDATE (위 모든 필드 + mmr + mmr_games)
10. `player_achievements` INSERT (`on conflict do nothing`)
11. 반환 페이로드 구성. `xp_breakdown` 에 업적 보너스 합도 별도 항목으로 노출.

**주의**: 한 게임에서 받은 업적 XP가 추가 레벨업을 또 유발할 수 있으나 (예: 5,000 XP 업적이 두 레벨 동시 점프), 이 경우 추가로 트리거될 레벨 업적(`level_10`, `level_25`)은 다음 게임에서 검출됨. v1은 단일 패스로 단순화.

### 6.3 솔로 모드 처리

- `room_id = 'solo:' || gen_random_uuid()` 클라이언트에서 생성
- `opponent_id`, `opponent_score`, `is_win` 모두 null
- MMR 계산 스킵
- XP 보너스에서 `is_win`, `win_streak` 항목 0

### 6.4 동시성

- `player_stats` 단일 행 UPDATE → PG 직렬화로 안전
- `player_achievements` (player_id, achievement_id) PK 멱등
- `game_results` (room_id, player_id) UNIQUE 멱등

### 6.5 백필 마이그레이션 (출시 시 1회)

기존 유저에게 0XP로 시작시키면 어색하므로 한 번 환산:

```sql
-- 기존 game_results 기반 player_stats 초기화
insert into public.player_stats (player_id, xp, level, best_score, total_games, total_wins)
select
  player_id,
  sum(my_score / 10)::bigint    as xp,        -- 보너스 없이 점수 기반만
  least(50, ...)                 as level,
  max(my_score)                  as best_score,
  count(*)                       as total_games,
  count(*) filter (where is_win) as total_wins
from public.game_results
where player_id is not null
group by player_id
on conflict (player_id) do nothing;
```

기존 데이터에 `tetris_count` 등이 없으므로 보너스는 0. 명시적으로 release note에 안내.

## 7. 클라이언트 변경

### 7.1 게임 엔진 (`src/game/engine.ts`)

`GameState` 확장:

```typescript
export type GameState = {
  // 기존 필드 유지
  ...
  // 신규
  tetrisCount: number      // 누적 4-line clear 횟수
  comboCount: number       // 현재 연속 라인 클리어 수 (0이면 리셋)
  maxCombo: number         // 게임 중 최대 콤보
  perfectClears: number    // 누적 퍼펙트 클리어 횟수
}
```

`lockAndSpawn` 수정:
- `linesCleared === 4` → `tetrisCount += 1`
- `linesCleared > 0` → `comboCount += 1`, `maxCombo = max(...)`
- `linesCleared === 0` → `comboCount = 0`
- 라인 클리어 후 보드 전체가 빈칸 → `perfectClears += 1`

### 7.2 레벨링 모듈 (`src/lib/leveling/`)

신규 파일 구성:
- `xp.ts` — `calculateXpGain`, `levelFromXp`, `xpToNext`, `totalXpFor`, `tierForLevel`
- `mmr.ts` — `calculateMmrDelta`
- `achievements.ts` — `checkAchievements(stats, snapshot)` 클라 미리보기용
- 각 파일에 `.test.ts` 단위 테스트

### 7.3 컴포넌트 변경

| 컴포넌트 | 변경 |
|---|---|
| `UserMiniProfile.tsx` | 레벨 배지 + XP 진행 막대. Collapsed 모드는 아바타 위 레벨 숫자 오버레이 |
| `/profile` | 레벨 패널(레벨/티어/XP 진행/MMR) + 업적 그리드(25개, 잠금/해제 표시) |
| `/leaderboard` | 탭 분리 (Best Score / Level) + 행에 레벨 배지 |
| `OpponentMini.tsx` | 상대 레벨 배지 |
| `GameEndModal.tsx` (신규) | XP breakdown, 막대 애니메이션, 레벨업 fanfare, 업적 토스트 |
| `TetrisBoard.tsx` | 보너스 이벤트 시 파티클 효과 콜백 |
| `src/lib/i18n.ts` | 레벨/XP/티어/업적 25개 한·영 키 추가 |

### 7.4 파티클 효과

- **테트리스**: 시안 파티클 burst + "TETRIS!" 텍스트 fade-out
- **5콤보 이상**: 콤보 카운터 화면 중앙 큰 폰트로 pulse
- **퍼펙트 클리어**: 화면 전체 white flash + 골드 파티클 + "PERFECT CLEAR" 텍스트

구현은 순수 CSS keyframe + DOM 노드 합성으로 시작. 성능 이슈 시 framer-motion 도입 검토.

## 8. 롤아웃 단계

### Phase 1 — 기반 (사용자 노출 없음)
- Supabase 마이그레이션 작성 및 실행
- `achievements` 25행 시드
- 게임 엔진 stats 추적 확장 + 단위 테스트
- 레벨링 순수 함수 + 단위 테스트
- PL/pgSQL 미러 함수

### Phase 2 — RPC + 게임 종료 흐름 (XP 노출 시작)
- `finalize_game` RPC 구현
- 솔로/배틀 종료 hook에서 RPC 호출
- `GameEndModal` 구현 (XP breakdown, 레벨업 fanfare)
- 통합 테스트
- 백필 마이그레이션 실행

### Phase 3 — 노출 컴포넌트
- 사이드바, 프로필, 리더보드, 배틀 상대 UI
- i18n 확장 (업적 25개 이름·설명)

### Phase 4 — 폴리시
- 파티클 효과
- 배지/스킨 인벤토리 UI + active 토글
- 보드 스킨 매핑

## 9. 운영 / 모니터링

- **롤백 안전성**: Phase 2 머지 후 문제 시 `finalize_game` RPC만 비활성화 (게임은 정상 동작, XP만 안 쌓임)
- **메트릭**:
  - RPC 호출 성공률
  - 평균 XP/판 (모드별)
  - 업적 달성률 (출시 후 1주, 1개월)
  - 레벨 분포 (장기 트렌드)
- 비정상 데이터 (예: 1판 XP > 100,000) → Supabase logs에서 sanity check 위반 카운트 모니터링

## 10. 미해결 / 향후 고려

- **배지/스킨 인벤토리 UI**: 출시는 표시만, active 토글은 Phase 4. 다음 spec에서 다룰 수 있음.
- **시즌제**: 현재 누적 단일 트랙. 향후 시즌 MMR 리셋, 시즌 한정 업적 등 도입 시 별도 spec.
- **친구 시스템 / 비교**: 친구 레벨 비교 기능은 본 spec 범위 외.
- **보드 스킨 종류**: 출시 시 `skin_key` 값 6개 (골드 블록, 네온 핑크, 다크 모드 보드, 갤럭시 보드, 실버 보드, 골드 보드). 실제 렌더링은 `BlockColors` 등 별도 매핑 테이블 필요 — Phase 4에서 정의.
