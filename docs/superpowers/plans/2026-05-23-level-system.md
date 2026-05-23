# Level System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-track progression system (XP level, battle MMR, 25 achievements) with server-side enforcement and full UI exposure.

**Architecture:** Game engine emits stats; pure-TS leveling functions compute XP/MMR/achievements; a Supabase RPC (`finalize_game`) re-computes the same in PL/pgSQL and is the only writer of `player_stats` / `player_achievements`. UI surfaces level/XP/MMR in sidebar, profile, game-end modal, and leaderboard.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + RPC), Jest, TypeScript 5, Tailwind 4.

**Reference:** `docs/superpowers/specs/2026-05-23-level-system-design.md`

---

## Phase 1 — Foundation (no user-visible changes)

### Task 1.1: DB migration — schema changes

**Files:**
- Create: `supabase/migrations/002_level_system.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
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

-- 5. Replace leaderboard_view to use player_stats
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

- [ ] **Step 2: Apply migration to Supabase**

Run via Supabase SQL editor (or `supabase db push` if CLI is set up). After applying:

```sql
select column_name from information_schema.columns where table_name = 'game_results';
-- Expected: includes mode, total_lines, tetris_count, max_combo, perfect_clears

select * from public.player_stats limit 0;
-- Expected: returns empty result with new columns
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_level_system.sql
git commit -m "feat(db): add level system schema (player_stats, achievements, extended game_results)"
```

---

### Task 1.2: Seed 25 achievements

**Files:**
- Create: `supabase/migrations/003_seed_achievements.sql`

- [ ] **Step 1: Write seed SQL with all 25 rows**

```sql
-- supabase/migrations/003_seed_achievements.sql

insert into public.achievements (id, category, name_en, name_ko, description_en, description_ko, xp_reward, badge_label, skin_key, sort_order) values
-- Milestone (5)
('first_game',     'milestone', 'First Steps',   '첫 발걸음',     'Finish your first game',         '첫 게임 완료',                   200,    null,              null,                1),
('first_win',      'milestone', 'First Victory', '첫 승리',       'Win your first battle',          '배틀 첫 승리',                   300,    'Rookie',          null,                2),
('first_tetris',   'milestone', 'First Tetris',  '첫 테트리스',   'Clear 4 lines at once',          '한 판에 4줄 동시 클리어',        300,    'Tetrimino',       null,                3),
('first_perfect',  'milestone', 'First Perfect', '첫 퍼펙트',     'First perfect clear in a game',  '한 판에 퍼펙트 클리어 1회',      500,    'Cleaner',         null,                4),
('first_combo_5',  'milestone', 'First Combo',   '첫 콤보',       'Reach a 5-line combo',           '한 판에 5콤보',                  300,    null,              null,                5),

-- Skill (10)
('score_10k',      'skill',     '10K Club',      '만점 클럽',     'Score 10,000 in a single game',  '한 판 10,000점',                 500,    null,              null,               10),
('score_50k',      'skill',     '50K Club',      '5만 클럽',      'Score 50,000 in a single game',  '한 판 50,000점',                 2000,   '50K Club',        null,               11),
('score_100k',     'skill',     '100K Club',     '10만 클럽',     'Score 100,000 in a single game', '한 판 100,000점',                5000,   '100K Club',       'gold_block',       12),
('tetris_double',  'skill',     'Double Tetris', '더블 테트리스', 'Two tetrises in one game',       '한 판 테트리스 2회',             1000,   null,              null,               13),
('tetris_quad',    'skill',     'Quad Tetris',   '쿼드 테트리스', 'Four tetrises in one game',      '한 판 테트리스 4회',             3000,   'Tetris Master',   null,               14),
('combo_10',       'skill',     'Combo Master',  '콤보 마스터',   'Reach a 10-line combo',          '한 판 10콤보',                   3000,   null,              'neon_pink',        15),
('combo_15',       'skill',     'Combo Emperor', '콤보 황제',     'Reach a 15-line combo',          '한 판 15콤보',                   5000,   'Combo Emperor',   null,               16),
('perfect_triple', 'skill',     'Triple Perfect','트리플 퍼펙트', 'Three perfect clears in a game', '한 판 퍼펙트 클리어 3회',        3000,   'Pristine',        null,               17),
('win_streak_5',   'skill',     '5-Win Streak',  '5연승',         'Win 5 battles in a row',         '5연승 달성',                     2000,   null,              null,               18),
('win_streak_10',  'skill',     '10-Win Streak', '10연승',        'Win 10 battles in a row',        '10연승 달성',                    5000,   'Unbreakable',     null,               19),

-- Cumulative (10)
('games_10',       'cumulative','Beginner',      '입문자',        'Play 10 games total',            '누적 10판',                      300,    null,              null,               30),
('games_100',      'cumulative','Regular',       '단골',          'Play 100 games total',           '누적 100판',                     1500,   null,              null,               31),
('games_500',      'cumulative','Addict',        '중독자',        'Play 500 games total',           '누적 500판',                     5000,   'Addict',          'dark_board',       32),
('wins_10',        'cumulative','10 Wins',       '10승',          'Win 10 battles total',           '누적 10승',                      500,    null,              null,               33),
('wins_50',        'cumulative','50 Wins',       '50승',          'Win 50 battles total',           '누적 50승',                      2000,   null,              null,               34),
('wins_100',       'cumulative','Veteran',       '백전노장',      'Win 100 battles total',          '누적 100승',                     5000,   'Veteran',         null,               35),
('tetrises_50',    'cumulative','Tetris 50',     '테트리스 50',   '50 total tetrises',              '누적 테트리스 50회',             1000,   null,              null,               36),
('tetrises_500',   'cumulative','Tetris 500',    '테트리스 500',  '500 total tetrises',             '누적 테트리스 500회',            5000,   null,              'galaxy_board',     37),
('level_10',       'cumulative','Silver Tier',   '실버 도달',     'Reach XP level 10',              'XP 레벨 10 도달',                0,      'Silver',          'silver_board',     38),
('level_25',       'cumulative','Gold Tier',     '골드 도달',     'Reach XP level 25',              'XP 레벨 25 도달',                0,      'Gold',            'gold_board',       39);
```

- [ ] **Step 2: Apply and verify**

```sql
select count(*) from public.achievements;
-- Expected: 25

select category, count(*) from public.achievements group by category;
-- Expected: milestone=5, skill=10, cumulative=10
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_seed_achievements.sql
git commit -m "feat(db): seed 25 achievements (5 milestone, 10 skill, 10 cumulative)"
```

---

### Task 1.3: Extend GameState type with event counters

**Files:**
- Modify: `src/game/types.ts`

- [ ] **Step 1: Add new fields to GameState**

```typescript
// src/game/types.ts
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

export type Piece = {
  type: PieceType
  rotation: 0 | 1 | 2 | 3
  x: number
  y: number
}

export type GameStatus = 'idle' | 'playing' | 'over'

export type GameState = {
  board: number[][]
  currentPiece: Piece
  holdPiece: Piece | null
  holdUsed: boolean
  nextPieces: Piece[]
  pieceBag: PieceType[]
  ghostY: number
  score: number
  lines: number
  level: number
  speed: number
  status: GameStatus
  flashRows: number[]
  // === level-system additions ===
  tetrisCount: number     // # of 4-line clears this game
  comboCount: number      // current consecutive-clear streak (0 if last lock didn't clear)
  maxCombo: number        // peak comboCount this game
  perfectClears: number   // # of clears that emptied the board this game
}

export type BroadcastGameState = {
  board: number[][]
  score: number
  lines: number
  level: number
}
```

- [ ] **Step 2: Initialize new fields in createInitialState**

In `src/game/engine.ts`, modify the `createInitialState` return object to include the four new fields:

```typescript
// src/game/engine.ts — inside createInitialState, replace the final return:
  return {
    board,
    currentPiece,
    holdPiece: null,
    holdUsed: false,
    nextPieces,
    pieceBag: bag4,
    ghostY,
    score: 0,
    lines: 0,
    level: 1,
    speed: 1000,
    status: 'idle',
    flashRows: [],
    tetrisCount: 0,
    comboCount: 0,
    maxCombo: 0,
    perfectClears: 0,
  }
