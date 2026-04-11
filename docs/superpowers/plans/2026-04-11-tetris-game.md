# Tetris.io 클론 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 16 + Supabase 기반 테트리스 게임 — 일반전(솔로)과 1vs1 경쟁전(점수 경쟁, 2분) 제공

**Architecture:** 순수 함수형 TetrisEngine(프레임워크 무관) → Canvas 렌더러 → React 훅 레이어. 멀티플레이어는 Supabase Realtime Broadcast(게임 상태 동기화) + Presence(매칭/방 관리)로 구현. 인증은 Anonymous Auth(게스트) + 이메일+비밀번호(로그인).

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase JS v2, Jest, Playwright

---

## 파일 구조 (생성 대상)

```
src/
  app/
    layout.tsx              ← 전역 레이아웃 (Supabase provider)
    page.tsx                ← 홈 (닉네임 입력, 게스트/로그인)
    play/page.tsx           ← 일반전
    lobby/page.tsx          ← 경쟁전 로비
    battle/[roomId]/page.tsx ← 경쟁전 게임
    leaderboard/page.tsx    ← 글로벌 랭킹
    profile/page.tsx        ← 개인 전적
  game/
    types.ts                ← GameState, Piece 타입
    pieces.ts               ← 테트로미노 정의 + 색상
    bag.ts                  ← 7-bag 랜덤 시스템
    engine.ts               ← 순수 게임 로직 (collision, clear, score, actions)
  components/
    TetrisBoard.tsx         ← Canvas 렌더러 (normal + mini 모드)
    HoldPiece.tsx           ← 홀드 슬롯 Canvas
    NextPieces.tsx          ← 다음 3개 미리보기 Canvas
    SoloGame.tsx            ← 일반전 조합
    BattleGame.tsx          ← 경쟁전 조합
    MatchmakingLobby.tsx    ← 매칭 UI
  hooks/
    useGame.ts              ← 게임 루프 (RAF + tick 타이밍)
    useKeyboard.ts          ← 키보드 → 엔진 액션 매핑
    useBattle.ts            ← Realtime 채널 연결 + 상태 sync
  lib/
    supabase/
      client.ts             ← 브라우저 Supabase 클라이언트
      server.ts             ← 서버 Supabase 클라이언트
    auth.ts                 ← 인증 헬퍼 (게스트/로그인/로그아웃)
    realtime.ts             ← 채널 생성/구독 헬퍼
  __tests__/
    game/engine.test.ts
    game/bag.test.ts
supabase/
  migrations/
    001_initial.sql
```

---

## Phase 1 — 게임 코어

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json` (자동 생성)
- Create: `jest.config.js`
- Create: `jest.setup.ts`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd C:/Projects/Nike
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```

Expected: `src/app/`, `tailwind.config.ts`, `tsconfig.json` 생성됨

- [ ] **Step 2: 의존성 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom @types/jest ts-jest
```

- [ ] **Step 3: Jest 설정 파일 작성**

`jest.config.js`:
```js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
module.exports = createJestConfig({
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathPattern: ['src/__tests__'],
})
```

`jest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: package.json 에 test 스크립트 추가**

`package.json`의 `scripts`에 추가:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: 환경변수 파일 생성**

`.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

`.gitignore`에 `.env.local` 이미 있는지 확인 후 없으면 추가.

- [ ] **Step 6: 첫 커밋**

```bash
git init
git add .
git commit -m "feat: initialize Next.js 16 project with Supabase + Jest"
```

---

### Task 2: 게임 타입 정의

**Files:**
- Create: `src/game/types.ts`

- [ ] **Step 1: 타입 파일 작성**

`src/game/types.ts`:
```ts
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

export type Piece = {
  type: PieceType
  rotation: 0 | 1 | 2 | 3
  x: number
  y: number
}

export type GameStatus = 'idle' | 'playing' | 'over'

export type GameState = {
  board: number[][]       // 20행 × 10열 (0=빈칸, 1-7=블록 타입)
  currentPiece: Piece
  holdPiece: Piece | null
  holdUsed: boolean       // 한 피스당 홀드 1회 제한
  nextPieces: Piece[]     // 다음 3개
  pieceBag: PieceType[]   // 남은 피스 목록 (소진 시 새 bag 추가)
  ghostY: number          // 고스트 피스 Y 위치
  score: number
  lines: number
  level: number
  speed: number           // ms per tick
  status: GameStatus
  flashRows: number[]     // 라인 클리어 애니메이션 대상 행
}

// Realtime 동기화용 경량 상태
export type BroadcastGameState = {
  board: number[][]
  score: number
  lines: number
  level: number
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/game/types.ts
git commit -m "feat: add game type definitions"
```

---

### Task 3: 테트로미노 정의 + 7-bag 시스템

**Files:**
- Create: `src/game/pieces.ts`
- Create: `src/game/bag.ts`
- Create: `src/__tests__/game/bag.test.ts`

- [ ] **Step 1: bag 테스트 작성**

`src/__tests__/game/bag.test.ts`:
```ts
import { createBag, refillBag } from '@/game/bag'

describe('createBag', () => {
  it('returns exactly 7 pieces', () => {
    const bag = createBag()
    expect(bag).toHaveLength(7)
  })

  it('contains each piece type exactly once', () => {
    const bag = createBag()
    const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
    types.forEach(t => expect(bag).toContain(t))
  })

  it('produces different orders on repeated calls (probabilistic)', () => {
    const results = new Set(Array.from({ length: 10 }, () => createBag().join('')))
    expect(results.size).toBeGreaterThan(1)
  })
})

describe('refillBag', () => {
  it('returns bag unchanged if length >= 7', () => {
    const bag = createBag()
    expect(refillBag(bag)).toHaveLength(7)
  })

  it('appends new bag when length < 7', () => {
    const bag = createBag().slice(0, 3) // 3개만 남김
    const refilled = refillBag(bag)
    expect(refilled.length).toBe(10) // 3 + 7
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx jest src/__tests__/game/bag.test.ts
```
Expected: FAIL (모듈 없음)

- [ ] **Step 3: pieces.ts 작성**

`src/game/pieces.ts`:
```ts
import { PieceType } from './types'

// 각 피스의 4가지 회전 상태 (4×4 행렬, 1=채워진 셀)
export const PIECE_MATRICES: Record<PieceType, number[][][]> = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  ],
  T: [
    [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  S: [
    [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
    [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  Z: [
    [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]],
  ],
  J: [
    [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]],
  ],
  L: [
    [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
    [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
}

// 보드에 저장될 피스 타입 번호 (0 = 빈칸)
export const PIECE_ID: Record<PieceType, number> = {
  I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7,
}

// 네온 사이버펑크 색상 팔레트
export const PIECE_COLORS: Record<number, string> = {
  1: '#00f5ff', // I
  2: '#ffe600', // O
  3: '#ff00ff', // T
  4: '#00ff88', // S
  5: '#ff3333', // Z
  6: '#4488ff', // J
  7: '#ff6600', // L
}

// 스폰 X 위치 (10칸 보드 기준, 4×4 행렬)
export const SPAWN_X = 3

// 스폰 Y 위치 (화면 위)
export const SPAWN_Y = -1

export function getMatrix(type: PieceType, rotation: 0 | 1 | 2 | 3): number[][] {
  return PIECE_MATRICES[type][rotation]
}

export function getPieceCells(
  type: PieceType,
  rotation: 0 | 1 | 2 | 3,
  x: number,
  y: number,
): { r: number; c: number }[] {
  const matrix = getMatrix(type, rotation)
  const cells: { r: number; c: number }[] = []
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (matrix[row][col]) {
        cells.push({ r: y + row, c: x + col })
      }
    }
  }
  return cells
}
```

- [ ] **Step 4: bag.ts 작성**

`src/game/bag.ts`:
```ts
import { PieceType } from './types'

const ALL_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createBag(): PieceType[] {
  return shuffle(ALL_TYPES)
}

// 남은 피스가 7개 미만이면 새 bag을 뒤에 추가
export function refillBag(bag: PieceType[]): PieceType[] {
  if (bag.length >= 7) return bag
  return [...bag, ...createBag()]
}

// 다음 피스를 꺼내고 필요시 bag을 보충
export function popPiece(bag: PieceType[]): { piece: PieceType; bag: PieceType[] } {
  const filled = refillBag(bag)
  const [piece, ...rest] = filled
  return { piece, bag: rest }
}
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
npx jest src/__tests__/game/bag.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/game/pieces.ts src/game/bag.ts src/__tests__/game/bag.test.ts
git commit -m "feat: add tetromino definitions and 7-bag random system"
```

---

### Task 4: TetrisEngine — 충돌 감지 & 보드 연산

**Files:**
- Create: `src/game/engine.ts`
- Create: `src/__tests__/game/engine.test.ts`

- [ ] **Step 1: 충돌 감지 테스트 작성**

`src/__tests__/game/engine.test.ts`:
```ts
import {
  createInitialState,
  isValidPosition,
  lockPiece,
  clearLines,
  calcGhostY,
} from '@/game/engine'
import { Piece } from '@/game/types'

describe('isValidPosition', () => {
  const state = createInitialState()

  it('returns true for piece within empty board bounds', () => {
    const piece: Piece = { type: 'O', rotation: 0, x: 3, y: 0 }
    expect(isValidPosition(state.board, piece)).toBe(true)
  })

  it('returns false when piece exits left boundary', () => {
    const piece: Piece = { type: 'O', rotation: 0, x: -1, y: 0 }
    expect(isValidPosition(state.board, piece)).toBe(false)
  })

  it('returns false when piece exits right boundary', () => {
    const piece: Piece = { type: 'I', rotation: 0, x: 8, y: 0 }
    expect(isValidPosition(state.board, piece)).toBe(false)
  })

  it('returns false when piece exits bottom boundary', () => {
    const piece: Piece = { type: 'O', rotation: 0, x: 3, y: 19 }
    expect(isValidPosition(state.board, piece)).toBe(false)
  })

  it('returns false when piece overlaps existing board cells', () => {
    const board = state.board.map(r => [...r])
    board[1][4] = 1 // 기존 블록
    const piece: Piece = { type: 'O', rotation: 0, x: 3, y: 0 }
    expect(isValidPosition(board, piece)).toBe(false)
  })
})

describe('lockPiece', () => {
  it('writes piece cells to board with correct piece id', () => {
    const state = createInitialState()
    const piece: Piece = { type: 'O', rotation: 0, x: 3, y: 0 }
    const board = lockPiece(state.board, piece)
    // O piece at rotation 0 fills [0][4], [0][5], [1][4], [1][5]
    expect(board[0][4]).toBe(2) // O = 2
    expect(board[0][5]).toBe(2)
    expect(board[1][4]).toBe(2)
    expect(board[1][5]).toBe(2)
  })

  it('does not mutate the original board', () => {
    const state = createInitialState()
    const original = JSON.stringify(state.board)
    const piece: Piece = { type: 'O', rotation: 0, x: 3, y: 0 }
    lockPiece(state.board, piece)
    expect(JSON.stringify(state.board)).toBe(original)
  })
})

describe('clearLines', () => {
  it('clears a full row and shifts rows down', () => {
    const state = createInitialState()
    const board = state.board.map(r => [...r])
    board[19] = Array(10).fill(1) // 마지막 행 가득 채움
    const { board: newBoard, clearedCount } = clearLines(board)
    expect(clearedCount).toBe(1)
    expect(newBoard[19].every(c => c === 0)).toBe(true)
  })

  it('clears multiple rows', () => {
    const state = createInitialState()
    const board = state.board.map(r => [...r])
    board[18] = Array(10).fill(1)
    board[19] = Array(10).fill(1)
    const { clearedCount } = clearLines(board)
    expect(clearedCount).toBe(2)
  })

  it('returns clearedCount 0 when no full rows', () => {
    const state = createInitialState()
    const { clearedCount } = clearLines(state.board)
    expect(clearedCount).toBe(0)
  })
})

describe('calcGhostY', () => {
  it('returns the lowest valid Y for the current piece', () => {
    const state = createInitialState()
    const ghostY = calcGhostY(state.board, state.currentPiece)
    expect(ghostY).toBeGreaterThan(state.currentPiece.y)
    // I piece at y=-1, rotation 0: should land at y=16 on empty 20-row board
    expect(ghostY).toBe(16)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx jest src/__tests__/game/engine.test.ts
```
Expected: FAIL

- [ ] **Step 3: engine.ts 기본 구조 작성**

`src/game/engine.ts` (충돌/보드 파트):
```ts
import { GameState, GameStatus, Piece, PieceType } from './types'
import { PIECE_ID, SPAWN_X, SPAWN_Y, getPieceCells } from './pieces'
import { createBag, popPiece } from './bag'

export const BOARD_ROWS = 20
export const BOARD_COLS = 10

export function createEmptyBoard(): number[][] {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(0))
}

function spawnPiece(type: PieceType): Piece {
  return { type, rotation: 0, x: SPAWN_X, y: SPAWN_Y }
}

export function createInitialState(): GameState {
  const initialBag = createBag()
  const { piece: first, bag: bag1 } = popPiece(initialBag)
  const { piece: n1, bag: bag2 } = popPiece(bag1)
  const { piece: n2, bag: bag3 } = popPiece(bag2)
  const { piece: n3, bag: bag4 } = popPiece(bag3)

  const currentPiece = spawnPiece(first)
  const state: GameState = {
    board: createEmptyBoard(),
    currentPiece,
    holdPiece: null,
    holdUsed: false,
    nextPieces: [spawnPiece(n1), spawnPiece(n2), spawnPiece(n3)],
    pieceBag: bag4,
    ghostY: 0,
    score: 0,
    lines: 0,
    level: 1,
    speed: 1000,
    status: 'idle',
    flashRows: [],
  }
  return { ...state, ghostY: calcGhostY(state.board, state.currentPiece) }
}

export function isValidPosition(board: number[][], piece: Piece): boolean {
  const cells = getPieceCells(piece.type, piece.rotation, piece.x, piece.y)
  for (const { r, c } of cells) {
    if (c < 0 || c >= BOARD_COLS) return false
    if (r >= BOARD_ROWS) return false
    if (r >= 0 && board[r][c] !== 0) return false
  }
  return true
}

export function lockPiece(board: number[][], piece: Piece): number[][] {
  const newBoard = board.map(r => [...r])
  const cells = getPieceCells(piece.type, piece.rotation, piece.x, piece.y)
  const id = PIECE_ID[piece.type]
  for (const { r, c } of cells) {
    if (r >= 0) newBoard[r][c] = id
  }
  return newBoard
}

export function clearLines(board: number[][]): {
  board: number[][]
  clearedCount: number
  clearedRows: number[]
} {
  const clearedRows: number[] = []
  const remaining = board.filter((row, i) => {
    if (row.every(c => c !== 0)) {
      clearedRows.push(i)
      return false
    }
    return true
  })
  const newRows = Array.from(
    { length: clearedRows.length },
    () => Array(BOARD_COLS).fill(0),
  )
  return {
    board: [...newRows, ...remaining],
    clearedCount: clearedRows.length,
    clearedRows,
  }
}

export function calcGhostY(board: number[][], piece: Piece): number {
  let y = piece.y
  while (isValidPosition(board, { ...piece, y: y + 1 })) {
    y++
  }
  return y
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx jest src/__tests__/game/engine.test.ts
```
Expected: PASS (9 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/game/engine.ts src/__tests__/game/engine.test.ts
git commit -m "feat: add TetrisEngine collision, lockPiece, clearLines, calcGhostY"
```

---

### Task 5: TetrisEngine — 점수 계산 & 레벨업

**Files:**
- Modify: `src/game/engine.ts`
- Modify: `src/__tests__/game/engine.test.ts`

- [ ] **Step 1: 점수/레벨 테스트 추가**

`src/__tests__/game/engine.test.ts` 아래에 추가:
```ts
import { calcScore, calcLevel, calcSpeed } from '@/game/engine'

describe('calcScore', () => {
  it('1 line = 100 * level', () => {
    expect(calcScore(1, 1)).toBe(100)
    expect(calcScore(1, 3)).toBe(300)
  })

  it('2 lines = 300 * level', () => {
    expect(calcScore(2, 1)).toBe(300)
  })

  it('3 lines = 500 * level', () => {
    expect(calcScore(3, 1)).toBe(500)
  })

  it('4 lines (Tetris) = 800 * level', () => {
    expect(calcScore(4, 1)).toBe(800)
    expect(calcScore(4, 2)).toBe(1600)
  })
})

describe('calcLevel', () => {
  it('starts at level 1', () => {
    expect(calcLevel(0)).toBe(1)
  })

  it('level 2 after 10 lines', () => {
    expect(calcLevel(10)).toBe(2)
  })

  it('level 5 after 40 lines', () => {
    expect(calcLevel(40)).toBe(5)
  })
})

describe('calcSpeed', () => {
  it('level 1 = 1000ms', () => {
    expect(calcSpeed(1)).toBe(1000)
  })

  it('level 6 = 600ms', () => {
    expect(calcSpeed(6)).toBe(600)
  })

  it('never goes below 100ms', () => {
    expect(calcSpeed(100)).toBe(100)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx jest src/__tests__/game/engine.test.ts --testNamePattern="calcScore|calcLevel|calcSpeed"
```
Expected: FAIL

- [ ] **Step 3: 점수/레벨 함수를 engine.ts에 추가**

`src/game/engine.ts`에 추가:
```ts
const LINE_SCORES = [0, 100, 300, 500, 800]

export function calcScore(linesCleared: number, level: number): number {
  return (LINE_SCORES[linesCleared] ?? 0) * level
}

export function calcLevel(totalLines: number): number {
  return Math.floor(totalLines / 10) + 1
}

export function calcSpeed(level: number): number {
  return Math.max(100, 1000 - (level - 1) * 80)
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx jest src/__tests__/game/engine.test.ts
```
Expected: PASS (모두)

- [ ] **Step 5: 커밋**

```bash
git add src/game/engine.ts src/__tests__/game/engine.test.ts
git commit -m "feat: add calcScore, calcLevel, calcSpeed to TetrisEngine"
```

---

### Task 6: TetrisEngine — 플레이어 액션

**Files:**
- Modify: `src/game/engine.ts`
- Modify: `src/__tests__/game/engine.test.ts`

- [ ] **Step 1: 플레이어 액션 테스트 추가**

`src/__tests__/game/engine.test.ts` 아래에 추가:
```ts
import {
  startGame,
  moveLeft,
  moveRight,
  softDrop,
  hardDrop,
  rotateClockwise,
  hold,
  tick,
} from '@/game/engine'

describe('moveLeft', () => {
  it('decrements x when position is valid', () => {
    const state = startGame(createInitialState())
    const moved = moveLeft(state)
    expect(moved.currentPiece.x).toBe(state.currentPiece.x - 1)
  })

  it('does not move when blocked by left wall', () => {
    const state = startGame(createInitialState())
    // I 피스를 왼쪽 끝으로 이동
    const atWall = { ...state, currentPiece: { ...state.currentPiece, x: 0 } }
    const moved = moveLeft(atWall)
    expect(moved.currentPiece.x).toBe(0)
  })
})

describe('moveRight', () => {
  it('increments x when position is valid', () => {
    const state = startGame(createInitialState())
    const moved = moveRight(state)
    expect(moved.currentPiece.x).toBe(state.currentPiece.x + 1)
  })
})

describe('hardDrop', () => {
  it('places piece at ghostY and spawns next piece', () => {
    const state = startGame(createInitialState())
    const dropped = hardDrop(state)
    // 피스가 잠기고 새 피스가 스폰됨
    expect(dropped.currentPiece.type).toBe(state.nextPieces[0].type)
  })

  it('adds hard drop bonus score (2 * distance)', () => {
    const state = startGame(createInitialState())
    const distance = state.ghostY - state.currentPiece.y
    const dropped = hardDrop(state)
    expect(dropped.score).toBeGreaterThanOrEqual(distance * 2)
  })
})

describe('hold', () => {
  it('swaps currentPiece into holdPiece', () => {
    const state = startGame(createInitialState())
    const held = hold(state)
    expect(held.holdPiece?.type).toBe(state.currentPiece.type)
  })

  it('pulls from nextPieces when holdPiece is null', () => {
    const state = startGame(createInitialState())
    const held = hold(state)
    expect(held.currentPiece.type).toBe(state.nextPieces[0].type)
  })

  it('cannot hold twice in a row', () => {
    const state = startGame(createInitialState())
    const held = hold(state)
    const heldAgain = hold(held)
    expect(heldAgain.currentPiece.type).toBe(held.currentPiece.type)
  })
})

describe('tick', () => {
  it('moves currentPiece down by 1', () => {
    const state = startGame(createInitialState())
    const ticked = tick(state)
    expect(ticked.currentPiece.y).toBe(state.currentPiece.y + 1)
  })

  it('locks piece and spawns next when cannot move down', () => {
    const state = startGame(createInitialState())
    const atBottom = { ...state, currentPiece: { ...state.currentPiece, y: state.ghostY } }
    const ticked = tick(atBottom)
    expect(ticked.currentPiece.type).toBe(state.nextPieces[0].type)
  })

  it('sets status to over when new piece cannot spawn', () => {
    // 보드를 꽉 채워서 게임오버 조건 만들기
    const state = startGame(createInitialState())
    const fullBoard = state.board.map((r, i) =>
      i < 18 ? Array(10).fill(1) : [...r]
    )
    const atBottom = {
      ...state,
      board: fullBoard,
      currentPiece: { ...state.currentPiece, y: state.ghostY },
    }
    const ticked = tick(atBottom)
    expect(ticked.status).toBe('over')
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx jest src/__tests__/game/engine.test.ts --testNamePattern="moveLeft|moveRight|hardDrop|hold|tick"
```
Expected: FAIL

- [ ] **Step 3: 플레이어 액션 함수를 engine.ts에 추가**

`src/game/engine.ts`에 추가:
```ts
export function startGame(state: GameState): GameState {
  return { ...state, status: 'playing' }
}

function nextPieceFromBag(
  pieceBag: PieceType[],
  nextPieces: Piece[],
): { newCurrent: Piece; newNextPieces: Piece[]; newBag: PieceType[] } {
  const { piece: nextType, bag: bagAfter } = popPiece(pieceBag)
  const newCurrent = spawnPiece(nextPieces[0].type)
  const newNextPieces = [...nextPieces.slice(1), spawnPiece(nextType)]
  return { newCurrent, newNextPieces, newBag: bagAfter }
}

function lockAndSpawn(state: GameState): GameState {
  const newBoard = lockPiece(state.board, state.currentPiece)
  const { board: clearedBoard, clearedCount } = clearLines(newBoard)
  const newLines = state.lines + clearedCount
  const newLevel = calcLevel(newLines)
  const newScore = state.score + calcScore(clearedCount, newLevel)
  const newSpeed = calcSpeed(newLevel)

  const { newCurrent, newNextPieces, newBag } = nextPieceFromBag(
    state.pieceBag,
    state.nextPieces,
  )

  const isOver = !isValidPosition(clearedBoard, newCurrent)
  const ghostY = isOver ? 0 : calcGhostY(clearedBoard, newCurrent)

  return {
    ...state,
    board: clearedBoard,
    currentPiece: newCurrent,
    nextPieces: newNextPieces,
    pieceBag: newBag,
    holdUsed: false,
    ghostY,
    score: newScore,
    lines: newLines,
    level: newLevel,
    speed: newSpeed,
    status: isOver ? 'over' : state.status,
    flashRows: [],
  }
}

export function tick(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const moved = { ...state, currentPiece: { ...state.currentPiece, y: state.currentPiece.y + 1 } }
  if (isValidPosition(state.board, moved.currentPiece)) {
    return { ...moved, ghostY: calcGhostY(state.board, moved.currentPiece) }
  }
  return lockAndSpawn(state)
}

export function moveLeft(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const moved = { ...state.currentPiece, x: state.currentPiece.x - 1 }
  if (!isValidPosition(state.board, moved)) return state
  return { ...state, currentPiece: moved, ghostY: calcGhostY(state.board, moved) }
}

export function moveRight(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const moved = { ...state.currentPiece, x: state.currentPiece.x + 1 }
  if (!isValidPosition(state.board, moved)) return state
  return { ...state, currentPiece: moved, ghostY: calcGhostY(state.board, moved) }
}

export function softDrop(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const moved = { ...state.currentPiece, y: state.currentPiece.y + 1 }
  if (!isValidPosition(state.board, moved)) return lockAndSpawn(state)
  return { ...state, currentPiece: moved, score: state.score + 1, ghostY: calcGhostY(state.board, moved) }
}

export function hardDrop(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const distance = state.ghostY - state.currentPiece.y
  const landed = { ...state.currentPiece, y: state.ghostY }
  const bonus = distance * 2
  return lockAndSpawn({ ...state, currentPiece: landed, score: state.score + bonus })
}

export function rotateClockwise(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const newRot = ((state.currentPiece.rotation + 1) % 4) as 0 | 1 | 2 | 3
  const rotated = { ...state.currentPiece, rotation: newRot }
  if (isValidPosition(state.board, rotated)) {
    return { ...state, currentPiece: rotated, ghostY: calcGhostY(state.board, rotated) }
  }
  // 간단한 wall kick: x±1 시도
  for (const dx of [-1, 1, -2, 2]) {
    const kicked = { ...rotated, x: rotated.x + dx }
    if (isValidPosition(state.board, kicked)) {
      return { ...state, currentPiece: kicked, ghostY: calcGhostY(state.board, kicked) }
    }
  }
  return state
}

export function rotateCounterClockwise(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const newRot = ((state.currentPiece.rotation + 3) % 4) as 0 | 1 | 2 | 3
  const rotated = { ...state.currentPiece, rotation: newRot }
  if (isValidPosition(state.board, rotated)) {
    return { ...state, currentPiece: rotated, ghostY: calcGhostY(state.board, rotated) }
  }
  for (const dx of [-1, 1, -2, 2]) {
    const kicked = { ...rotated, x: rotated.x + dx }
    if (isValidPosition(state.board, kicked)) {
      return { ...state, currentPiece: kicked, ghostY: calcGhostY(state.board, kicked) }
    }
  }
  return state
}

export function hold(state: GameState): GameState {
  if (state.status !== 'playing' || state.holdUsed) return state
  if (state.holdPiece === null) {
    const { newCurrent, newNextPieces, newBag } = nextPieceFromBag(
      state.pieceBag,
      state.nextPieces,
    )
    const newHold = spawnPiece(state.currentPiece.type)
    const ghostY = calcGhostY(state.board, newCurrent)
    return {
      ...state,
      currentPiece: newCurrent,
      holdPiece: newHold,
      holdUsed: true,
      nextPieces: newNextPieces,
      pieceBag: newBag,
      ghostY,
    }
  }
  const restored = spawnPiece(state.holdPiece.type)
  const newHold = spawnPiece(state.currentPiece.type)
  const ghostY = calcGhostY(state.board, restored)
  return {
    ...state,
    currentPiece: restored,
    holdPiece: newHold,
    holdUsed: true,
    ghostY,
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx jest src/__tests__/game/engine.test.ts
```
Expected: PASS (모두)

- [ ] **Step 5: 커밋**

```bash
git add src/game/engine.ts src/__tests__/game/engine.test.ts
git commit -m "feat: add TetrisEngine player actions (move, rotate, drop, hold, tick)"
```

---

### Task 7: Canvas 렌더러 (TetrisBoard)

**Files:**
- Create: `src/components/TetrisBoard.tsx`
- Create: `src/components/HoldPiece.tsx`
- Create: `src/components/NextPieces.tsx`

- [ ] **Step 1: TetrisBoard 작성**

`src/components/TetrisBoard.tsx`:

```tsx
'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'

const CELL = 30
const MINI_CELL = 12

type Props = {
  board: number[][]
  currentPiece?: Piece
  ghostY?: number
  mini?: boolean
  flashRows?: number[]
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  c: number,
  r: number,
  colorHex: string,
  cellSize: number,
  glow = true,
) {
  ctx.fillStyle = colorHex
  if (glow) {
    ctx.shadowBlur = 8
    ctx.shadowColor = colorHex
  }
  ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2)
  ctx.shadowBlur = 0
}

export default function TetrisBoard({
  board, currentPiece, ghostY, mini = false, flashRows = [],
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cellSize = mini ? MINI_CELL : CELL
  const width = 10 * cellSize
  const height = 20 * cellSize

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, width, height)

    // 그리드
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 0.5
    for (let r = 0; r <= 20; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * cellSize); ctx.lineTo(width, r * cellSize); ctx.stroke()
    }
    for (let c = 0; c <= 10; c++) {
      ctx.beginPath(); ctx.moveTo(c * cellSize, 0); ctx.lineTo(c * cellSize, height); ctx.stroke()
    }

    // 보드 블록
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 10; c++) {
        const id = board[r][c]
        if (!id) continue
        if (flashRows.includes(r)) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2)
        } else {
          drawCell(ctx, c, r, PIECE_COLORS[id], cellSize, !mini)
        }
      }
    }

    if (!mini && currentPiece) {
      const color = PIECE_COLORS[PIECE_ID[currentPiece.type]]

      // 고스트 피스
      if (ghostY !== undefined) {
        ctx.globalAlpha = 0.2
        const ghostCells = getPieceCells(currentPiece.type, currentPiece.rotation, currentPiece.x, ghostY)
        for (const { r, c } of ghostCells) {
          if (r >= 0) drawCell(ctx, c, r, color, cellSize, false)
        }
        ctx.globalAlpha = 1
      }

      // 현재 피스
      const cells = getPieceCells(currentPiece.type, currentPiece.rotation, currentPiece.x, currentPiece.y)
      for (const { r, c } of cells) {
        if (r >= 0) drawCell(ctx, c, r, color, cellSize, true)
      }
    }
  }, [board, currentPiece, ghostY, mini, flashRows, cellSize, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-cyan-500/30"
      style={{ boxShadow: mini ? 'none' : '0 0 20px rgba(0,245,255,0.1)' }}
    />
  )
}
```

- [ ] **Step 2: HoldPiece 컴포넌트 작성**

`src/components/HoldPiece.tsx`:
```tsx
'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'

const CELL = 20

export default function HoldPiece({ piece }: { piece: Piece | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, 80, 80)
    if (!piece) return
    const color = PIECE_COLORS[PIECE_ID[piece.type]]
    const cells = getPieceCells(piece.type, 0, 0, 0)
    ctx.fillStyle = color
    ctx.shadowBlur = 6
    ctx.shadowColor = color
    for (const { r, c } of cells) {
      ctx.fillRect(c * CELL + 1 + 10, r * CELL + 1 + 20, CELL - 2, CELL - 2)
    }
    ctx.shadowBlur = 0
  }, [piece])

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Hold</p>
      <canvas ref={canvasRef} width={80} height={80} className="border border-cyan-500/20" />
    </div>
  )
}
```

- [ ] **Step 3: NextPieces 컴포넌트 작성**

`src/components/NextPieces.tsx`:
```tsx
'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'

const CELL = 16
const SLOT_H = 60

export default function NextPieces({ pieces }: { pieces: Piece[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, 80, SLOT_H * 3)
    pieces.slice(0, 3).forEach((piece, i) => {
      const color = PIECE_COLORS[PIECE_ID[piece.type]]
      ctx.fillStyle = color
      ctx.shadowBlur = 4
      ctx.shadowColor = color
      const cells = getPieceCells(piece.type, 0, 0, 0)
      for (const { r, c } of cells) {
        ctx.fillRect(c * CELL + 1 + 8, r * CELL + 1 + i * SLOT_H + 8, CELL - 2, CELL - 2)
      }
      ctx.shadowBlur = 0
    })
  }, [pieces])

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Next</p>
      <canvas ref={canvasRef} width={80} height={SLOT_H * 3} className="border border-cyan-500/20" />
    </div>
  )
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/components/TetrisBoard.tsx src/components/HoldPiece.tsx src/components/NextPieces.tsx
git commit -m "feat: add TetrisBoard Canvas renderer, HoldPiece, NextPieces components"
```

---

### Task 8: useGame 훅 + useKeyboard 훅 + 일반전 페이지

**Files:**
- Create: `src/hooks/useGame.ts`
- Create: `src/hooks/useKeyboard.ts`
- Create: `src/components/SoloGame.tsx`
- Modify: `src/app/play/page.tsx`

- [ ] **Step 1: useGame 훅 작성**

`src/hooks/useGame.ts`:
```ts
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GameState } from '@/game/types'
import {
  createInitialState, startGame, tick,
  moveLeft, moveRight, softDrop, hardDrop,
  rotateClockwise, rotateCounterClockwise, hold,
} from '@/game/engine'

export function useGame() {
  const [state, setState] = useState<GameState>(createInitialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const lastTickRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  const loop = useCallback((timestamp: number) => {
    const s = stateRef.current
    if (s.status === 'playing') {
      if (timestamp - lastTickRef.current >= s.speed) {
        lastTickRef.current = timestamp
        setState(prev => tick(prev))
      }
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [loop])

  const actions = {
    start: () => setState(s => startGame(s)),
    reset: () => setState(createInitialState()),
    moveLeft: () => setState(s => moveLeft(s)),
    moveRight: () => setState(s => moveRight(s)),
    softDrop: () => setState(s => softDrop(s)),
    hardDrop: () => setState(s => hardDrop(s)),
    rotateClockwise: () => setState(s => rotateClockwise(s)),
    rotateCounterClockwise: () => setState(s => rotateCounterClockwise(s)),
    hold: () => setState(s => hold(s)),
  }

  return { state, actions }
}
```

- [ ] **Step 2: useKeyboard 훅 작성**

`src/hooks/useKeyboard.ts`:
```ts
'use client'
import { useEffect } from 'react'

type Actions = {
  moveLeft: () => void
  moveRight: () => void
  softDrop: () => void
  hardDrop: () => void
  rotateClockwise: () => void
  rotateCounterClockwise: () => void
  hold: () => void
}

export function useKeyboard(actions: Actions, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const pressedKeys = new Set<string>()
    let softDropInterval: ReturnType<typeof setInterval> | null = null

    const handleKeyDown = (e: KeyboardEvent) => {
      if (pressedKeys.has(e.code)) return
      pressedKeys.add(e.code)
      e.preventDefault()

      switch (e.code) {
        case 'ArrowLeft':  actions.moveLeft(); break
        case 'ArrowRight': actions.moveRight(); break
        case 'ArrowUp':
        case 'KeyX':       actions.rotateClockwise(); break
        case 'KeyZ':       actions.rotateCounterClockwise(); break
        case 'Space':      actions.hardDrop(); break
        case 'KeyC':       actions.hold(); break
        case 'ArrowDown':
          actions.softDrop()
          softDropInterval = setInterval(() => actions.softDrop(), 50)
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code)
      if (e.code === 'ArrowDown' && softDropInterval) {
        clearInterval(softDropInterval)
        softDropInterval = null
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (softDropInterval) clearInterval(softDropInterval)
    }
  }, [actions, enabled])
}
```

- [ ] **Step 3: SoloGame 컴포넌트 작성**

`src/components/SoloGame.tsx`:
```tsx
'use client'
import { useGame } from '@/hooks/useGame'
import { useKeyboard } from '@/hooks/useKeyboard'
import TetrisBoard from './TetrisBoard'
import HoldPiece from './HoldPiece'
import NextPieces from './NextPieces'

export default function SoloGame() {
  const { state, actions } = useGame()
  useKeyboard(actions, state.status === 'playing')

  return (
    <div className="flex items-start gap-6 justify-center">
      {/* 왼쪽 패널 */}
      <div className="flex flex-col gap-4 w-24">
        <HoldPiece piece={state.holdPiece} />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Score</p>
          <p className="text-cyan-400 font-bold text-xl tabular-nums" style={{ textShadow: '0 0 8px #00f5ff' }}>
            {state.score.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Level</p>
          <p className="text-purple-400 font-bold text-lg">{state.level}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Lines</p>
          <p className="text-gray-300 font-bold text-lg">{state.lines}</p>
        </div>
      </div>

      {/* 게임 보드 */}
      <div className="relative">
        <TetrisBoard
          board={state.board}
          currentPiece={state.currentPiece}
          ghostY={state.ghostY}
          flashRows={state.flashRows}
        />
        {state.status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <button
              onClick={actions.start}
              className="px-8 py-3 bg-cyan-500/20 border border-cyan-500 text-cyan-400 font-bold text-lg hover:bg-cyan-500/40 transition"
              style={{ textShadow: '0 0 8px #00f5ff', boxShadow: '0 0 20px rgba(0,245,255,0.3)' }}
            >
              START
            </button>
          </div>
        )}
        {state.status === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
            <p className="text-red-400 font-bold text-2xl" style={{ textShadow: '0 0 10px #ff3333' }}>
              GAME OVER
            </p>
            <p className="text-gray-300">Score: {state.score.toLocaleString()}</p>
            <button
              onClick={actions.reset}
              className="px-6 py-2 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition"
            >
              RETRY
            </button>
          </div>
        )}
      </div>

      {/* 오른쪽 패널 */}
      <div className="w-24">
        <NextPieces pieces={state.nextPieces} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: /play 페이지 작성**

`src/app/play/page.tsx`:
```tsx
import SoloGame from '@/components/SoloGame'
import Link from 'next/link'

export default function PlayPage() {
  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
        <h1 className="text-cyan-400 font-bold text-2xl tracking-widest"
          style={{ textShadow: '0 0 10px #00f5ff' }}>
          TETRIS
        </h1>
      </div>
      <SoloGame />
      <p className="mt-6 text-gray-600 text-xs text-center">
        ← → Move &nbsp;|&nbsp; ↑/X Rotate &nbsp;|&nbsp; Z Counter-rotate &nbsp;|&nbsp; Space Hard Drop &nbsp;|&nbsp; C Hold
      </p>
    </main>
  )
}
```

- [ ] **Step 5: 개발 서버로 수동 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/play` 열기. START 버튼 → 키보드로 게임 플레이 확인.

- [ ] **Step 6: 커밋**

```bash
git add src/hooks/ src/components/SoloGame.tsx src/app/play/page.tsx
git commit -m "feat: add useGame hook, useKeyboard hook, SoloGame component, /play page"
```

---

## Phase 2 — 인증 & 인프라

### Task 9: Supabase 설정 + DB 마이그레이션

**Files:**
- Create: `supabase/migrations/001_initial.sql`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

- [ ] **Step 1: Supabase CLI 설치 및 프로젝트 초기화**

```bash
npm install -g supabase
supabase init
```

Expected: `supabase/` 디렉토리 생성됨

- [ ] **Step 2: 마이그레이션 파일 작성**

`supabase/migrations/001_initial.sql`:
```sql
-- profiles 테이블
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null,
  is_guest boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read all profiles"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- game_results 테이블
create table public.game_results (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  player_id uuid references public.profiles on delete set null,
  opponent_id uuid references public.profiles on delete set null,
  my_score int not null,
  opponent_score int not null,
  is_win boolean not null,
  played_at timestamptz not null default now()
);

alter table public.game_results enable row level security;

create policy "Users can read own game results"
  on public.game_results for select using (auth.uid() = player_id);

create policy "Users can insert own game results"
  on public.game_results for insert with check (auth.uid() = player_id);

-- 리더보드 뷰
create view public.leaderboard_view as
select
  p.id as player_id,
  p.nickname,
  max(gr.my_score) as best_score,
  count(*) filter (where gr.is_win) as total_wins,
  count(*) as total_games,
  round(
    count(*) filter (where gr.is_win)::numeric / nullif(count(*), 0) * 100,
    1
  ) as win_rate
from public.profiles p
join public.game_results gr on gr.player_id = p.id
where p.is_guest = false
group by p.id, p.nickname
order by best_score desc;
```

- [ ] **Step 3: Supabase 브라우저 클라이언트 작성**

`src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 4: Supabase 서버 클라이언트 작성**

`src/lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    },
  )
}
```

- [ ] **Step 5: Supabase 대시보드에서 프로젝트 생성**

1. https://supabase.com 에서 새 프로젝트 생성
2. Project URL, anon key 복사 → `.env.local` 에 입력
3. SQL Editor에서 `supabase/migrations/001_initial.sql` 내용 실행
4. Authentication > Providers > Anonymous Sign-ins 활성화

- [ ] **Step 6: 커밋**

```bash
git add supabase/ src/lib/supabase/
git commit -m "feat: add Supabase setup, DB migrations, client/server helpers"
```

---

### Task 10: 인증 헬퍼 + 홈 페이지

**Files:**
- Create: `src/lib/auth.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 인증 헬퍼 작성**

`src/lib/auth.ts`:
```ts
import { createClient } from '@/lib/supabase/client'

export async function signInAsGuest(nickname: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) throw error ?? new Error('Anonymous sign-in failed')

  await supabase.from('profiles').upsert({
    id: data.user.id,
    nickname,
    is_guest: true,
  })

  return data.user
}

export async function signUpWithEmail(nickname: string, email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error || !data.user) throw error ?? new Error('Sign up failed')

  await supabase.from('profiles').upsert({
    id: data.user.id,
    nickname,
    is_guest: false,
  })

  return data.user
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw error ?? new Error('Sign in failed')
  return data.user
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export async function getCurrentProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
}
```

- [ ] **Step 2: 글로벌 레이아웃 업데이트**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import './globals.css'

const geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TETRIS.IO',
  description: '1vs1 Neon Tetris Battle',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geistMono.className} bg-[#0a0a1a] text-white`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: 홈 페이지 작성**

`src/app/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signInAsGuest, signInWithEmail, signUpWithEmail } from '@/lib/auth'

type Mode = 'home' | 'guest' | 'login' | 'register'

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('home')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGuest = async () => {
    if (!nickname.trim()) return setError('닉네임을 입력해주세요')
    setLoading(true)
    try {
      await signInAsGuest(nickname.trim())
      router.push('/play')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      router.push('/play')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!nickname.trim()) return setError('닉네임을 입력해주세요')
    setLoading(true)
    try {
      await signUpWithEmail(nickname.trim(), email, password)
      router.push('/play')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '회원가입 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center">
      {/* 타이틀 */}
      <h1 className="text-5xl font-bold tracking-widest mb-2 text-cyan-400"
        style={{ textShadow: '0 0 20px #00f5ff, 0 0 40px #00f5ff50' }}>
        TETRIS
      </h1>
      <p className="text-purple-400 text-sm tracking-widest mb-12"
        style={{ textShadow: '0 0 8px #ff00ff' }}>
        NEON BATTLE
      </p>

      {/* 메인 메뉴 */}
      {mode === 'home' && (
        <div className="flex flex-col gap-4 w-64">
          <button onClick={() => setMode('guest')}
            className="py-3 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition tracking-widest">
            PLAY AS GUEST
          </button>
          <button onClick={() => setMode('login')}
            className="py-3 border border-purple-500 text-purple-400 hover:bg-purple-500/20 transition tracking-widest">
            LOGIN
          </button>
          <button onClick={() => setMode('register')}
            className="py-3 border border-gray-600 text-gray-400 hover:bg-gray-600/20 transition tracking-widest">
            REGISTER
          </button>
        </div>
      )}

      {/* 게스트 폼 */}
      {mode === 'guest' && (
        <div className="flex flex-col gap-4 w-64">
          <input value={nickname} onChange={e => setNickname(e.target.value)}
            placeholder="닉네임 입력"
            className="px-4 py-3 bg-transparent border border-cyan-500/50 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400"
            onKeyDown={e => e.key === 'Enter' && handleGuest()} />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleGuest} disabled={loading}
            className="py-3 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition disabled:opacity-50">
            {loading ? '...' : 'START'}
          </button>
          <button onClick={() => { setMode('home'); setError('') }}
            className="text-gray-600 text-sm hover:text-gray-400">
            ← Back
          </button>
        </div>
      )}

      {/* 로그인 폼 */}
      {mode === 'login' && (
        <div className="flex flex-col gap-4 w-64">
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="이메일" type="email"
            className="px-4 py-3 bg-transparent border border-purple-500/50 text-white placeholder-gray-600 focus:outline-none focus:border-purple-400" />
          <input value={password} onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호" type="password"
            className="px-4 py-3 bg-transparent border border-purple-500/50 text-white placeholder-gray-600 focus:outline-none focus:border-purple-400"
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleLogin} disabled={loading}
            className="py-3 border border-purple-500 text-purple-400 hover:bg-purple-500/20 transition disabled:opacity-50">
            {loading ? '...' : 'LOGIN'}
          </button>
          <button onClick={() => { setMode('home'); setError('') }}
            className="text-gray-600 text-sm hover:text-gray-400">
            ← Back
          </button>
        </div>
      )}

      {/* 회원가입 폼 */}
      {mode === 'register' && (
        <div className="flex flex-col gap-4 w-64">
          <input value={nickname} onChange={e => setNickname(e.target.value)}
            placeholder="닉네임"
            className="px-4 py-3 bg-transparent border border-gray-600/50 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400" />
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="이메일" type="email"
            className="px-4 py-3 bg-transparent border border-gray-600/50 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400" />
          <input value={password} onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호" type="password"
            className="px-4 py-3 bg-transparent border border-gray-600/50 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400"
            onKeyDown={e => e.key === 'Enter' && handleRegister()} />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleRegister} disabled={loading}
            className="py-3 border border-gray-500 text-gray-400 hover:bg-gray-600/20 transition disabled:opacity-50">
            {loading ? '...' : 'REGISTER'}
          </button>
          <button onClick={() => { setMode('home'); setError('') }}
            className="text-gray-600 text-sm hover:text-gray-400">
            ← Back
          </button>
        </div>
      )}

      {/* 하단 링크 */}
      <div className="mt-16 flex gap-8 text-gray-600 text-sm">
        <Link href="/leaderboard" className="hover:text-gray-400">Leaderboard</Link>
        <Link href="/lobby" className="hover:text-gray-400">Battle</Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: 수동 확인**

```bash
npm run dev
```
`http://localhost:3000` → 게스트 플레이 → `/play` 이동 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/auth.ts src/app/layout.tsx src/app/page.tsx
git commit -m "feat: add auth helpers, home page with guest/login/register flows"
```

---

## Phase 3 — 멀티플레이어

### Task 11: Realtime 헬퍼 + OpponentMini 컴포넌트

**Files:**
- Create: `src/lib/realtime.ts`
- Create: `src/components/OpponentMini.tsx`

- [ ] **Step 1: Realtime 헬퍼 작성**

`src/lib/realtime.ts`:
```ts
import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { BroadcastGameState } from '@/game/types'

export type PresenceUser = {
  userId: string
  nickname: string
  joinedAt: number
}

export type MatchFoundPayload = {
  roomId: string
}

// 랜덤 매칭 채널 생성
export function createWaitingRoomChannel(
  userId: string,
  nickname: string,
  onMatchFound: (roomId: string) => void,
): RealtimeChannel {
  const supabase = createClient()
  const channel = supabase.channel('waiting_room', {
    config: { presence: { key: userId } },
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>()
      const users = Object.values(state).flat()
      if (users.length < 2) return

      // 가장 먼저 들어온 유저(joinedAt 가장 작은)가 방 생성
      const sorted = [...users].sort((a, b) => a.joinedAt - b.joinedAt)
      if (sorted[0].userId !== userId) return // 내가 방장이 아님

      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
      channel.send({
        type: 'broadcast',
        event: 'match_found',
        payload: { roomId } satisfies MatchFoundPayload,
      })
    })
    .on<MatchFoundPayload>('broadcast', { event: 'match_found' }, ({ payload }) => {
      onMatchFound(payload.roomId)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId, nickname, joinedAt: Date.now() } satisfies PresenceUser)
      }
    })

  return channel
}

// 배틀 채널 생성
export function createBattleChannel(
  roomId: string,
  userId: string,
  nickname: string,
  onOpponentJoined: (opponentNickname: string) => void,
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
      if (users.length > 0) onOpponentJoined(users[0].nickname)
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
        await channel.track({ userId, nickname, joinedAt: Date.now() } satisfies PresenceUser)
      }
    })

  return channel
}

export function sendGameState(channel: RealtimeChannel, state: BroadcastGameState) {
  channel.send({ type: 'broadcast', event: 'game_state', payload: state })
}

export function sendGameEvent(channel: RealtimeChannel, event: 'ready' | 'start' | 'over') {
  channel.send({ type: 'broadcast', event: 'game_event', payload: { event } })
}
```

- [ ] **Step 2: OpponentMini 컴포넌트 작성**

`src/components/OpponentMini.tsx`:
```tsx
'use client'
import TetrisBoard from './TetrisBoard'
import { BroadcastGameState } from '@/game/types'

type Props = {
  state: BroadcastGameState | null
  nickname: string
  isConnected: boolean
}

export default function OpponentMini({ state, nickname, isConnected }: Props) {
  const emptyBoard = Array.from({ length: 20 }, () => Array(10).fill(0))

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-500'}`}
          style={isConnected ? { boxShadow: '0 0 6px #4ade80' } : {}}
        />
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
      {!isConnected && (
        <p className="text-gray-600 text-xs">Waiting...</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/realtime.ts src/components/OpponentMini.tsx
git commit -m "feat: add Realtime helpers and OpponentMini component"
```

---

### Task 12: useBattle 훅 + BattleGame + /battle/[roomId]

**Files:**
- Create: `src/hooks/useBattle.ts`
- Create: `src/components/BattleGame.tsx`
- Create: `src/app/battle/[roomId]/page.tsx`

- [ ] **Step 1: useBattle 훅 작성**

`src/hooks/useBattle.ts`:
```ts
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { BroadcastGameState, GameState } from '@/game/types'
import { useGame } from './useGame'
import { createBattleChannel, sendGameState, sendGameEvent } from '@/lib/realtime'
import { createClient } from '@/lib/supabase/client'

const BATTLE_DURATION_MS = 2 * 60 * 1000 // 2분
const SYNC_INTERVAL_MS = 100

type BattlePhase = 'waiting' | 'countdown' | 'playing' | 'over'

type BattleResult = {
  myScore: number
  opponentScore: number
  isWin: boolean | null // null = 무승부
}

export function useBattle(roomId: string) {
  const { state: gameState, actions } = useGame()
  const gameStateRef = useRef(gameState)
  gameStateRef.current = gameState

  const [phase, setPhase] = useState<BattlePhase>('waiting')
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft] = useState(BATTLE_DURATION_MS)
  const [opponentNickname, setOpponentNickname] = useState('')
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [opponentState, setOpponentState] = useState<BroadcastGameState | null>(null)
  const [result, setResult] = useState<BattleResult | null>(null)
  const [myNickname, setMyNickname] = useState('')
  const [userId, setUserId] = useState('')

  const channelRef = useRef<RealtimeChannel | null>(null)
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const disconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef<number>(0)
  const opponentFinalScoreRef = useRef<number | null>(null)

  // 내 프로필 로드
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles').select('nickname').eq('id', user.id).single()
        .then(({ data }) => { if (data) setMyNickname(data.nickname) })
    })
  }, [])

  const endBattle = useCallback((myFinalScore: number, opponentFinalScore: number) => {
    setPhase('over')
    const isWin =
      myFinalScore > opponentFinalScore ? true
      : myFinalScore < opponentFinalScore ? false
      : null
    setResult({ myScore: myFinalScore, opponentScore: opponentFinalScore, isWin })

    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const startCountdown = useCallback(() => {
    setPhase('countdown')
    let count = 3
    setCountdown(count)
    const interval = setInterval(() => {
      count--
      setCountdown(count)
      if (count <= 0) {
        clearInterval(interval)
        setPhase('playing')
        actions.start()
        startTimeRef.current = Date.now()

        // 게임 상태 sync
        syncIntervalRef.current = setInterval(() => {
          const s = gameStateRef.current
          sendGameState(channelRef.current!, {
            board: s.board, score: s.score, lines: s.lines, level: s.level,
          })
        }, SYNC_INTERVAL_MS)

        // 2분 타이머
        timerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current
          const left = Math.max(0, BATTLE_DURATION_MS - elapsed)
          setTimeLeft(left)
          if (left <= 0) {
            const s = gameStateRef.current
            sendGameEvent(channelRef.current!, 'over')
            endBattle(s.score, opponentFinalScoreRef.current ?? 0)
          }
        }, 200)
      }
    }, 1000)
  }, [actions, endBattle])

  // 채널 연결
  useEffect(() => {
    if (!userId || !myNickname) return

    const channel = createBattleChannel(
      roomId,
      userId,
      myNickname,
      (nick) => {
        setOpponentNickname(nick)
        setOpponentConnected(true)
        if (disconnectTimeoutRef.current) clearTimeout(disconnectTimeoutRef.current)
        // 두 명 모두 입장 → 카운트다운 시작
        startCountdown()
      },
      () => {
        setOpponentConnected(false)
        // 30초 대기 후 자동 승리
        disconnectTimeoutRef.current = setTimeout(() => {
          const s = gameStateRef.current
          endBattle(s.score, -1)
        }, 30000)
      },
      (state) => {
        opponentFinalScoreRef.current = state.score
        setOpponentState(state)
      },
      (event) => {
        if (event === 'over') {
          const s = gameStateRef.current
          endBattle(s.score, opponentFinalScoreRef.current ?? 0)
        }
      },
    )

    channelRef.current = channel
    return () => {
      channel.unsubscribe()
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (disconnectTimeoutRef.current) clearTimeout(disconnectTimeoutRef.current)
    }
  }, [userId, myNickname, roomId, startCountdown, endBattle])

  // 게임오버 감지 (화면 꽉 참)
  useEffect(() => {
    if (gameState.status === 'over' && phase === 'playing') {
      sendGameEvent(channelRef.current!, 'over')
      endBattle(gameState.score, opponentFinalScoreRef.current ?? 0)
    }
  }, [gameState.status, phase, gameState.score, endBattle])

  return {
    gameState,
    actions,
    phase,
    countdown,
    timeLeft,
    myNickname,
    opponentNickname,
    opponentConnected,
    opponentState,
    result,
  }
}
```

- [ ] **Step 2: BattleGame 컴포넌트 작성**

`src/components/BattleGame.tsx`:
```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBattle } from '@/hooks/useBattle'
import { useKeyboard } from '@/hooks/useKeyboard'
import TetrisBoard from './TetrisBoard'
import HoldPiece from './HoldPiece'
import NextPieces from './NextPieces'
import OpponentMini from './OpponentMini'
import { createClient } from '@/lib/supabase/client'

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
    myNickname, opponentNickname, opponentConnected,
    opponentState, result,
  } = useBattle(roomId)

  useKeyboard(actions, phase === 'playing')

  // 결과 저장 (로그인 유저만)
  useEffect(() => {
    if (!result) return
    const saveResult = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('is_guest').eq('id', user.id).single()
      if (profile?.is_guest) return

      await supabase.from('game_results').insert({
        room_id: roomId,
        player_id: user.id,
        my_score: result.myScore,
        opponent_score: result.opponentScore,
        is_win: result.isWin ?? false,
      })
    }
    saveResult()
  }, [result, roomId])

  return (
    <div className="flex items-start gap-6 justify-center">
      {/* 왼쪽 패널 */}
      <div className="flex flex-col gap-4 w-24">
        <HoldPiece piece={gameState.holdPiece} />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Score</p>
          <p className="text-cyan-400 font-bold text-xl tabular-nums"
            style={{ textShadow: '0 0 8px #00f5ff' }}>
            {gameState.score.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Time</p>
          <p className={`font-bold text-lg ${timeLeft < 30000 ? 'text-red-400' : 'text-yellow-400'}`}>
            {formatTime(timeLeft)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Level</p>
          <p className="text-purple-400 font-bold">{gameState.level}</p>
        </div>
      </div>

      {/* 내 보드 */}
      <div className="relative">
        <TetrisBoard
          board={gameState.board}
          currentPiece={gameState.currentPiece}
          ghostY={gameState.ghostY}
          flashRows={gameState.flashRows}
        />

        {/* 카운트다운 오버레이 */}
        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-8xl font-bold text-cyan-400"
              style={{ textShadow: '0 0 30px #00f5ff' }}>
              {countdown}
            </span>
          </div>
        )}

        {/* 대기 오버레이 */}
        {phase === 'waiting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
            <p className="text-cyan-400 tracking-widest">Waiting for opponent...</p>
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 결과 오버레이 */}
        {phase === 'over' && result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-4">
            <p className={`text-3xl font-bold ${
              result.isWin === true ? 'text-cyan-400' :
              result.isWin === false ? 'text-red-400' : 'text-yellow-400'
            }`} style={{ textShadow: result.isWin === true ? '0 0 15px #00f5ff' : result.isWin === false ? '0 0 15px #ff3333' : '0 0 15px #ffe600' }}>
              {result.isWin === true ? 'WIN' : result.isWin === false ? 'LOSE' : 'DRAW'}
            </p>
            <p className="text-gray-300 text-sm">My: {result.myScore.toLocaleString()}</p>
            <p className="text-gray-300 text-sm">Opponent: {result.opponentScore.toLocaleString()}</p>
            <button onClick={() => router.push('/lobby')}
              className="mt-2 px-6 py-2 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition text-sm">
              Back to Lobby
            </button>
          </div>
        )}
      </div>

      {/* 오른쪽 패널 */}
      <div className="flex flex-col gap-4">
        <NextPieces pieces={gameState.nextPieces} />
        <div className="mt-4">
          <OpponentMini
            state={opponentState}
            nickname={opponentNickname || 'Opponent'}
            isConnected={opponentConnected}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: /battle/[roomId] 페이지 작성**