```

- [ ] **Step 3: Run existing tests to ensure no regressions**

```bash
npm test -- --testPathPattern=engine.test
```

Expected: All existing engine tests pass (new fields default to 0 / unused).

- [ ] **Step 4: Commit**

```bash
git add src/game/types.ts src/game/engine.ts
git commit -m "feat(engine): add tetrisCount, comboCount, maxCombo, perfectClears to GameState"
```

---

### Task 1.4: Track event counters in lockAndSpawn

**Files:**
- Modify: `src/game/engine.ts`

- [ ] **Step 1: Write failing tests for new counters**

Append to `src/__tests__/game/engine.test.ts`:

```typescript
describe('event counters', () => {
  function setupBoardForLineClears(lines: number): GameState {
    // Helper: build a state where the next lockAndSpawn will clear `lines` rows
    // by pre-filling rows just under the spawn area with all cells except col 0.
    // (Real test will use I-piece in column 0 to drop down and complete rows.)
    // For brevity, we drive via crafted state in each test below.
    return createInitialState(createBag())
  }

  it('increments tetrisCount when 4 lines clear at once', () => {
    // Build a board where bottom 4 rows are filled except col 0
    let state = createInitialState(createBag())
    state = startGame(state)
    state = {
      ...state,
      board: [
        ...Array.from({ length: 16 }, () => emptyRow()),
        Array(10).fill(0).map((_, i) => i === 0 ? 0 : 1),
        Array(10).fill(0).map((_, i) => i === 0 ? 0 : 1),
        Array(10).fill(0).map((_, i) => i === 0 ? 0 : 1),
        Array(10).fill(0).map((_, i) => i === 0 ? 0 : 1),
      ],
      currentPiece: { type: 'I', rotation: 1, x: 0, y: 0 },
      tetrisCount: 0,
      comboCount: 0,
      maxCombo: 0,
      perfectClears: 0,
    }
    state = hardDrop(state)
    expect(state.tetrisCount).toBe(1)
    expect(state.maxCombo).toBe(1)
    expect(state.comboCount).toBe(1)
  })

  it('does not increment tetrisCount when fewer than 4 lines clear', () => {
    let state = createInitialState(createBag())
    state = startGame(state)
    state = {
      ...state,
      board: [
        ...Array.from({ length: 19 }, () => emptyRow()),
        Array(10).fill(0).map((_, i) => i === 0 ? 0 : 1),
      ],
      currentPiece: { type: 'I', rotation: 1, x: 0, y: 0 },
      tetrisCount: 0,
      comboCount: 0,
      maxCombo: 0,
      perfectClears: 0,
    }
    state = hardDrop(state)
    expect(state.tetrisCount).toBe(0)
    expect(state.comboCount).toBe(1)
  })

  it('resets comboCount when a lock clears no lines', () => {
    let state = createInitialState(createBag())
    state = startGame(state)
    state = { ...state, comboCount: 5, maxCombo: 5 }
    // Drop a piece on an empty board → no line cleared
    state = hardDrop(state)
    expect(state.comboCount).toBe(0)
    expect(state.maxCombo).toBe(5)  // peak preserved
  })

  it('increments perfectClears when the board is fully empty after clear', () => {
    let state = createInitialState(createBag())
    state = startGame(state)
    state = {
      ...state,
      board: [
        ...Array.from({ length: 19 }, () => emptyRow()),
        Array(10).fill(0).map((_, i) => i === 0 ? 0 : 1),
      ],
      currentPiece: { type: 'I', rotation: 1, x: 0, y: 0 },
      perfectClears: 0,
    }
    state = hardDrop(state)
    // After hard-drop + clear, board should be entirely empty
    expect(state.perfectClears).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=engine.test -t "event counters"
```

Expected: All 4 tests FAIL (counters never increment).

- [ ] **Step 3: Update lockAndSpawn to maintain counters**

In `src/game/engine.ts`, replace the entire `lockAndSpawn` function:

```typescript
function lockAndSpawn(state: GameState): GameState {
  const lockedState = lockPiece(state)
  const { board: clearedBoard, linesCleared } = clearLines(lockedState.board)

  const newLines = state.lines + linesCleared
  const newLevel = calcLevel(newLines)
  const newScore = lockedState.score + calcScore(linesCleared, newLevel, 0)
  const newSpeed = calcSpeed(newLevel)

  // === level-system counters ===
  const newTetrisCount = state.tetrisCount + (linesCleared === 4 ? 1 : 0)
  const newComboCount  = linesCleared > 0 ? state.comboCount + 1 : 0
  const newMaxCombo    = Math.max(state.maxCombo, newComboCount)
  const isBoardEmpty   = clearedBoard.every(row => row.every(cell => cell === 0))
  const newPerfectClears = state.perfectClears + (linesCleared > 0 && isBoardEmpty ? 1 : 0)

  const newCurrentPiece: Piece = {
    ...state.nextPieces[0],
    rotation: 0,
    x: SPAWN_X,
    y: SPAWN_Y,
  }

  const { piece: newNextType, bag: newBag } = popPiece(state.pieceBag)
  const newNextPieces: Piece[] = [
    ...state.nextPieces.slice(1),
    { type: newNextType, rotation: 0, x: SPAWN_X, y: SPAWN_Y },
  ]

  const isOver = !isValidPosition(clearedBoard, newCurrentPiece.type, 0, SPAWN_X, SPAWN_Y)
  const ghostY = isOver
    ? SPAWN_Y
    : calcGhostY(clearedBoard, newCurrentPiece.type, 0, SPAWN_X, SPAWN_Y)

  return {
    ...lockedState,
    board: clearedBoard,
    currentPiece: newCurrentPiece,
    nextPieces: newNextPieces,
    pieceBag: newBag,
    ghostY,
    score: newScore,
    lines: newLines,
    level: newLevel,
    speed: newSpeed,
    status: isOver ? 'over' : state.status,
    flashRows: [],
    tetrisCount: newTetrisCount,
    comboCount: newComboCount,
    maxCombo: newMaxCombo,
    perfectClears: newPerfectClears,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=engine.test
```

Expected: All tests pass (existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts src/__tests__/game/engine.test.ts
git commit -m "feat(engine): track tetrisCount, combo streak, and perfectClears per game"
```

---

### Task 1.5: Leveling module — XP and level functions

**Files:**
- Create: `src/lib/leveling/types.ts`
- Create: `src/lib/leveling/xp.ts`
- Create: `src/lib/leveling/xp.test.ts`

- [ ] **Step 1: Define shared types**

```typescript
// src/lib/leveling/types.ts
export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'

export type GameMode = 'solo' | 'battle'

export type GameEndStats = {
  mode: GameMode
  myScore: number
  opponentScore: number | null
  totalLines: number
  tetrisCount: number
  maxCombo: number
  perfectClears: number
}

export type XpBreakdown = {
  base: number
  tetris: number
  combo: number
  perfect: number
  personalBest: number
  win: number
  winStreak: number
  achievementBonus: number
}

export const MAX_LEVEL = 50
export const XP_COEFFICIENT = 50
```

- [ ] **Step 2: Write failing tests for XP functions**

```typescript
// src/lib/leveling/xp.test.ts
import { calculateXpGain, levelFromXp, xpToNext, totalXpFor, tierForLevel } from './xp'
import { GameEndStats } from './types'

describe('xpToNext', () => {
  it('returns 50×L² for the gap from L to L+1', () => {
    expect(xpToNext(1)).toBe(50)
    expect(xpToNext(2)).toBe(200)
    expect(xpToNext(10)).toBe(5000)
    expect(xpToNext(20)).toBe(20000)
  })
})

describe('totalXpFor', () => {
  it('returns cumulative XP required to reach level L', () => {
    expect(totalXpFor(1)).toBe(0)
    expect(totalXpFor(2)).toBe(50)
    expect(totalXpFor(11)).toBe(19250)  // sum of 50×n² for n=1..10
    expect(totalXpFor(21)).toBe(143500)
  })
})

describe('levelFromXp', () => {
  it('returns 1 for 0 XP', () => {
    expect(levelFromXp(0)).toBe(1)
  })
  it('returns the highest L such that totalXpFor(L) <= xp', () => {
    expect(levelFromXp(49)).toBe(1)
    expect(levelFromXp(50)).toBe(2)
    expect(levelFromXp(249)).toBe(2)
    expect(levelFromXp(250)).toBe(3)
    expect(levelFromXp(19249)).toBe(10)
    expect(levelFromXp(19250)).toBe(11)
  })
  it('caps at MAX_LEVEL (50)', () => {
    expect(levelFromXp(999999999)).toBe(50)
  })
})

describe('tierForLevel', () => {
  it.each([
    [1, 'Bronze'], [10, 'Bronze'],
    [11, 'Silver'], [20, 'Silver'],
    [21, 'Gold'], [30, 'Gold'],
    [31, 'Platinum'], [40, 'Platinum'],
    [41, 'Diamond'], [50, 'Diamond'],
  ])('level %i → %s', (level, tier) => {
    expect(tierForLevel(level)).toBe(tier)
  })
})

describe('calculateXpGain', () => {
  const baseStats: GameEndStats = {
    mode: 'solo',
    myScore: 12000,
    opponentScore: null,
    totalLines: 30,
    tetrisCount: 2,
    maxCombo: 5,
    perfectClears: 1,
  }

  it('solo example: 12000 score + 2 tetris + 5 combo + 1 perfect = 1560 XP', () => {
    const result = calculateXpGain(baseStats, { isPersonalBest: false, isWin: false, winStreak: 0 })
    // base 1200 + tetris 100 + combo (5-2)*20=60 + perfect 200 = 1560
    expect(result.total).toBe(1560)
    expect(result.breakdown.base).toBe(1200)
    expect(result.breakdown.tetris).toBe(100)
    expect(result.breakdown.combo).toBe(60)
    expect(result.breakdown.perfect).toBe(200)
  })

  it('battle example: win + personal best + 3-win streak adds bonuses', () => {
    const stats: GameEndStats = {
      mode: 'battle',
      myScore: 25000,
      opponentScore: 18000,
      totalLines: 50,
      tetrisCount: 3,
      maxCombo: 8,
      perfectClears: 0,
    }
    const result = calculateXpGain(stats, { isPersonalBest: true, isWin: true, winStreak: 3 })
    // base 2500 + tetris 150 + combo (8-2)*20=120 + perfect 0
    //   + personalBest 300 + win 200 + winStreak(3) 200 = 3470
    expect(result.total).toBe(3470)
    expect(result.breakdown.personalBest).toBe(300)
    expect(result.breakdown.win).toBe(200)
    expect(result.breakdown.winStreak).toBe(200)
  })

  it('combo below 3 grants no combo bonus', () => {
    const stats = { ...baseStats, maxCombo: 2, perfectClears: 0, tetrisCount: 0 }
    const result = calculateXpGain(stats, { isPersonalBest: false, isWin: false, winStreak: 0 })
    expect(result.breakdown.combo).toBe(0)
  })

  it('win streak tiers: 2→100, 3→200, 4→200, 5→500, 10→500', () => {
    const stats = { ...baseStats, mode: 'battle' as const, opponentScore: 5000 }
    const opts = { isPersonalBest: false, isWin: true }
    expect(calculateXpGain(stats, { ...opts, winStreak: 1 }).breakdown.winStreak).toBe(0)
    expect(calculateXpGain(stats, { ...opts, winStreak: 2 }).breakdown.winStreak).toBe(100)
    expect(calculateXpGain(stats, { ...opts, winStreak: 3 }).breakdown.winStreak).toBe(200)
    expect(calculateXpGain(stats, { ...opts, winStreak: 4 }).breakdown.winStreak).toBe(200)
    expect(calculateXpGain(stats, { ...opts, winStreak: 5 }).breakdown.winStreak).toBe(500)
    expect(calculateXpGain(stats, { ...opts, winStreak: 10 }).breakdown.winStreak).toBe(500)
  })

  it('solo never grants win or winStreak bonus', () => {
    // even if caller incorrectly passes isWin=true for solo, function ignores it
    const result = calculateXpGain(baseStats, { isPersonalBest: false, isWin: true, winStreak: 5 })
    expect(result.breakdown.win).toBe(0)
    expect(result.breakdown.winStreak).toBe(0)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=leveling/xp.test
```

Expected: All tests FAIL (module not found).

- [ ] **Step 4: Implement xp.ts**

```typescript
// src/lib/leveling/xp.ts
import { GameEndStats, Tier, XpBreakdown, MAX_LEVEL, XP_COEFFICIENT } from './types'

export function xpToNext(level: number): number {
  return XP_COEFFICIENT * level * level
}

export function totalXpFor(level: number): number {
  if (level <= 1) return 0
  const n = level - 1
  return (XP_COEFFICIENT * n * (n + 1) * (2 * n + 1)) / 6
}

export function levelFromXp(xp: number): number {
  let lo = 1
  let hi = MAX_LEVEL
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (totalXpFor(mid) <= xp) lo = mid
    else hi = mid - 1
  }
  return lo
}

export function tierForLevel(level: number): Tier {
  if (level <= 10) return 'Bronze'
  if (level <= 20) return 'Silver'
  if (level <= 30) return 'Gold'
  if (level <= 40) return 'Platinum'
  return 'Diamond'
}

export type XpContext = {
  isPersonalBest: boolean
  isWin: boolean
  winStreak: number
}

export type XpGainResult = {
  total: number
  breakdown: Omit<XpBreakdown, 'achievementBonus'>
}

function winStreakBonus(streak: number): number {
  if (streak >= 5) return 500
  if (streak >= 3) return 200
  if (streak >= 2) return 100
  return 0
}

export function calculateXpGain(stats: GameEndStats, ctx: XpContext): XpGainResult {
  const isBattle = stats.mode === 'battle'
  const base = Math.floor(stats.myScore / 10)
  const tetris = stats.tetrisCount * 50
  const combo = Math.max(0, stats.maxCombo - 2) * 20
  const perfect = stats.perfectClears * 200
  const personalBest = ctx.isPersonalBest ? 300 : 0
  const win = isBattle && ctx.isWin ? 200 : 0
  const winStreak = isBattle ? winStreakBonus(ctx.winStreak) : 0

  return {
    total: base + tetris + combo + perfect + personalBest + win + winStreak,
    breakdown: { base, tetris, combo, perfect, personalBest, win, winStreak },
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=leveling/xp.test
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/leveling/types.ts src/lib/leveling/xp.ts src/lib/leveling/xp.test.ts
git commit -m "feat(leveling): add XP calculation, level curve, and tier mapping"
```

---

### Task 1.6: Leveling module — MMR delta

**Files:**
- Create: `src/lib/leveling/mmr.ts`
- Create: `src/lib/leveling/mmr.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/leveling/mmr.test.ts
import { calculateMmrDelta } from './mmr'

describe('calculateMmrDelta', () => {
  it('equal MMR, equal score → delta near 0', () => {
    const d = calculateMmrDelta({ myScore: 5000, oppScore: 5000, myMmr: 1200, oppMmr: 1200, mmrGames: 50 })
    expect(d).toBe(0)
  })

  it('equal MMR, double score win → positive delta around K/2', () => {
    const d = calculateMmrDelta({ myScore: 10000, oppScore: 5000, myMmr: 1200, oppMmr: 1200, mmrGames: 50 })
    // score_ratio = 5000/15000 = 0.333, actual = 0.667, expected = 0.5
    // delta = round(32 * (0.667 - 0.5)) = round(5.33) = 5
    expect(d).toBe(5)
  })

  it('equal MMR, total wipeout (opp scored 0) → near +K/2', () => {
    const d = calculateMmrDelta({ myScore: 10000, oppScore: 0, myMmr: 1200, oppMmr: 1200, mmrGames: 50 })
    // score_ratio = 1, actual = 1, expected = 0.5 → 32 * 0.5 = 16
    expect(d).toBe(16)
  })

  it('underdog winning gains more', () => {
    const d = calculateMmrDelta({ myScore: 8000, oppScore: 5000, myMmr: 1000, oppMmr: 1400, mmrGames: 50 })
    // expected for me ≈ 0.09; actual ≈ 0.615 → 32 * 0.525 ≈ 16.8 → 17
    expect(d).toBeGreaterThan(15)
    expect(d).toBeLessThanOrEqual(20)
  })

  it('placement (mmr_games < 10) doubles K', () => {
    const normal = calculateMmrDelta({ myScore: 10000, oppScore: 5000, myMmr: 1200, oppMmr: 1200, mmrGames: 50 })
    const placement = calculateMmrDelta({ myScore: 10000, oppScore: 5000, myMmr: 1200, oppMmr: 1200, mmrGames: 3 })
    expect(placement).toBe(normal * 2)
  })

  it('clamps to [-50, 50]', () => {
    const huge = calculateMmrDelta({ myScore: 100000, oppScore: 0, myMmr: 500, oppMmr: 2500, mmrGames: 0 })
    expect(huge).toBeLessThanOrEqual(50)
    const tank = calculateMmrDelta({ myScore: 0, oppScore: 100000, myMmr: 2500, oppMmr: 500, mmrGames: 0 })
    expect(tank).toBeGreaterThanOrEqual(-50)
  })

  it('returns 0 if both scores are 0 (degenerate)', () => {
    const d = calculateMmrDelta({ myScore: 0, oppScore: 0, myMmr: 1200, oppMmr: 1200, mmrGames: 50 })
    expect(d).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=leveling/mmr.test
```

Expected: All tests FAIL.

- [ ] **Step 3: Implement mmr.ts**

```typescript
// src/lib/leveling/mmr.ts
export type MmrInput = {
  myScore: number
  oppScore: number
  myMmr: number
  oppMmr: number
  mmrGames: number
}

export function calculateMmrDelta(input: MmrInput): number {
  const { myScore, oppScore, myMmr, oppMmr, mmrGames } = input
  const totalScore = myScore + oppScore
  if (totalScore === 0) return 0

  const expected = 1 / (1 + Math.pow(10, (oppMmr - myMmr) / 400))
  const scoreRatio = (myScore - oppScore) / totalScore  // -1..+1
  const actual = (scoreRatio + 1) / 2                   // 0..1

  const K = mmrGames < 10 ? 64 : 32
  const raw = Math.round(K * (actual - expected))
  return Math.max(-50, Math.min(50, raw))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=leveling/mmr.test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/leveling/mmr.ts src/lib/leveling/mmr.test.ts
git commit -m "feat(leveling): add ELO-variant MMR delta with score-margin actual"
```

---

### Task 1.7: Leveling module — achievement checker

**Files:**
- Create: `src/lib/leveling/achievements.ts`
- Create: `src/lib/leveling/achievements.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/leveling/achievements.test.ts
import { checkAchievements, ACHIEVEMENT_DEFS } from './achievements'
import { GameEndStats } from './types'

const baseStats: GameEndStats = {
  mode: 'solo',
  myScore: 0,
  opponentScore: null,
  totalLines: 0,
  tetrisCount: 0,
  maxCombo: 0,
  perfectClears: 0,
}

const baseSnapshot = {
  xp: 0,
  level: 1,
  totalGames: 0,
  totalWins: 0,
  totalTetrises: 0,
  totalPerfects: 0,
  maxComboEver: 0,
  bestScore: 0,
  alreadyEarned: new Set<string>(),
  winStreak: 0,
}

describe('checkAchievements', () => {
  it('catalog has exactly 25 achievements', () => {
    expect(ACHIEVEMENT_DEFS.length).toBe(25)
  })

  it('first_game triggers on the first finished game', () => {
    const unlocked = checkAchievements(
      { ...baseStats, myScore: 100 },
      { ...baseSnapshot, totalGames: 1 },  // post-update snapshot
    )
    expect(unlocked.map(a => a.id)).toContain('first_game')
  })

  it('first_tetris triggers when tetrisCount >= 1 in this game', () => {
    const unlocked = checkAchievements(
      { ...baseStats, tetrisCount: 1 },
      { ...baseSnapshot, totalGames: 1, totalTetrises: 1 },
    )
    expect(unlocked.map(a => a.id)).toContain('first_tetris')
  })

  it('does not re-trigger an already-earned achievement', () => {
    const unlocked = checkAchievements(
      { ...baseStats, tetrisCount: 1 },
      { ...baseSnapshot, totalGames: 1, totalTetrises: 1, alreadyEarned: new Set(['first_tetris', 'first_game']) },
    )
    expect(unlocked.map(a => a.id)).not.toContain('first_tetris')
    expect(unlocked.map(a => a.id)).not.toContain('first_game')
  })

  it('score_10k triggers when myScore >= 10000', () => {
    const unlocked = checkAchievements(
      { ...baseStats, myScore: 10000 },
      { ...baseSnapshot, totalGames: 1 },
    )
    expect(unlocked.map(a => a.id)).toContain('score_10k')
  })

  it('combo_10 triggers when maxCombo >= 10', () => {
    const unlocked = checkAchievements(
      { ...baseStats, maxCombo: 10 },
      { ...baseSnapshot, totalGames: 1, maxComboEver: 10 },
    )
    expect(unlocked.map(a => a.id)).toContain('combo_10')
  })

  it('wins_100 triggers when totalWins crosses 100', () => {
    const unlocked = checkAchievements(
      { ...baseStats, mode: 'battle', myScore: 5000, opponentScore: 1000 },
      { ...baseSnapshot, totalGames: 200, totalWins: 100 },
    )
    expect(unlocked.map(a => a.id)).toContain('wins_100')
  })

  it('level_10 triggers when level reaches 10', () => {
    const unlocked = checkAchievements(
      { ...baseStats, myScore: 50000 },
      { ...baseSnapshot, totalGames: 1, level: 10, xp: 20000 },
    )
    expect(unlocked.map(a => a.id)).toContain('level_10')
  })

  it('win_streak_5 triggers when winStreak reaches 5', () => {
    const unlocked = checkAchievements(
      { ...baseStats, mode: 'battle', myScore: 5000, opponentScore: 1000 },
      { ...baseSnapshot, totalGames: 5, totalWins: 5, winStreak: 5 },
    )
    expect(unlocked.map(a => a.id)).toContain('win_streak_5')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=leveling/achievements.test
```

Expected: All tests FAIL.

- [ ] **Step 3: Implement achievements.ts**

```typescript
// src/lib/leveling/achievements.ts
import { GameEndStats } from './types'

export type AchievementSnapshot = {
  xp: number
  level: number
  totalGames: number
  totalWins: number
  totalTetrises: number
  totalPerfects: number
  maxComboEver: number
  bestScore: number
  alreadyEarned: Set<string>
  winStreak: number
}

export type AchievementDef = {
  id: string
  check: (stats: GameEndStats, snap: AchievementSnapshot) => boolean
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Milestone (5)
  { id: 'first_game',    check: (_s, snap) => snap.totalGames >= 1 },
  { id: 'first_win',     check: (s, snap)  => s.mode === 'battle' && snap.totalWins >= 1 },
  { id: 'first_tetris',  check: (s)        => s.tetrisCount >= 1 },
  { id: 'first_perfect', check: (s)        => s.perfectClears >= 1 },
  { id: 'first_combo_5', check: (s)        => s.maxCombo >= 5 },

  // Skill (10) — per-game thresholds
  { id: 'score_10k',      check: (s) => s.myScore >= 10_000 },
  { id: 'score_50k',      check: (s) => s.myScore >= 50_000 },
  { id: 'score_100k',     check: (s) => s.myScore >= 100_000 },
  { id: 'tetris_double',  check: (s) => s.tetrisCount >= 2 },
  { id: 'tetris_quad',    check: (s) => s.tetrisCount >= 4 },
  { id: 'combo_10',       check: (s) => s.maxCombo >= 10 },
  { id: 'combo_15',       check: (s) => s.maxCombo >= 15 },
  { id: 'perfect_triple', check: (s) => s.perfectClears >= 3 },
  { id: 'win_streak_5',   check: (_s, snap) => snap.winStreak >= 5 },
  { id: 'win_streak_10',  check: (_s, snap) => snap.winStreak >= 10 },

  // Cumulative (10) — totals after this game
  { id: 'games_10',     check: (_s, snap) => snap.totalGames >= 10 },
  { id: 'games_100',    check: (_s, snap) => snap.totalGames >= 100 },
  { id: 'games_500',    check: (_s, snap) => snap.totalGames >= 500 },
  { id: 'wins_10',      check: (_s, snap) => snap.totalWins >= 10 },
  { id: 'wins_50',      check: (_s, snap) => snap.totalWins >= 50 },
  { id: 'wins_100',     check: (_s, snap) => snap.totalWins >= 100 },
  { id: 'tetrises_50',  check: (_s, snap) => snap.totalTetrises >= 50 },
  { id: 'tetrises_500', check: (_s, snap) => snap.totalTetrises >= 500 },
  { id: 'level_10',     check: (_s, snap) => snap.level >= 10 },
  { id: 'level_25',     check: (_s, snap) => snap.level >= 25 },
]

export type UnlockedAchievement = { id: string }

export function checkAchievements(
  stats: GameEndStats,
  snap: AchievementSnapshot,
): UnlockedAchievement[] {
  return ACHIEVEMENT_DEFS
    .filter(def => !snap.alreadyEarned.has(def.id) && def.check(stats, snap))
    .map(def => ({ id: def.id }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=leveling/achievements.test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/leveling/achievements.ts src/lib/leveling/achievements.test.ts
git commit -m "feat(leveling): add achievement check rules for all 25 achievements"
```

---

### Task 1.8: SQL mirror functions (xp, mmr, achievements)

**Files:**
- Create: `supabase/migrations/004_leveling_functions.sql`

- [ ] **Step 1: Write the SQL functions mirroring TS logic**

```sql
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
create or replace function public.calc_mmr_delta(
  my_score int, opp_score int, my_mmr int, opp_mmr int, mmr_games int
) returns int language plpgsql immutable as $$
declare
  total_score int := my_score + opp_score;
  expected float;
  actual float;
  k int;
  raw int;
begin
  if total_score = 0 then return 0; end if;
  expected := 1.0 / (1.0 + power(10.0, (opp_mmr - my_mmr)::float / 400.0));
  actual := ((my_score - opp_score)::float / total_score + 1) / 2;
  k := case when mmr_games < 10 then 64 else 32 end;
  raw := round(k * (actual - expected))::int;
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
```

- [ ] **Step 2: Apply migration**

Run via Supabase SQL editor. Sanity check:

```sql
select public.xp_to_next(10);              -- expect 5000
select public.total_xp_for(11);            -- expect 19250
select public.level_from_xp(19250);        -- expect 11
select public.calc_xp_gain('solo', 12000, 2, 5, 1, false, false, 0);  -- expect 1560
select public.calc_mmr_delta(10000, 5000, 1200, 1200, 50);  -- expect 5
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_leveling_functions.sql
git commit -m "feat(db): add PL/pgSQL mirror functions for XP, MMR, and win streak"
```

---

## Phase 2 — RPC + Game End Flow (XP becomes user-visible)

### Task 2.1: `finalize_game` RPC

**Files:**
- Create: `supabase/migrations/005_finalize_game_rpc.sql`

- [ ] **Step 1: Write the RPC**

```sql
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
  v_new_xp bigint;
  v_new_level int;
  v_provisional record;
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

  -- 4. Ensure player_stats row exists
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
  v_provisional := row(
    v_my_stats.xp + v_xp_delta,                                           -- xp
    public.level_from_xp(v_my_stats.xp + v_xp_delta),                     -- level
    v_my_stats.total_games + 1,                                           -- total_games
    v_my_stats.total_wins + (case when v_is_win then 1 else 0 end),       -- total_wins
    v_my_stats.total_tetrises + p_tetris_count,                           -- total_tetrises
    v_my_stats.total_perfects + p_perfect_clears,                         -- total_perfects
    greatest(v_my_stats.max_combo_ever, p_max_combo),                     -- max_combo_ever
    greatest(v_my_stats.best_score, p_my_score)                           -- best_score
  );

  -- 10. Achievement check
  select coalesce(array_agg(achievement_id), '{}') into v_already_earned
  from public.player_achievements where player_id = v_player_id;

  for v_ach in
    select a.id, a.name_ko, a.name_en, a.xp_reward, a.badge_label, a.skin_key
    from public.achievements a
    where a.id <> all(v_already_earned)
      and public.achievement_check(
            a.id, p_mode, p_my_score, p_tetris_count, p_max_combo, p_perfect_clears,
            (v_provisional).f3::int,   -- total_games
            (v_provisional).f4::int,   -- total_wins
            (v_provisional).f5::int,   -- total_tetrises
            (v_provisional).f6::int,   -- total_perfects
            (v_provisional).f2::int,   -- level
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
  v_new_xp := (v_provisional).f1::bigint + v_achievement_xp_bonus;
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
```

- [ ] **Step 2: Apply and test with a dummy call**

In Supabase SQL editor (as an authenticated user):

```sql
-- Make sure you have a profile row for auth.uid()
select public.finalize_game('solo', 'solo:test-' || gen_random_uuid(), null, 12000, 0, 30, 2, 5, 1);
-- Expected: jsonb with xp_gained ≈ 1560 (assuming first game gives personal_best bonus)
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/005_finalize_game_rpc.sql
git commit -m "feat(db): add finalize_game RPC and achievement_check helper"
```

---

### Task 2.2: TypeScript wrapper for `finalize_game`

**Files:**
- Create: `src/lib/leveling/finalize.ts`

- [ ] **Step 1: Write the wrapper**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/leveling/finalize.ts
git commit -m "feat(leveling): add typed wrapper for finalize_game RPC"
```

---

### Task 2.3: GameEndModal component

**Files:**
- Create: `src/components/GameEndModal.tsx`

- [ ] **Step 1: Write the modal**

```tsx
// src/components/GameEndModal.tsx
'use client'
import { useEffect, useState } from 'react'
import { FinalizeGameResult } from '@/lib/leveling/finalize'
import { tierForLevel, xpToNext, totalXpFor } from '@/lib/leveling/xp'
import { useLanguage } from '@/contexts/LanguageContext'

type Props = {
  result: FinalizeGameResult | null
  loading: boolean
  error: string | null
  onRetry: () => void
  onExit: () => void
}

export default function GameEndModal({ result, loading, error, onRetry, onExit }: Props) {
  const { t, lang } = useLanguage()
  const [animatedXp, setAnimatedXp] = useState(0)

  useEffect(() => {
    if (!result) return
    const start = result.prev_xp
    const end = result.new_xp
    const duration = 1200
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration)
      setAnimatedXp(Math.round(start + (end - start) * k))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [result])

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80">
        <p className="text-gray-300">{t('gameOver')}…</p>
      </div>
    )
  }
  if (error || !result) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
        <p className="text-red-400">{error ?? t('errorOccurred')}</p>
        <button onClick={onExit} className="px-4 py-2 border border-gray-500 text-gray-300">
          {t('backToLobby')}
        </button>
      </div>
    )
  }

  const tier = tierForLevel(result.new_level)
  const xpInLevel = animatedXp - totalXpFor(result.new_level)
  const xpForLevel = xpToNext(result.new_level)
  const pct = Math.min(100, (xpInLevel / xpForLevel) * 100)
  const leveledUp = result.new_level > result.prev_level

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/85">
      <div className="bg-gray-900 border border-cyan-500/50 p-6 max-w-md w-full flex flex-col gap-4">
        <h2 className="text-cyan-400 font-bold text-xl tracking-widest">{t('gameOver')}</h2>

        <div className="text-gray-300 text-sm flex flex-col gap-1">
          <p>+{result.xp_gained.toLocaleString()} XP</p>
          <ul className="text-xs text-gray-500 pl-2">
            <li>{t('xpBase')}: +{result.xp_breakdown.base}</li>
            {result.xp_breakdown.tetris > 0 && <li>Tetris: +{result.xp_breakdown.tetris}</li>}
            {result.xp_breakdown.combo > 0 && <li>Combo: +{result.xp_breakdown.combo}</li>}
            {result.xp_breakdown.perfect > 0 && <li>Perfect: +{result.xp_breakdown.perfect}</li>}
            {result.xp_breakdown.personal_best > 0 && <li>{t('xpPersonalBest')}: +{result.xp_breakdown.personal_best}</li>}
            {result.xp_breakdown.win > 0 && <li>{t('xpWin')}: +{result.xp_breakdown.win}</li>}
            {result.xp_breakdown.win_streak > 0 && <li>{t('xpWinStreak')}: +{result.xp_breakdown.win_streak}</li>}
            {result.xp_breakdown.achievement_bonus > 0 && <li>{t('xpAchievement')}: +{result.xp_breakdown.achievement_bonus}</li>}
          </ul>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Lv {result.new_level} · {tier}</span>
            <span>{xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded overflow-hidden">
            <div className="h-full bg-cyan-500" style={{ width: `${pct}%`, transition: 'width 0.2s' }} />
          </div>
          {leveledUp && (
            <p className="text-yellow-400 text-sm font-bold mt-2" style={{ textShadow: '0 0 8px #ffe600' }}>
              {t('levelUp')} → Lv {result.new_level}
            </p>
          )}
        </div>

        {result.mmr_delta !== null && (
          <p className="text-gray-300 text-sm">
            MMR {result.prev_mmr} → {result.new_mmr}
            {' '}
            <span className={result.mmr_delta >= 0 ? 'text-cyan-400' : 'text-red-400'}>
              ({result.mmr_delta >= 0 ? '+' : ''}{result.mmr_delta})
            </span>
          </p>
        )}

        {result.unlocked.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-yellow-400 font-bold text-sm">🏆 {t('achievementUnlocked')}</p>
            {result.unlocked.map(a => (
              <div key={a.id} className="border border-yellow-500/40 p-2">
                <p className="text-yellow-300 text-sm">{lang === 'ko' ? a.name_ko : a.name_en}</p>
                {a.xp_reward > 0 && <p className="text-xs text-gray-400">+{a.xp_reward} XP</p>}
                {a.badge_label && <p className="text-xs text-gray-400">{t('badge')}: {a.badge_label}</p>}
                {a.skin_key && <p className="text-xs text-gray-400">{t('skin')}: {a.skin_key}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end mt-2">
          <button onClick={onExit} className="px-4 py-2 border border-gray-500 text-gray-300 hover:bg-gray-800">
            {t('backToLobby')}
          </button>
          <button onClick={onRetry} className="px-4 py-2 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20">
            {t('retry')}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameEndModal.tsx
git commit -m "feat(ui): add GameEndModal with XP breakdown, level-up indicator, achievement toasts"
```

---

### Task 2.4: Add i18n keys for game-end modal

**Files:**
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: Add keys to both `en` and `ko` sections**

In `src/lib/i18n.ts`, add inside the `en:` object (alphabetize freely or append):

```typescript
    // Leveling
    xpBase: 'Base',
    xpPersonalBest: 'Personal best',
    xpWin: 'Win',
    xpWinStreak: 'Win streak',
    xpAchievement: 'Achievement bonus',
    levelUp: 'LEVEL UP!',
    achievementUnlocked: 'Achievement unlocked!',
    badge: 'Badge',
    skin: 'Skin',
    xpProgress: 'XP',
    mmrLabel: 'MMR',
    tierBronze: 'Bronze',
    tierSilver: 'Silver',
    tierGold: 'Gold',
    tierPlatinum: 'Platinum',
    tierDiamond: 'Diamond',
```

And inside the `ko:` object:

```typescript
    // Leveling
    xpBase: '기본',
    xpPersonalBest: '개인 최고',
    xpWin: '승리',
    xpWinStreak: '연승',
    xpAchievement: '업적 보너스',
    levelUp: '레벨 업!',
    achievementUnlocked: '업적 달성!',
    badge: '배지',
    skin: '스킨',
    xpProgress: 'XP',
    mmrLabel: 'MMR',
    tierBronze: '브론즈',
    tierSilver: '실버',
    tierGold: '골드',
    tierPlatinum: '플래티넘',
    tierDiamond: '다이아몬드',
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors. (The `satisfies` constraint will enforce both objects have the same keys.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat(i18n): add level-system translation keys (en/ko)"
```

---

### Task 2.5: Integrate finalize_game into SoloGame

**Files:**
- Modify: `src/components/SoloGame.tsx`

- [ ] **Step 1: Replace the old game-over overlay with GameEndModal**

Replace the entire `SoloGame.tsx` file:

```tsx
// src/components/SoloGame.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useViewportTier } from '@/hooks/useViewportTier'
import TetrisBoard from './TetrisBoard'
import HoldPiece from './HoldPiece'
import NextPieces from './NextPieces'
import GameEndModal from './GameEndModal'
import { useLanguage } from '@/contexts/LanguageContext'
import { getPanelWidth } from '@/lib/tierSizes'
import { finalizeGame, FinalizeGameResult } from '@/lib/leveling/finalize'
import { useRouter } from 'next/navigation'

export default function SoloGame() {
  const { state, actions } = useGame()
  const { t } = useLanguage()
  const tier = useViewportTier()
  useKeyboard(actions, state.status === 'playing')
  const router = useRouter()

  const [finalizing, setFinalizing] = useState(false)
  const [finalizeResult, setFinalizeResult] = useState<FinalizeGameResult | null>(null)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const prevStatus = useRef(state.status)

  useEffect(() => {
    if (prevStatus.current === 'playing' && state.status === 'over') {
      setFinalizing(true)
      setFinalizeResult(null)
      setFinalizeError(null)
      const roomId = `solo:${crypto.randomUUID()}`
      finalizeGame(
        {
          mode: 'solo',
          myScore: state.score,
          opponentScore: null,
          totalLines: state.lines,
          tetrisCount: state.tetrisCount,
          maxCombo: state.maxCombo,
          perfectClears: state.perfectClears,
        },
        roomId,
        null,
      )
        .then(res => { setFinalizeResult(res); setFinalizing(false) })
        .catch(err => { setFinalizeError(err.message ?? String(err)); setFinalizing(false) })
    }
    prevStatus.current = state.status
  }, [state.status, state.score, state.lines, state.tetrisCount, state.maxCombo, state.perfectClears])

  const panelW = getPanelWidth(tier)

  return (
    <div className="flex items-start gap-3 justify-center">
      <div className="flex flex-col gap-3" style={{ width: panelW }}>
        <HoldPiece piece={state.holdPiece} tier={tier} />
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('score')}</p>
          <p className="text-cyan-400 font-bold text-lg tabular-nums" style={{ textShadow: '0 0 8px #00f5ff' }}>
            {state.score.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('level')}</p>
          <p className="text-purple-400 font-bold text-sm">{state.level}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('lines')}</p>
          <p className="text-gray-300 font-bold text-sm">{state.lines}</p>
        </div>
      </div>

      <div className="relative">
        <TetrisBoard
          board={state.board}
          currentPiece={state.currentPiece}
          ghostY={state.ghostY}
          flashRows={state.flashRows}
          tier={tier}
        />
        {state.status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <button
              onClick={actions.start}
              className="px-8 py-3 bg-cyan-500/20 border border-cyan-500 text-cyan-400 font-bold text-lg hover:bg-cyan-500/40 transition"
              style={{ textShadow: '0 0 8px #00f5ff', boxShadow: '0 0 20px rgba(0,245,255,0.3)' }}
            >
              {t('start')}
            </button>
          </div>
        )}
        {state.status === 'over' && (
          <GameEndModal
            result={finalizeResult}
            loading={finalizing}
            error={finalizeError}
            onRetry={() => {
              setFinalizeResult(null)
              setFinalizing(false)
              setFinalizeError(null)
              actions.reset()
            }}
            onExit={() => router.push('/menu')}
          />
        )}
      </div>

      <div style={{ width: panelW }}>
        <NextPieces pieces={state.nextPieces} tier={tier} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify dev server runs without errors**

```bash
npm run dev
```

Visit `http://localhost:3000/play`, play a quick game to game-over. Confirm modal appears with XP info.

- [ ] **Step 3: Commit**

```bash
git add src/components/SoloGame.tsx
git commit -m "feat(solo): finalize game via RPC and show GameEndModal on game over"
```

---

### Task 2.6: Integrate finalize_game into Battle

**Files:**
- Modify: `src/lib/realtime.ts` (expose opponent userId)
- Modify: `src/hooks/useBattle.ts` (call finalizeGame on end, drop manual INSERT)
- Modify: `src/components/BattleGame.tsx` (render GameEndModal, drop manual INSERT)

- [ ] **Step 1: Expose opponent userId from createBattleChannel**

In `src/lib/realtime.ts`, change `onOpponentJoined` signature to also include opponent's userId:

```typescript
// src/lib/realtime.ts — replace createBattleChannel signature + presence handler
export function createBattleChannel(
  roomId: string,
  userId: string,
  nickname: string,
  onOpponentJoined: (opponentNickname: string, opponentUserId: string) => void,
  onOpponentLeft: () => void,
  onGameState: (state: BroadcastGameState) => void,
  onGameEvent: (event: 'ready' | 'start' | 'over') => void,
): RealtimeChannel {
  const supabase = createClient()
  const channel = supabase.channel(`battle:${roomId}`, {
    config: { presence: { key: userId } },
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>()
      const users = Object.values(state).flat().filter(u => u.userId !== userId)
      if (users.length > 0) onOpponentJoined(users[0].nickname, users[0].userId)
    })
    .on('presence', { event: 'leave' }, () => {
      onOpponentLeft()
    })
    .on<BroadcastGameState>('broadcast', { event: 'game_state' }, ({ payload }) => {
      onGameState(payload)
    })
    .on<{ event: 'ready' | 'start' | 'over' }>('broadcast', { event: 'game_event' }, ({ payload }) => {
      onGameEvent(payload.event)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId, nickname, joinedAt: Date.now() } as PresenceUser)
      }
    })

  return channel
}
```

- [ ] **Step 2: Update useBattle to capture opponent id and call finalize**

In `src/hooks/useBattle.ts`, add the import at the top:

```typescript
import { finalizeGame, FinalizeGameResult } from '@/lib/leveling/finalize'
```

Add new state inside the hook (after existing state declarations, around line 33):

```typescript
  const [finalizeResult, setFinalizeResult] = useState<FinalizeGameResult | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [opponentId, setOpponentId] = useState<string>('')
  const opponentIdRef = useRef<string>('')
```

Replace `endBattle` with the RPC-calling version:

```typescript
  const endBattle = useCallback((myFinalScore: number, opponentFinalScore: number) => {
    setPhase('over')
    const isWin =
      myFinalScore > opponentFinalScore ? true
      : myFinalScore < opponentFinalScore ? false
      : null
    setResult({ myScore: myFinalScore, opponentScore: opponentFinalScore, isWin })

    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    if (timerRef.current) clearInterval(timerRef.current)

    setFinalizing(true)
    const s = gameStateRef.current
    finalizeGame(
      {
        mode: 'battle',
        myScore: myFinalScore,
        opponentScore: Math.max(0, opponentFinalScore),
        totalLines: s.lines,
        tetrisCount: s.tetrisCount,
        maxCombo: s.maxCombo,
        perfectClears: s.perfectClears,
      },
      roomId,
      opponentIdRef.current || null,
    )
      .then(res => { setFinalizeResult(res); setFinalizing(false) })
      .catch(err => { setFinalizeError(err.message ?? String(err)); setFinalizing(false) })
  }, [roomId])
```

Update the `createBattleChannel` call site to receive the opponent userId and store it:

```typescript
    const channel = createBattleChannel(
      roomId, userId, myNickname,
      (nick, oppId) => {
        setOpponentNickname(nick)
        setOpponentId(oppId)
        opponentIdRef.current = oppId
        setOpponentConnected(true)
        if (disconnectTimeoutRef.current) clearTimeout(disconnectTimeoutRef.current)
        startCountdown()
      },
      // ... rest unchanged
```

Extend the return object:

```typescript
  return {
    gameState, actions, phase, countdown, timeLeft,
    myNickname, opponentNickname, opponentConnected, opponentState, result,
    opponentId,
    finalizeResult, finalizing, finalizeError,
  }
```

- [ ] **Step 3: Replace BattleGame.tsx game-over UI with GameEndModal**

Replace the entire `src/components/BattleGame.tsx`:

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { useBattle } from '@/hooks/useBattle'
import { useKeyboard } from '@/hooks/useKeyboard'
import TetrisBoard from './TetrisBoard'
import HoldPiece from './HoldPiece'
import NextPieces from './NextPieces'
import OpponentMini from './OpponentMini'
import GameEndModal from './GameEndModal'
import { useViewportTier } from '@/hooks/useViewportTier'
import { useLanguage } from '@/contexts/LanguageContext'
import { getPanelWidth } from '@/lib/tierSizes'

function formatTime(ms: number) {
  const secs = Math.ceil(ms / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function BattleGame({ roomId }: { roomId: string }) {
  const router = useRouter()
  const {
    gameState, actions, phase, countdown, timeLeft,
    myNickname, opponentNickname, opponentConnected, opponentState, opponentId,
    finalizeResult, finalizing, finalizeError,
  } = useBattle(roomId)

  useKeyboard(actions, phase === 'playing')
  const tier = useViewportTier()
  const { t } = useLanguage()
  const panelW = getPanelWidth(tier)

  return (
    <div className="flex items-start gap-3 justify-center">
      {/* Left panel */}
      <div className="flex flex-col gap-3" style={{ width: panelW }}>
        <HoldPiece piece={gameState.holdPiece} tier={tier} />
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('score')}</p>
          <p className="text-cyan-400 font-bold text-lg tabular-nums" style={{ textShadow: '0 0 8px #00f5ff' }}>
            {gameState.score.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('time')}</p>
          <p className={`font-bold text-sm tabular-nums ${timeLeft < 30000 ? 'text-red-400' : 'text-yellow-400'}`}>
            {formatTime(timeLeft)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('level')}</p>
          <p className="text-purple-400 font-bold text-sm">{gameState.level}</p>
        </div>
        {myNickname && (
          <p className="text-cyan-400 text-[11px] truncate" style={{ textShadow: '0 0 4px #00f5ff' }}>
            {myNickname}
          </p>
        )}
      </div>

      {/* My board */}
      <div className="relative">
        <TetrisBoard
          board={gameState.board}
          currentPiece={gameState.currentPiece}
          ghostY={gameState.ghostY}
          flashRows={gameState.flashRows}
          tier={tier}
        />
        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-8xl font-bold text-cyan-400" style={{ textShadow: '0 0 30px #00f5ff' }}>
              {countdown}
            </span>
          </div>
        )}
        {phase === 'waiting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
            <p className="text-cyan-400 tracking-widest text-sm">{t('waitingOpponent')}</p>
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {phase === 'over' && (
          <GameEndModal
            result={finalizeResult}
            loading={finalizing}
            error={finalizeError}
            onRetry={() => router.push('/lobby')}
            onExit={() => router.push('/menu')}
          />
        )}
      </div>

      <div style={{ width: panelW }}>
        <NextPieces pieces={gameState.nextPieces} tier={tier} />
      </div>

      <div className="w-px self-stretch bg-[#1a1a2e]" />

      <div className="flex flex-col items-center" style={{ width: panelW + 16 }}>
        <p className="text-[10px] text-red-500 uppercase tracking-widest mb-2">{t('opponent')}</p>
        <OpponentMini
          state={opponentState}
          nickname={opponentNickname || t('opponent')}
          isConnected={opponentConnected}
          opponentId={opponentId || null}
          tier={tier}
        />
      </div>
    </div>
  )
}
```

The previous file had its own `useEffect` that inserted `game_results` manually — that whole block is removed (the RPC now handles the write).

- [ ] **Step 4: Manual test**

```bash
npm run dev
```

Open two browsers (two logged-in accounts), join a battle, play through. Confirm:
- Both sides see the modal with `xp_gained` and `mmr_delta`
- `game_results` in Supabase has exactly one row per player (no duplicates from old manual INSERT)

- [ ] **Step 5: Commit**

```bash
git add src/lib/realtime.ts src/hooks/useBattle.ts src/components/BattleGame.tsx
git commit -m "feat(battle): finalize battle via RPC, drop manual game_results insert"
```

---

### Task 2.7: Backfill migration (initialize player_stats from existing game_results)

**Files:**
- Create: `supabase/migrations/006_backfill_player_stats.sql`

- [ ] **Step 1: Write backfill SQL**

```sql
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
```

- [ ] **Step 2: Apply migration and verify**

```sql
select count(*) from public.player_stats;
-- Expected: >0 (one row per existing player who has any game)
select * from public.player_stats order by xp desc limit 5;
-- Expected: top XP holders should match top score holders
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_backfill_player_stats.sql
git commit -m "feat(db): backfill player_stats from historical game_results"
```

---

## Phase 3 — UI Exposure

### Task 3.1: Extend UserProfileContext to fetch player_stats

**Files:**
- Modify: `src/contexts/UserProfileContext.tsx`

- [ ] **Step 1: Replace the `UserProfile` type and fetch logic**

```tsx
// src/contexts/UserProfileContext.tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserProfile = {
  id: string
  nickname: string
  isGuest: boolean
  bestScore: number
  rank: number | null
  level: number
  xp: number
  mmr: number
  activeBadge: string | null
}

type Ctx = {
  profile: UserProfile | null
  loading: boolean
  refresh: () => void
}

const UserProfileContext = createContext<Ctx>({ profile: null, loading: true, refresh: () => {} })

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('nickname, is_guest')
        .eq('id', user.id)
        .single()
      if (cancelled || !prof) { setLoading(false); return }

      const { data: stats } = await supabase
        .from('player_stats')
        .select('xp, level, mmr, best_score, active_badge_id')
        .eq('player_id', user.id)
        .maybeSingle()

      const bestScore = stats?.best_score ?? 0
      let rank: number | null = null
      if (bestScore > 0) {
        const { count } = await supabase
          .from('leaderboard_view')
          .select('player_id', { count: 'exact', head: true })
          .gt('best_score', bestScore)
        rank = (count ?? 0) + 1
      }

      if (cancelled) return
      setProfile({
        id: user.id,
        nickname: prof.nickname,
        isGuest: prof.is_guest,
        bestScore,
        rank,
        level: stats?.level ?? 1,
        xp: stats?.xp ?? 0,
        mmr: stats?.mmr ?? 1200,
        activeBadge: stats?.active_badge_id ?? null,
      })
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [tick])

  return (
    <UserProfileContext.Provider value={{ profile, loading, refresh: () => setTick(t => t + 1) }}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  return useContext(UserProfileContext)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/UserProfileContext.tsx
git commit -m "feat(profile): fetch player_stats (level/xp/mmr) into UserProfileContext"
```

---

### Task 3.2: Add level badge + XP bar to UserMiniProfile

**Files:**
- Modify: `src/components/UserMiniProfile.tsx`

- [ ] **Step 1: Replace component contents**

```tsx
// src/components/UserMiniProfile.tsx
'use client'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { tierForLevel, totalXpFor, xpToNext } from '@/lib/leveling/xp'

const tierColors: Record<string, string> = {
  Bronze:   '#cd7f32',
  Silver:   '#c0c0c0',
  Gold:     '#ffd700',
  Platinum: '#e5e4e2',
  Diamond:  '#b9f2ff',
}

export default function UserMiniProfile({ collapsed = false }: { collapsed?: boolean }) {
  const { profile } = useUserProfile()
  const { t } = useLanguage()

  if (!profile || profile.isGuest) return null

  const tier = tierForLevel(profile.level)
  const xpInLevel = profile.xp - totalXpFor(profile.level)
  const xpForLevel = xpToNext(profile.level)
  const pct = Math.min(100, (xpInLevel / xpForLevel) * 100)
  const color = tierColors[tier]

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1" title={`${profile.nickname} · Lv ${profile.level}`}>
        <div className="relative">
          <div className="w-8 h-8 rounded-full" style={{ background: 'linear-gradient(135deg, #c0a 0%, #f0f 100%)' }} aria-hidden />
          <span
            className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 rounded"
            style={{ background: color, color: '#000' }}
          >
            {profile.level}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-[#1a1a2e] rounded p-2.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg, #c0a 0%, #f0f 100%)' }} aria-hidden />
        <div className="flex flex-col min-w-0">
          <span className="text-white text-sm truncate">{profile.nickname}</span>
          <span className="text-[10px] font-bold" style={{ color }}>Lv {profile.level} · {tier}</span>
        </div>
      </div>
      <div className="h-1 bg-gray-800 rounded overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-gray-500 text-[10px] tabular-nums">
        {xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP
      </p>
      {profile.rank !== null && (
        <p className="text-yellow-400 text-xs tracking-wide">★ {t('rank')} #{profile.rank}</p>
      )}
      <p className="text-gray-500 text-xs tabular-nums">
        {t('bestScore')} {profile.bestScore.toLocaleString()}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Visit the app while logged in (not guest), confirm sidebar shows level badge + XP bar.

- [ ] **Step 3: Commit**

```bash
git add src/components/UserMiniProfile.tsx
git commit -m "feat(sidebar): add level badge and XP bar to UserMiniProfile"
```

---

### Task 3.3: Profile page — level panel + achievements grid

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Rewrite the page**

```tsx
// src/app/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { tierForLevel, totalXpFor, xpToNext } from '@/lib/leveling/xp'

const tierColors: Record<string, string> = {
  Bronze: '#cd7f32', Silver: '#c0c0c0', Gold: '#ffd700', Platinum: '#e5e4e2', Diamond: '#b9f2ff',
}

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
  const color = tierColors[tier]

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
        {stats?.mmr_games > 0 && (
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
        <h2 className="text-gray-400 text-sm uppercase tracking-widest mb-3">
          Achievements ({earnedSet.size}/{allAchievements?.length ?? 0})
        </h2>
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
        <h2 className="text-gray-400 text-sm uppercase tracking-widest mb-3">Recent Games</h2>
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
          {totalGames === 0 && <p className="text-center text-gray-600 py-8">No games played yet.</p>}
        </div>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2: Visual check at `/profile`**

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat(profile): add level panel and achievements grid"
```

---

### Task 3.4: Leaderboard — tabs for Best Score / Level

**Files:**
- Modify: `src/app/leaderboard/page.tsx`

- [ ] **Step 1: Convert page to support `?sort=score|level` query**

```tsx
// src/app/leaderboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import Link from 'next/link'
import { tierForLevel } from '@/lib/leveling/xp'

type LeaderboardRow = {
  player_id: string
  nickname: string
  level: number
  xp: number
  best_score: number
  total_wins: number
  total_games: number
  win_rate: number
  mmr: number
  active_badge_id: string | null
}

const tierColors: Record<string, string> = {
  Bronze: '#cd7f32', Silver: '#c0c0c0', Gold: '#ffd700', Platinum: '#e5e4e2', Diamond: '#b9f2ff',
}

export const revalidate = 60

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort } = await searchParams
  const orderBy = sort === 'level' ? 'level' : 'best_score'

  const supabase = await createClient()
  const { data } = await supabase
    .from('leaderboard_view')
    .select('*')
    .order(orderBy, { ascending: false })
    .order('xp', { ascending: false })
    .limit(50)

  const rows: LeaderboardRow[] = data ?? []

  return (
    <AppShell>
      <h1 className="text-yellow-400 font-bold text-2xl tracking-widest mb-4" style={{ textShadow: '0 0 10px #ffe600' }}>
        LEADERBOARD
      </h1>

      <div className="flex gap-3 mb-4 text-sm">
        <Link href="/leaderboard?sort=score" className={orderBy === 'best_score' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-gray-500'}>
          Best Score
        </Link>
        <Link href="/leaderboard?sort=level" className={orderBy === 'level' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-gray-500'}>
          Level
        </Link>
      </div>

      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-6 text-xs text-gray-500 uppercase tracking-widest px-4 pb-2 border-b border-gray-800">
          <span>#</span>
          <span>Lv</span>
          <span className="col-span-2">Player</span>
          <span className="text-right">{orderBy === 'level' ? 'XP' : 'Best Score'}</span>
          <span className="text-right">Win Rate</span>
        </div>
        {rows.map((row, i) => {
          const tier = tierForLevel(row.level)
          const color = tierColors[tier]
          return (
            <div key={row.player_id} className="grid grid-cols-6 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/20 transition items-center">
              <span className={`font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                {i + 1}
              </span>
              <span className="font-bold text-xs" style={{ color }}>{row.level}</span>
              <span className="col-span-2 text-white truncate">
                {row.nickname}
                {row.active_badge_id && <span className="ml-2 text-xs text-gray-500">[{row.active_badge_id}]</span>}
              </span>
              <span className="text-right text-cyan-400 tabular-nums font-bold">
                {orderBy === 'level' ? row.xp.toLocaleString() : Number(row.best_score).toLocaleString()}
              </span>
              <span className="text-right text-gray-400 text-sm">
                {row.win_rate}% <span className="text-gray-600">({row.total_wins}W/{row.total_games}G)</span>
              </span>
            </div>
          )
        })}
        {rows.length === 0 && <p className="text-center text-gray-600 py-12">No records yet.</p>}
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2: Test both tabs at `/leaderboard?sort=score` and `/leaderboard?sort=level`**

- [ ] **Step 3: Commit**

```bash
git add src/app/leaderboard/page.tsx
git commit -m "feat(leaderboard): add level tab and per-row level badges"
```

---

### Task 3.5: OpponentMini level badge

**Files:**
- Create: `src/lib/leveling/tierColors.ts`
- Modify: `src/components/OpponentMini.tsx`

- [ ] **Step 1: Create shared TIER_COLORS util**

```typescript
// src/lib/leveling/tierColors.ts
import { Tier } from './types'

export const TIER_COLORS: Record<Tier, string> = {
  Bronze:   '#cd7f32',
  Silver:   '#c0c0c0',
  Gold:     '#ffd700',
  Platinum: '#e5e4e2',
  Diamond:  '#b9f2ff',
}
```

- [ ] **Step 2: Replace OpponentMini with opponentId-aware version**

```tsx
// src/components/OpponentMini.tsx
'use client'
import { useEffect, useState } from 'react'
import TetrisBoard from './TetrisBoard'
import { BroadcastGameState } from '@/game/types'
import type { Tier as ViewportTier } from '@/lib/tierSizes'
import { createClient } from '@/lib/supabase/client'
import { tierForLevel } from '@/lib/leveling/xp'
import { TIER_COLORS } from '@/lib/leveling/tierColors'

type Props = {
  state: BroadcastGameState | null
  nickname: string
  isConnected: boolean
  opponentId: string | null
  tier?: ViewportTier
}

export default function OpponentMini({ state, nickname, isConnected, opponentId, tier }: Props) {
  void tier
  const emptyBoard = Array.from({ length: 20 }, () => Array(10).fill(0))
  const [oppLevel, setOppLevel] = useState<number | null>(null)

  useEffect(() => {
    if (!opponentId) { setOppLevel(null); return }
    let cancelled = false
    const supabase = createClient()
    supabase.from('player_stats').select('level').eq('player_id', opponentId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setOppLevel(data?.level ?? 1) })
    return () => { cancelled = true }
  }, [opponentId])

  const oppTier = oppLevel !== null ? tierForLevel(oppLevel) : null
  const oppColor = oppTier ? TIER_COLORS[oppTier] : '#888'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-500'}`}
          style={isConnected ? { boxShadow: '0 0 6px #4ade80' } : {}}
        />
        {oppLevel !== null && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: oppColor, color: '#000' }}>
            Lv {oppLevel}
          </span>
        )}
        <p className="text-orange-400 text-sm font-bold tracking-wider"
          style={{ textShadow: '0 0 6px #ff6600' }}>
          {nickname}
        </p>
      </div>
      <TetrisBoard board={state?.board ?? emptyBoard} mini />
      {state && (
        <div className="text-center">
          <p className="text-orange-400 text-sm tabular-nums"
            style={{ textShadow: '0 0 6px #ff6600' }}>
            {state.score.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs">Lv.{state.level}</p>
        </div>
      )}
      {!isConnected && <p className="text-gray-600 text-xs">Waiting...</p>}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/leveling/tierColors.ts src/components/OpponentMini.tsx
git commit -m "feat(battle): show opponent level badge in OpponentMini"
```

---

### Task 3.6: i18n — achievement names/descriptions

**Note:** Achievement names already live in the `achievements` table (`name_ko` / `name_en`). The profile page and modal pick the right column based on `lang`. No additional i18n needed for achievement text. If new UI labels are introduced in Phase 3 components, add them to `i18n.ts` as you go (e.g., the leaderboard tab labels can be hardcoded or added as `tabBestScore`/`tabLevel`).

- [ ] **Step 1: Add any missing UI labels**

If you used hardcoded English in Phase 3 components (e.g., `Achievements`, `Best Score`, `Level`), add `i18n` keys:

```typescript
// add to both en/ko in src/lib/i18n.ts
    tabBestScore: 'Best Score' | '최고 점수',
    tabLevel:     'Level' | '레벨',
    achievementsHeading: 'Achievements' | '업적',
```

Replace hardcoded strings in the components with `t('…')`.

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/lib/i18n.ts src/app/leaderboard/page.tsx src/app/profile/page.tsx
git commit -m "feat(i18n): translate Phase 3 leaderboard and profile labels"
```

---

## Phase 4 — Polish (particles + inventory)

### Task 4.1: Particle effect component

**Files:**
- Create: `src/components/BoardEffects.tsx`

- [ ] **Step 1: Build a self-contained effect renderer**

```tsx
// src/components/BoardEffects.tsx
'use client'
import { useEffect, useState } from 'react'

export type BoardEffect =
  | { kind: 'tetris' }
  | { kind: 'combo'; count: number }
  | { kind: 'perfect' }

export default function BoardEffects({ effect }: { effect: BoardEffect | null }) {
  const [show, setShow] = useState<BoardEffect | null>(null)

  useEffect(() => {
    if (!effect) return
    setShow(effect)
    const id = setTimeout(() => setShow(null), 900)
    return () => clearTimeout(id)
  }, [effect])

  if (!show) return null

  const text =
    show.kind === 'tetris' ? 'TETRIS!'
    : show.kind === 'combo' ? `${show.count} COMBO!`
    : 'PERFECT CLEAR'
  const color =
    show.kind === 'tetris' ? '#00f5ff'
    : show.kind === 'combo' ? '#ff00ff'
    : '#ffd700'

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
      <span
        className="font-bold text-4xl tracking-widest animate-pulse"
        style={{ color, textShadow: `0 0 20px ${color}, 0 0 40px ${color}` }}
      >
        {text}
      </span>
      {show.kind === 'perfect' && (
        <div className="absolute inset-0 bg-white animate-[flash_300ms_ease-out_forwards]" style={{ opacity: 0.3 }} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add the `flash` keyframe to global CSS**

In `src/app/globals.css` append:

```css
@keyframes flash {
  0%   { opacity: 0.6; }
  100% { opacity: 0;   }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BoardEffects.tsx src/app/globals.css
git commit -m "feat(ui): add BoardEffects component for tetris/combo/perfect overlays"
```

---

### Task 4.2: Wire effects to game state changes

**Files:**
- Modify: `src/components/SoloGame.tsx`, `src/components/BattleGame.tsx`

- [ ] **Step 1: Wire effects into SoloGame**

In `src/components/SoloGame.tsx`, add the import at the top:

```typescript
import BoardEffects, { BoardEffect } from './BoardEffects'
```

Add state + tracking ref inside the component (after `prevStatus`):

```typescript
  const [effect, setEffect] = useState<BoardEffect | null>(null)
  const prevStats = useRef({ tetrisCount: 0, perfectClears: 0, maxCombo: 0 })

  useEffect(() => {
    const p = prevStats.current
    if (state.tetrisCount > p.tetrisCount) setEffect({ kind: 'tetris' })
    else if (state.perfectClears > p.perfectClears) setEffect({ kind: 'perfect' })
    else if (state.maxCombo >= 5 && state.maxCombo > p.maxCombo) setEffect({ kind: 'combo', count: state.maxCombo })
    prevStats.current = { tetrisCount: state.tetrisCount, perfectClears: state.perfectClears, maxCombo: state.maxCombo }
  }, [state.tetrisCount, state.perfectClears, state.maxCombo])
```

Inside the `<div className="relative">` board wrapper (right after `<TetrisBoard …/>`), add:

```tsx
        <BoardEffects effect={effect} />
```

- [ ] **Step 2: Wire effects into BattleGame**

In `src/components/BattleGame.tsx`, add the import at the top:

```typescript
import { useEffect, useRef, useState } from 'react'
import BoardEffects, { BoardEffect } from './BoardEffects'
```

Add the same state + effect block inside the component (after the `useBattle` destructure):

```typescript
  const [effect, setEffect] = useState<BoardEffect | null>(null)
  const prevStats = useRef({ tetrisCount: 0, perfectClears: 0, maxCombo: 0 })

  useEffect(() => {
    const p = prevStats.current
    if (gameState.tetrisCount > p.tetrisCount) setEffect({ kind: 'tetris' })
    else if (gameState.perfectClears > p.perfectClears) setEffect({ kind: 'perfect' })
    else if (gameState.maxCombo >= 5 && gameState.maxCombo > p.maxCombo) setEffect({ kind: 'combo', count: gameState.maxCombo })
    prevStats.current = { tetrisCount: gameState.tetrisCount, perfectClears: gameState.perfectClears, maxCombo: gameState.maxCombo }
  }, [gameState.tetrisCount, gameState.perfectClears, gameState.maxCombo])
```

Inside the my-board `<div className="relative">` (right after `<TetrisBoard …/>`), add:

```tsx
        <BoardEffects effect={effect} />
```

- [ ] **Step 2: Play through and verify effects trigger**

```bash
npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SoloGame.tsx src/components/BattleGame.tsx
git commit -m "feat(ui): trigger board particle effects on tetris/combo/perfect clear"
```

---

### Task 4.3: Badge/skin inventory + active toggle

**Files:**
- Create: `supabase/migrations/007_set_active_cosmetic.sql`
- Modify: `src/app/profile/page.tsx`
- Create: `src/components/CosmeticPicker.tsx`

- [ ] **Step 1: Write a minimal RPC to set active badge/skin**

```sql
-- supabase/migrations/007_set_active_cosmetic.sql
create or replace function public.set_active_cosmetic(
  p_kind text,           -- 'badge' | 'skin'
  p_achievement_id text  -- null to clear
) returns void language plpgsql security definer set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_owned boolean;
begin
  if v_player_id is null then raise exception 'unauthenticated'; end if;
  if p_kind not in ('badge','skin') then raise exception 'invalid kind'; end if;

  if p_achievement_id is not null then
    select true into v_owned
    from public.player_achievements
    where player_id = v_player_id and achievement_id = p_achievement_id;
    if not v_owned then raise exception 'achievement not owned'; end if;
  end if;

  if p_kind = 'badge' then
    update public.player_stats set active_badge_id = p_achievement_id, updated_at = now()
    where player_id = v_player_id;
  else
    update public.player_stats set active_skin_id = p_achievement_id, updated_at = now()
    where player_id = v_player_id;
  end if;
end;
$$;

grant execute on function public.set_active_cosmetic(text, text) to authenticated;
```

- [ ] **Step 2: Apply migration and verify**

```sql
select public.set_active_cosmetic('badge', 'first_tetris');
select active_badge_id from public.player_stats where player_id = auth.uid();
```

- [ ] **Step 3: Build CosmeticPicker component**

```tsx
// src/components/CosmeticPicker.tsx
'use client'
import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

type Cosmetic = { id: string; label: string }
type Props = {
  kind: 'badge' | 'skin'
  owned: Cosmetic[]
  activeId: string | null
  onChange: () => void
}

export default function CosmeticPicker({ kind, owned, activeId, onChange }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const setActive = (id: string | null) => {
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.rpc('set_active_cosmetic', { p_kind: kind, p_achievement_id: id })
      if (error) setError(error.message)
      else onChange()
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        disabled={pending}
        onClick={() => setActive(null)}
        className={`px-2 py-1 text-xs border ${activeId === null ? 'border-cyan-400 text-cyan-400' : 'border-gray-700 text-gray-500'}`}
      >
        None
      </button>
      {owned.map(c => (
        <button
          key={c.id}
          disabled={pending}
          onClick={() => setActive(c.id)}
          className={`px-2 py-1 text-xs border ${activeId === c.id ? 'border-yellow-400 text-yellow-400' : 'border-gray-700 text-gray-300'}`}
        >
          {c.label}
        </button>
      ))}
      {error && <p className="text-xs text-red-400 w-full">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Wire into profile page**

In `src/app/profile/page.tsx`, after the achievements grid, derive `ownedBadges` and `ownedSkins` from the `allAchievements` × `earnedSet` join, then render two `<CosmeticPicker />` instances. Pass a router-refresh callback for `onChange`.

Since the profile page is a server component, do the picker via a client wrapper (`<ClientCosmeticPanel>`) that fetches its own data on mount, or pass owned arrays as props.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/007_set_active_cosmetic.sql src/components/CosmeticPicker.tsx src/app/profile/page.tsx
git commit -m "feat(cosmetic): add badge/skin picker with set_active_cosmetic RPC"
```

---

### Task 4.4: Skin → board color mapping

**Files:**
- Create: `src/lib/leveling/skins.ts`
- Modify: `src/components/TetrisBoard.tsx` (or wherever block colors are defined)

- [ ] **Step 1: Define skin color overrides**

```typescript
// src/lib/leveling/skins.ts
export type SkinKey = 'gold_block' | 'neon_pink' | 'dark_board' | 'galaxy_board' | 'silver_board' | 'gold_board'

// Block-tinting skins override the per-piece color palette.
export const BLOCK_SKIN_COLORS: Partial<Record<SkinKey, string>> = {
  gold_block: '#ffd700',
  neon_pink:  '#ff00aa',
}

// Board-background skins override the board's surface CSS.
export const BOARD_SKIN_BACKGROUND: Partial<Record<SkinKey, string>> = {
  dark_board:    'radial-gradient(circle at 50% 0%, #0a0a18 0%, #000 100%)',
  galaxy_board:  'radial-gradient(ellipse at 30% 20%, #2a1a4a 0%, #0a0014 60%, #000 100%)',
  silver_board:  'linear-gradient(180deg, #1a1a22 0%, #000 100%)',
  gold_board:    'linear-gradient(180deg, #2a1f00 0%, #000 100%)',
}
```

- [ ] **Step 2: Pass active skin from UserProfileContext into TetrisBoard**

Add `activeSkin: SkinKey | null` to `UserProfile` (fetch alongside `active_badge_id`). In `TetrisBoard.tsx`, accept an optional `skin?: SkinKey` prop and apply the lookups when rendering:

```tsx
// inside TetrisBoard
const boardBg = skin ? BOARD_SKIN_BACKGROUND[skin] : undefined
const blockTint = skin ? BLOCK_SKIN_COLORS[skin] : undefined
// apply `boardBg` to the board container style; if blockTint, override per-cell color
```

Plumb the `skin` prop through `SoloGame` and `BattleGame` using `useUserProfile()`.

- [ ] **Step 3: Visual verification**

Unlock `combo_10` (or use SQL to manually insert `('<player_id>','combo_10')` into `player_achievements`), set it as active skin, confirm the board renders pink blocks.

- [ ] **Step 4: Commit**

```bash
git add src/lib/leveling/skins.ts src/components/TetrisBoard.tsx src/contexts/UserProfileContext.tsx src/components/SoloGame.tsx src/components/BattleGame.tsx
git commit -m "feat(cosmetic): map active_skin_id to board background and block tint"
```

---

### Task 4.5: Extract shared tier color util (cleanup)

**Files:**
- Modify: `src/components/UserMiniProfile.tsx`, `src/app/profile/page.tsx`, `src/app/leaderboard/page.tsx`, `src/components/GameEndModal.tsx`

- [ ] **Step 1: Replace inline `tierColors` maps with import**

In each file above, delete the local `tierColors` constant and `import { TIER_COLORS } from '@/lib/leveling/tierColors'`.

- [ ] **Step 2: Verify no behavior change (run dev server, spot-check pages)**

- [ ] **Step 3: Commit**

```bash
git add src/components/UserMiniProfile.tsx src/app/profile/page.tsx src/app/leaderboard/page.tsx src/components/GameEndModal.tsx
git commit -m "refactor(leveling): extract shared TIER_COLORS util"
```

---

## Verification After Each Phase

After completing each phase, run:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all green.

Then for Phase 2 onward, play one solo game and one battle game manually:
- Solo end → modal shows correct XP breakdown, level bar advances, achievements unlock if any.
- Battle end → modal shows MMR delta, both players' stats update server-side.

## Open Items (Out of Scope for This Plan)

- Season resets / season-only achievements
- Friend-comparison views
- Replay system to recover historical bonus data