`src/app/battle/[roomId]/page.tsx`:
```tsx
import BattleGame from '@/components/BattleGame'

export default async function BattlePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-8">
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-purple-400 font-bold text-xl tracking-widest"
          style={{ textShadow: '0 0 10px #ff00ff' }}>
          BATTLE — {roomId}
        </h1>
      </div>
      <BattleGame roomId={roomId} />
      <p className="mt-6 text-gray-600 text-xs text-center">
        ← → Move &nbsp;|&nbsp; ↑/X Rotate &nbsp;|&nbsp; Z Counter-rotate &nbsp;|&nbsp; Space Hard Drop &nbsp;|&nbsp; C Hold
      </p>
    </main>
  )
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/useBattle.ts src/components/BattleGame.tsx src/app/battle/
git commit -m "feat: add useBattle hook, BattleGame component, /battle/[roomId] page"
```

---

### Task 13: 로비 페이지 + 매칭 UI

**Files:**
- Create: `src/components/MatchmakingLobby.tsx`
- Create: `src/app/lobby/page.tsx`

- [ ] **Step 1: MatchmakingLobby 컴포넌트 작성**

`src/components/MatchmakingLobby.tsx`:
```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createWaitingRoomChannel } from '@/lib/realtime'
import { createClient } from '@/lib/supabase/client'

type LobbyMode = 'select' | 'matching' | 'create_room' | 'join_room'

export default function MatchmakingLobby() {
  const router = useRouter()
  const [mode, setMode] = useState<LobbyMode>('select')
  const [roomCode, setRoomCode] = useState('')
  const [createdRoomId, setCreatedRoomId] = useState('')
  const [waitTime, setWaitTime] = useState(0)
  const [userId, setUserId] = useState('')
  const [nickname, setNickname] = useState('')
  const channelRef = useRef<RealtimeChannel | null>(null)
  const waitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      setUserId(user.id)
      supabase.from('profiles').select('nickname').eq('id', user.id).single()
        .then(({ data }) => { if (data) setNickname(data.nickname) })
    })
  }, [router])

  const startRandomMatching = () => {
    if (!userId || !nickname) return
    setMode('matching')
    setWaitTime(0)

    waitTimerRef.current = setInterval(() => {
      setWaitTime(t => {
        if (t >= 60) {
          cancelMatching()
          return t
        }
        return t + 1
      })
    }, 1000)

    const channel = createWaitingRoomChannel(userId, nickname, (roomId) => {
      router.push(`/battle/${roomId}`)
    })
    channelRef.current = channel
  }

  const cancelMatching = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    if (waitTimerRef.current) clearInterval(waitTimerRef.current)
    setMode('select')
    setWaitTime(0)
  }

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    setCreatedRoomId(roomId)
    setMode('create_room')
    // 방 생성 후 바로 /battle/{roomId}로 이동 (상대 대기)
    router.push(`/battle/${roomId}`)
  }

  const joinRoom = () => {
    if (!roomCode.trim()) return
    router.push(`/battle/${roomCode.trim().toUpperCase()}`)
  }

  return (
    <div className="flex flex-col items-center gap-8 w-80">
      {mode === 'select' && (
        <>
          <div className="w-full flex flex-col gap-3">
            <button onClick={startRandomMatching}
              className="py-4 border border-cyan-500 text-cyan-400 font-bold tracking-widest hover:bg-cyan-500/20 transition"
              style={{ boxShadow: '0 0 10px rgba(0,245,255,0.1)' }}>
              RANDOM MATCH
            </button>
            <button onClick={createRoom}
              className="py-4 border border-purple-500 text-purple-400 font-bold tracking-widest hover:bg-purple-500/20 transition">
              CREATE ROOM
            </button>
            <div className="flex gap-2">
              <input
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
                className="flex-1 px-4 py-3 bg-transparent border border-gray-600 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400 tracking-widest text-center"
                onKeyDown={e => e.key === 'Enter' && joinRoom()}
              />
              <button onClick={joinRoom}
                className="px-4 py-3 border border-gray-600 text-gray-400 hover:bg-gray-600/20 transition">
                JOIN
              </button>
            </div>
          </div>
        </>
      )}

      {mode === 'matching' && (
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-cyan-400 tracking-widest">Searching for opponent...</p>
          <p className="text-gray-500 text-sm">{waitTime}s / 60s</p>
          {waitTime >= 60 && (
            <p className="text-yellow-400 text-sm">No opponent found.</p>
          )}
          <button onClick={cancelMatching}
            className="px-6 py-2 border border-gray-600 text-gray-400 hover:bg-gray-600/20 transition text-sm">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: /lobby 페이지 작성**

`src/app/lobby/page.tsx`:
```tsx
import Link from 'next/link'
import MatchmakingLobby from '@/components/MatchmakingLobby'

export default function LobbyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
        <h1 className="text-purple-400 font-bold text-2xl tracking-widest"
          style={{ textShadow: '0 0 10px #ff00ff' }}>
          BATTLE LOBBY
        </h1>
      </div>
      <MatchmakingLobby />
    </main>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/MatchmakingLobby.tsx src/app/lobby/page.tsx
git commit -m "feat: add MatchmakingLobby component and /lobby page"
```

---

## Phase 4 — 마무리

### Task 14: 리더보드 + 프로필 페이지

**Files:**
- Create: `src/app/leaderboard/page.tsx`
- Create: `src/app/profile/page.tsx`

- [ ] **Step 1: 리더보드 페이지 작성**

`src/app/leaderboard/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type LeaderboardRow = {
  player_id: string
  nickname: string
  best_score: number
  total_wins: number
  total_games: number
  win_rate: number
}

export const revalidate = 60 // 1분 캐시

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('leaderboard_view')
    .select('*')
    .order('best_score', { ascending: false })
    .limit(50)

  const rows: LeaderboardRow[] = data ?? []

  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
        <h1 className="text-yellow-400 font-bold text-2xl tracking-widest"
          style={{ textShadow: '0 0 10px #ffe600' }}>
          LEADERBOARD
        </h1>
      </div>

      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-5 text-xs text-gray-500 uppercase tracking-widest px-4 pb-2 border-b border-gray-800">
          <span>#</span>
          <span className="col-span-2">Player</span>
          <span className="text-right">Best Score</span>
          <span className="text-right">Win Rate</span>
        </div>
        {rows.map((row, i) => (
          <div key={row.player_id}
            className="grid grid-cols-5 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/20 transition items-center">
            <span className={`font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
              {i + 1}
            </span>
            <span className="col-span-2 text-white">{row.nickname}</span>
            <span className="text-right text-cyan-400 tabular-nums font-bold">
              {Number(row.best_score).toLocaleString()}
            </span>
            <span className="text-right text-gray-400 text-sm">
              {row.win_rate}% <span className="text-gray-600">({row.total_wins}W/{row.total_games}G)</span>
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-center text-gray-600 py-12">No records yet.</p>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: 프로필 페이지 작성**

`src/app/profile/page.tsx`:
```tsx
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
  const bestScore = results ? Math.max(0, ...results.map(r => r.my_score)) : 0
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

      {/* 통계 카드 */}
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

      {/* 최근 게임 */}
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
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/leaderboard/ src/app/profile/
git commit -m "feat: add leaderboard and profile pages"
```

---

### Task 15: 네비게이션 업데이트 + /play 페이지 로그인 연동

**Files:**
- Modify: `src/app/play/page.tsx`

- [ ] **Step 1: /play 페이지에 네비게이션 추가**

`src/app/play/page.tsx` 를 아래로 교체:
```tsx
import SoloGame from '@/components/SoloGame'
import Link from 'next/link'

export default function PlayPage() {
  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-8">
      <nav className="mb-6 flex items-center gap-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Home</Link>
        <Link href="/lobby" className="text-purple-400 hover:text-purple-300 text-sm tracking-wider">
          Battle
        </Link>
        <Link href="/leaderboard" className="text-yellow-500 hover:text-yellow-300 text-sm tracking-wider">
          Leaderboard
        </Link>
        <Link href="/profile" className="text-gray-400 hover:text-gray-300 text-sm tracking-wider">
          Profile
        </Link>
      </nav>
      <h1 className="text-cyan-400 font-bold text-2xl tracking-widest mb-6"
        style={{ textShadow: '0 0 10px #00f5ff' }}>
        SOLO
      </h1>
      <SoloGame />
      <p className="mt-6 text-gray-600 text-xs text-center">
        ← → Move &nbsp;|&nbsp; ↑/X Rotate &nbsp;|&nbsp; Z Counter-rotate &nbsp;|&nbsp; Space Hard Drop &nbsp;|&nbsp; C Hold
      </p>
    </main>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/play/page.tsx
git commit -m "feat: add navigation to play page"
```

---

### Task 16: Vercel 배포

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: vercel.json 작성**

`vercel.json`:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```
Expected: 빌드 성공, 에러 없음

- [ ] **Step 3: Vercel 배포**

```bash
npx vercel --prod
```

또는 GitHub 연동:
1. GitHub에 레포 push
2. vercel.com에서 Import Project
3. Environment Variables에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 추가
4. Deploy

- [ ] **Step 4: Supabase에 도메인 허용 추가**

Supabase 대시보드 → Authentication → URL Configuration:
- Site URL: `https://your-domain.vercel.app`
- Redirect URLs: `https://your-domain.vercel.app/**`

- [ ] **Step 5: 최종 커밋**

```bash
git add vercel.json
git commit -m "feat: add vercel deployment config"
git push origin main
```

---

## 스펙 커버리지 체크

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| 일반전 (솔로 테트리스) | Task 4-8 |
| 경쟁전 (1vs1, 2분 점수 경쟁) | Task 11-12 |
| 랜덤 매칭 | Task 11, 13 |
| 방 코드 초대 | Task 13 |
| 게스트 플레이 (Anonymous Auth) | Task 9-10 |
| 로그인 (이메일+비밀번호) | Task 9-10 |
| 글로벌 리더보드 | Task 14 |
| 개인 전적 통계 | Task 14 |
| Hold, Next×3, Ghost, Hard Drop | Task 3-6, 8 |
| 속도 증가 (레벨업) | Task 5 |
| 네온 사이버펑크 UI | Task 7-8, 10 |
| 상대 연결 끊김 30초 자동 승리 | Task 12 |
| 동점 처리 | Task 12 |
| 매칭 대기 60초 취소 | Task 13 |
| Realtime 재연결 3회 | Supabase 클라이언트 기본 동작 |
| Vercel 배포 | Task 16 |
