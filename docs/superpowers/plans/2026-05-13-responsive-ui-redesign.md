# 반응형 UI 리디자인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전체 페이지(`/menu`, `/play`, `/lobby`, `/battle/[roomId]`, `/leaderboard`, `/profile`)에 좌측 사이드바 shell 을 도입하고, 게임 보드를 뷰포트 높이에 따라 3단계(24/32/40px)로 스케일링한다.

**Architecture:** 새 `AppShell` 컴포넌트가 사이드바 + 콘텐츠 영역을 제공한다. `useViewportTier()` 훅이 뷰포트 높이로부터 `'sm' | 'md' | 'lg'` 단계를 결정하고, 게임 캔버스 컴포넌트들은 이 tier 를 prop 으로 받아 셀 크기와 캔버스 사이즈를 조정한다. 사용자 프로필(닉네임, 랭크, 베스트 스코어)은 shell 레벨 context 에서 1회만 fetch 한다.

**Tech Stack:** Next.js 16.2 (App Router), React 19, TypeScript, Tailwind v4, Supabase, Jest + jest-environment-jsdom + @testing-library/react

**중요 — Next.js 16:** AGENTS.md 가 명시하듯 이 프로젝트의 Next.js 는 일반적으로 알려진 버전과 차이가 있다. App Router API (특히 `next/link`, `redirect`, server vs client component 구분) 를 새로 다루는 단계에서는 `node_modules/next/dist/docs/` 에서 관련 문서를 먼저 확인할 것.

**스펙 참조:** `docs/superpowers/specs/2026-05-13-responsive-ui-redesign-design.md`

---

## File Structure

**신규 파일:**
- `src/hooks/useViewportTier.ts` — `'sm' | 'md' | 'lg'` 반환 훅
- `src/hooks/useViewportTier.test.ts` — 훅 테스트
- `src/lib/tierSizes.ts` — tier → 셀/캔버스 크기 매핑 (순수 함수)
- `src/lib/tierSizes.test.ts` — 매핑 테스트
- `src/contexts/UserProfileContext.tsx` — 닉네임/랭크/베스트 1회 fetch + 공유
- `src/components/UserMiniProfile.tsx` — 사이드바 상단 미니 프로필
- `src/components/Sidebar.tsx` — 로고 + 미니 프로필 + nav 링크
- `src/components/AppShell.tsx` — `<Sidebar /> + <main>{children}</main>` 레이아웃 wrapper

**수정 파일:**
- `src/lib/i18n.ts` — sidebar nav / opponent / battle 라벨 키 추가
- `src/components/TetrisBoard.tsx` — `tier?: Tier` prop 추가
- `src/components/HoldPiece.tsx` — `tier?: Tier` prop 추가
- `src/components/NextPieces.tsx` — `tier?: Tier` prop 추가
- `src/components/OpponentMini.tsx` — `tier?: Tier` prop 추가 (내부 `<TetrisBoard mini>` 로 전달)
- `src/components/SoloGame.tsx` — 통계를 좌측 패널로 통합, 외부 chrome 제거
- `src/components/BattleGame.tsx` — 동일 구조 + 상대방 rail 을 우측 분리
- `src/app/play/page.tsx` — `<AppShell>` 로 감싸고 인라인 nav 제거
- `src/app/battle/[roomId]/page.tsx` — `<AppShell>` wrap
- `src/app/menu/page.tsx` — `<AppShell>` wrap, 자체 타이틀 유지
- `src/app/lobby/page.tsx` — `<AppShell>` wrap, `← Back` 제거
- `src/app/leaderboard/page.tsx` — `<AppShell>` wrap, `← Back` 제거
- `src/app/profile/page.tsx` — `<AppShell>` wrap, `← Back` 제거
- `src/app/layout.tsx` — 루트에 `<UserProfileProvider>` 추가

---

## Task 1: i18n 키 추가

**Files:**
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: i18n 파일에 sidebar / battle 라벨 키 추가**

`src/lib/i18n.ts` 의 `en` 객체 안 (`// Game` 섹션 바로 아래) 에 추가:

```typescript
    // Sidebar
    navMenu: 'Menu',
    navPlay: 'Play',
    navBattle: 'Battle',
    navBoard: 'Board',
    navProfile: 'Profile',
    rank: 'Rank',
    // Battle
    opponent: 'Opponent',
```

`ko` 객체 동일 위치에 추가:

```typescript
    // Sidebar
    navMenu: '메뉴',
    navPlay: '플레이',
    navBattle: '배틀',
    navBoard: '리더보드',
    navProfile: '프로필',
    rank: '랭크',
    // Battle
    opponent: '상대',
```

(기존 `// Battle` 섹션의 `win/lose/draw/...` 라인은 그대로 유지. 새 키 `opponent` 를 그 섹션 마지막에 추가.)

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat(i18n): add sidebar nav and opponent labels"
```

---

## Task 2: `tierSizes` 순수 함수 + 테스트

**Files:**
- Create: `src/lib/tierSizes.ts`
- Test: `src/lib/tierSizes.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/tierSizes.test.ts`:

```typescript
import { getCellSize, getPanelWidth, getCanvasSize, type Tier } from './tierSizes'

describe('getCellSize', () => {
  it('returns 24 for sm tier', () => {
    expect(getCellSize('sm')).toEqual({ board: 24, hold: 16, next: 12 })
  })
  it('returns 32 for md tier', () => {
    expect(getCellSize('md')).toEqual({ board: 32, hold: 20, next: 16 })
  })
  it('returns 40 for lg tier', () => {
    expect(getCellSize('lg')).toEqual({ board: 40, hold: 26, next: 20 })
  })
})

describe('getPanelWidth', () => {
  it('returns 74 / 90 / 112 by tier', () => {
    expect(getPanelWidth('sm')).toBe(74)
    expect(getPanelWidth('md')).toBe(90)
    expect(getPanelWidth('lg')).toBe(112)
  })
})

describe('getCanvasSize', () => {
  it('returns board 10x20 cells, hold 4x4 cells, next 4x10 cells', () => {
    const sizes = getCanvasSize('md')
    expect(sizes.board).toEqual({ width: 320, height: 640 })
    expect(sizes.hold).toEqual({ width: 80, height: 80 })
    expect(sizes.next).toEqual({ width: 64, height: 160 })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest src/lib/tierSizes.test.ts`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: `tierSizes.ts` 구현**

`src/lib/tierSizes.ts`:

```typescript
export type Tier = 'sm' | 'md' | 'lg'

export function getCellSize(tier: Tier): { board: number; hold: number; next: number } {
  switch (tier) {
    case 'sm': return { board: 24, hold: 16, next: 12 }
    case 'md': return { board: 32, hold: 20, next: 16 }
    case 'lg': return { board: 40, hold: 26, next: 20 }
  }
}

export function getPanelWidth(tier: Tier): number {
  switch (tier) {
    case 'sm': return 74
    case 'md': return 90
    case 'lg': return 112
  }
}

export function getCanvasSize(tier: Tier) {
  const cell = getCellSize(tier)
  return {
    board: { width: cell.board * 10, height: cell.board * 20 },
    hold:  { width: cell.hold * 4,   height: cell.hold * 4 },
    next:  { width: cell.next * 4,   height: cell.next * 10 },
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest src/lib/tierSizes.test.ts`
Expected: PASS, 3 suites 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/tierSizes.ts src/lib/tierSizes.test.ts
git commit -m "feat: add tier→size mapping for responsive board"
```

---

## Task 3: `useViewportTier` 훅 + 테스트

**Files:**
- Create: `src/hooks/useViewportTier.ts`
- Test: `src/hooks/useViewportTier.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/hooks/useViewportTier.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useViewportTier } from './useViewportTier'

function setHeight(h: number) {
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: h })
  window.dispatchEvent(new Event('resize'))
}

describe('useViewportTier', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it('returns sm when height ≤ 900', () => {
    setHeight(800)
    const { result } = renderHook(() => useViewportTier())
    expect(result.current).toBe('sm')
  })

  it('returns md when 901 ≤ height ≤ 1200', () => {
    setHeight(1080)
    const { result } = renderHook(() => useViewportTier())
    expect(result.current).toBe('md')
  })

  it('returns lg when height ≥ 1201', () => {
    setHeight(1440)
    const { result } = renderHook(() => useViewportTier())
    expect(result.current).toBe('lg')
  })

  it('updates tier on debounced resize', () => {
    setHeight(800)
    const { result } = renderHook(() => useViewportTier())
    expect(result.current).toBe('sm')

    act(() => { setHeight(1080) })
    // before debounce timer fires, still 'sm'
    expect(result.current).toBe('sm')
    act(() => { jest.advanceTimersByTime(120) })
    expect(result.current).toBe('md')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest src/hooks/useViewportTier.test.ts`
Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 훅 구현**

`src/hooks/useViewportTier.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import type { Tier } from '@/lib/tierSizes'

function heightToTier(h: number): Tier {
  if (h <= 900) return 'sm'
  if (h <= 1200) return 'md'
  return 'lg'
}

export function useViewportTier(): Tier {
  const [tier, setTier] = useState<Tier>(() =>
    typeof window === 'undefined' ? 'md' : heightToTier(window.innerHeight)
  )

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null
    const onResize = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => setTier(heightToTier(window.innerHeight)), 100)
    }
    window.addEventListener('resize', onResize)
    setTier(heightToTier(window.innerHeight))
    return () => {
      window.removeEventListener('resize', onResize)
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  return tier
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest src/hooks/useViewportTier.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useViewportTier.ts src/hooks/useViewportTier.test.ts
git commit -m "feat: add useViewportTier hook with debounced resize"
```

---

## Task 4: `TetrisBoard` 에 tier prop 추가

**Files:**
- Modify: `src/components/TetrisBoard.tsx`

- [ ] **Step 1: 현재 파일 읽기**

Run: `cat src/components/TetrisBoard.tsx` (또는 Read tool)

기존 `CELL = 30`, `MINI_CELL = 12` 상수를 tier 기반으로 변경한다.

- [ ] **Step 2: `tier` prop + tier→cell 매핑 적용**

`src/components/TetrisBoard.tsx` 의 `Props` 와 시그니처 수정:

```typescript
import { getCellSize, type Tier } from '@/lib/tierSizes'

type Props = {
  board: number[][]
  currentPiece?: Piece
  ghostY?: number
  mini?: boolean
  flashRows?: number[]
  tier?: Tier  // default 'md' (mini 모드일 땐 사용 안 함)
}
```

함수 본문 상단의 `const cellSize = mini ? MINI_CELL : CELL` 라인을 다음으로 교체:

```typescript
const MINI_CELL = 12
const cellSize = mini ? MINI_CELL : getCellSize(tier ?? 'md').board
```

(상단에 있던 모듈 레벨 `const CELL = 30`, `const MINI_CELL = 12` 두 라인은 제거.)

함수 시그니처도 prop 추가:

```typescript
export default function TetrisBoard({
  board, currentPiece, ghostY, mini = false, flashRows = [], tier,
}: Props) {
```

`useEffect` 의 deps 배열에 `tier` 가 자동 포함되지 않으므로 (cellSize 가 deps 에 이미 있어 충분), 변경 불필요.

- [ ] **Step 3: 타입 체크 + 기존 사용처 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (tier 는 optional 이라 기존 호출처 영향 없음)

- [ ] **Step 4: 게임 엔진 테스트 회귀 없음 확인**

Run: `npx jest src/__tests__`
Expected: 모든 기존 테스트 통과

- [ ] **Step 5: Commit**

```bash
git add src/components/TetrisBoard.tsx
git commit -m "feat(board): accept tier prop for responsive cell size"
```

---

## Task 5: `HoldPiece` 에 tier prop 추가

**Files:**
- Modify: `src/components/HoldPiece.tsx`

- [ ] **Step 1: tier prop + 캔버스 사이즈 동적 계산**

`src/components/HoldPiece.tsx` 전체를 다음으로 교체 (기존 `const CELL = 20` 하드코딩 제거):

```typescript
'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'
import { useLanguage } from '@/contexts/LanguageContext'
import { getCellSize, getCanvasSize, type Tier } from '@/lib/tierSizes'

type Props = {
  piece: Piece | null
  tier?: Tier
}

export default function HoldPiece({ piece, tier = 'md' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { t } = useLanguage()
  const cell = getCellSize(tier).hold
  const { width, height } = getCanvasSize(tier).hold

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, width, height)
    if (!piece) return
    const color = PIECE_COLORS[PIECE_ID[piece.type]]
    const cells = getPieceCells(piece.type, 0, 0, 0)
    ctx.fillStyle = color
    ctx.shadowBlur = 6
    ctx.shadowColor = color
    // 중앙 정렬: 4×4 그리드 기준 piece 위치
    const offsetX = (width - cell * 4) / 2
    const offsetY = (height - cell * 4) / 2
    for (const { r, c } of cells) {
      ctx.fillRect(c * cell + 1 + offsetX, r * cell + 1 + offsetY, cell - 2, cell - 2)
    }
    ctx.shadowBlur = 0
  }, [piece, cell, width, height])

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t('hold')}</p>
      <canvas ref={canvasRef} width={width} height={height} className="border border-cyan-500/20" />
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/HoldPiece.tsx
git commit -m "feat(hold): accept tier prop with centered piece"
```

---

## Task 6: `NextPieces` 에 tier prop 추가

**Files:**
- Modify: `src/components/NextPieces.tsx`

- [ ] **Step 1: tier prop + 캔버스 사이즈 동적 계산**

`src/components/NextPieces.tsx` 전체 교체:

```typescript
'use client'
import { useEffect, useRef } from 'react'
import { Piece } from '@/game/types'
import { PIECE_COLORS, PIECE_ID, getPieceCells } from '@/game/pieces'
import { useLanguage } from '@/contexts/LanguageContext'
import { getCellSize, getCanvasSize, type Tier } from '@/lib/tierSizes'

type Props = {
  pieces: Piece[]
  tier?: Tier
}

export default function NextPieces({ pieces, tier = 'md' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { t } = useLanguage()
  const cell = getCellSize(tier).next
  const { width, height } = getCanvasSize(tier).next
  // 슬롯 높이 = 4 cells × cell + 약간의 간격 = 사실 height/3 와 같음
  const slotH = height / 3

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, width, height)
    pieces.slice(0, 3).forEach((piece, i) => {
      const color = PIECE_COLORS[PIECE_ID[piece.type]]
      ctx.fillStyle = color
      ctx.shadowBlur = 4
      ctx.shadowColor = color
      const cells = getPieceCells(piece.type, 0, 0, 0)
      const offsetX = (width - cell * 4) / 2
      const offsetY = (slotH - cell * 4) / 2
      for (const { r, c } of cells) {
        ctx.fillRect(
          c * cell + 1 + offsetX,
          r * cell + 1 + i * slotH + offsetY,
          cell - 2,
          cell - 2,
        )
      }
      ctx.shadowBlur = 0
    })
  }, [pieces, cell, width, height, slotH])

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t('next')}</p>
      <canvas ref={canvasRef} width={width} height={height} className="border border-cyan-500/20" />
    </div>
  )
}
```

(라벨 "Next" 가 하드코딩이었던 걸 `t('next')` 로 i18n 통과.)

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/NextPieces.tsx
git commit -m "feat(next): accept tier prop, i18n label"
```

---

## Task 7: `OpponentMini` 에 tier prop 패스스루

**Files:**
- Modify: `src/components/OpponentMini.tsx`

- [ ] **Step 1: tier prop 추가 (내부 TetrisBoard 는 mini 모드라 tier 무시되지만, 외부에서 props 일관성을 위해 받아둠)**

`src/components/OpponentMini.tsx` 의 `Props` 에 추가:

```typescript
import type { Tier } from '@/lib/tierSizes'

type Props = {
  state: BroadcastGameState | null
  nickname: string
  isConnected: boolean
  tier?: Tier
}
```

함수 시그니처:

```typescript
export default function OpponentMini({ state, nickname, isConnected, tier }: Props) {
```

(현재 내부 `<TetrisBoard board={...} mini />` 는 그대로. mini 모드는 `MINI_CELL = 12` 사용하므로 tier 무관. 향후 tier 별 mini cell 차별화가 필요해지면 여기서 분기.)

void 경고 방지를 위해 함수 본문 첫 줄에 `void tier` 추가:

```typescript
  void tier
  const emptyBoard = ...
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit && npx jest src/__tests__`
Expected: 에러/실패 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/OpponentMini.tsx
git commit -m "feat(opponent): accept tier prop for API consistency"
```

---

## Task 8: `UserProfileContext` 생성

**Files:**
- Create: `src/contexts/UserProfileContext.tsx`

- [ ] **Step 1: Context 생성 — 마운트 시 1회 Supabase 쿼리, 게스트 / 미로그인 시 null**

`src/contexts/UserProfileContext.tsx`:

```typescript
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserProfile = {
  id: string
  nickname: string
  isGuest: boolean
  bestScore: number
  rank: number | null  // null if no games played
}

type Ctx = {
  profile: UserProfile | null
  loading: boolean
}

const UserProfileContext = createContext<Ctx>({ profile: null, loading: true })

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

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
      if (!prof || cancelled) { setLoading(false); return }

      // Best score from leaderboard_view (already aggregated)
      const { data: row } = await supabase
        .from('leaderboard_view')
        .select('best_score')
        .eq('player_id', user.id)
        .maybeSingle()
      const bestScore = row?.best_score ?? 0

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
      })
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <UserProfileContext.Provider value={{ profile, loading }}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  return useContext(UserProfileContext)
}
```

- [ ] **Step 2: root layout 에 Provider 추가**

`src/app/layout.tsx` 수정 — `<KeybindingsProvider>` 안쪽에 `<UserProfileProvider>` 추가:

```tsx
import { UserProfileProvider } from '@/contexts/UserProfileContext'
// ...
<LanguageProvider>
  <KeybindingsProvider>
    <UserProfileProvider>
      <SettingsButton />
      {children}
    </UserProfileProvider>
  </KeybindingsProvider>
</LanguageProvider>
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add src/contexts/UserProfileContext.tsx src/app/layout.tsx
git commit -m "feat: add UserProfileContext for shared sidebar profile data"
```

---

## Task 9: `UserMiniProfile` 컴포넌트

**Files:**
- Create: `src/components/UserMiniProfile.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/components/UserMiniProfile.tsx`:

```typescript
'use client'
import { useUserProfile } from '@/contexts/UserProfileContext'
import { useLanguage } from '@/contexts/LanguageContext'

export default function UserMiniProfile() {
  const { profile } = useUserProfile()
  const { t } = useLanguage()

  if (!profile || profile.isGuest) return null

  return (
    <div className="border border-[#1a1a2e] rounded p-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full"
          style={{ background: 'linear-gradient(135deg, #c0a 0%, #f0f 100%)' }}
          aria-hidden
        />
        <span className="text-white text-xs truncate">{profile.nickname}</span>
      </div>
      {profile.rank !== null && (
        <p className="text-yellow-400 text-[10px] tracking-widest">
          ★ {t('rank')} #{profile.rank}
        </p>
      )}
      <p className="text-gray-500 text-[10px] tabular-nums">
        {t('bestScore')} {profile.bestScore.toLocaleString()}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/UserMiniProfile.tsx
git commit -m "feat: add UserMiniProfile sidebar component"
```

---

## Task 10: `Sidebar` 컴포넌트

**Files:**
- Create: `src/components/Sidebar.tsx`

- [ ] **Step 1: Sidebar 작성 — 로고 + 미니프로필 + nav 링크**

`src/components/Sidebar.tsx`:

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUserProfile } from '@/contexts/UserProfileContext'
import UserMiniProfile from './UserMiniProfile'
import type { TranslationKey } from '@/lib/i18n'

type NavItem = {
  href: string
  labelKey: TranslationKey
  icon: string
  guestDisabled?: boolean
}

const NAV: NavItem[] = [
  { href: '/menu', labelKey: 'navMenu', icon: '▢' },
  { href: '/play', labelKey: 'navPlay', icon: '▸' },
  { href: '/lobby', labelKey: 'navBattle', icon: '⚔' },
  { href: '/leaderboard', labelKey: 'navBoard', icon: '★' },
  { href: '/profile', labelKey: 'navProfile', icon: '◐', guestDisabled: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { profile } = useUserProfile()
  const isGuest = profile?.isGuest ?? false

  return (
    <aside className="w-[140px] shrink-0 bg-[#0a0a14] border-r border-[#1a1a2e] flex flex-col gap-3 p-3.5 h-screen sticky top-0">
      <Link
        href="/menu"
        className="text-cyan-400 font-bold text-base tracking-[2px]"
        style={{ textShadow: '0 0 8px #00f5ff' }}
      >
        TETRIS
      </Link>

      <UserMiniProfile />

      <nav className="flex flex-col gap-1.5 mt-2">
        {NAV.map(item => {
          const active = pathname === item.href ||
            (item.href === '/lobby' && pathname.startsWith('/battle/'))
          const disabled = item.guestDisabled && isGuest
          if (disabled) {
            return (
              <span
                key={item.href}
                className="text-gray-700 text-xs tracking-wider cursor-not-allowed select-none"
              >
                {item.icon} {t(item.labelKey)}
              </span>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs tracking-wider transition ${
                active
                  ? 'text-fuchsia-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              style={active ? { textShadow: '0 0 6px #f0f' } : {}}
            >
              {active ? '▸' : item.icon} {t(item.labelKey)}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Sidebar component with nav and active page highlight"
```

---

## Task 11: `AppShell` 컴포넌트

**Files:**
- Create: `src/components/AppShell.tsx`

- [ ] **Step 1: AppShell 작성**

`src/components/AppShell.tsx`:

```typescript
import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0a0a1a]">
      <Sidebar />
      <main className="flex-1 py-8 px-6 flex flex-col items-center">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat: add AppShell wrapping sidebar + content"
```

---

## Task 12: `SoloGame` 재구성 — 통계를 좌측 패널로 통합, 페이지 chrome 제거

**Files:**
- Modify: `src/components/SoloGame.tsx`

- [ ] **Step 1: 전체 교체**

`src/components/SoloGame.tsx`:

```typescript
'use client'
import { useEffect, useRef, useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useViewportTier } from '@/hooks/useViewportTier'
import TetrisBoard from './TetrisBoard'
import HoldPiece from './HoldPiece'
import NextPieces from './NextPieces'
import { useLanguage } from '@/contexts/LanguageContext'
import { getPanelWidth } from '@/lib/tierSizes'

const BEST_SCORE_KEY = 'tetris_best_score'

export default function SoloGame() {
  const { state, actions } = useGame()
  const { t } = useLanguage()
  const tier = useViewportTier()
  useKeyboard(actions, state.status === 'playing')

  const [bestScore, setBestScore] = useState(0)
  const [isNewBest, setIsNewBest] = useState(false)
  const prevStatus = useRef(state.status)

  useEffect(() => {
    const stored = parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10)
    setBestScore(isNaN(stored) ? 0 : stored)
  }, [])

  useEffect(() => {
    if (prevStatus.current === 'playing' && state.status === 'over') {
      const stored = parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10)
      const prev = isNaN(stored) ? 0 : stored
      if (state.score > prev) {
        localStorage.setItem(BEST_SCORE_KEY, String(state.score))
        setBestScore(state.score)
        setIsNewBest(true)
      } else {
        setIsNewBest(false)
      }
    }
    if (state.status === 'idle') setIsNewBest(false)
    prevStatus.current = state.status
  }, [state.status, state.score])

  const panelW = getPanelWidth(tier)

  return (
    <div className="flex items-start gap-3 justify-center">
      {/* 좌측 패널: HOLD + 통계 */}
      <div className="flex flex-col gap-3" style={{ width: panelW }}>
        <HoldPiece piece={state.holdPiece} tier={tier} />
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('score')}</p>
          <p
            className="text-cyan-400 font-bold text-lg tabular-nums"
            style={{ textShadow: '0 0 8px #00f5ff' }}
          >
            {state.score.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('bestScore')}</p>
          <p className="text-yellow-500 font-bold text-sm tabular-nums">
            {bestScore.toLocaleString()}
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

      {/* 보드 */}
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
            <p className="text-red-400 font-bold text-2xl" style={{ textShadow: '0 0 10px #ff3333' }}>
              {t('gameOver')}
            </p>
            {isNewBest && (
              <p className="text-yellow-400 font-bold text-sm" style={{ textShadow: '0 0 8px #ffd700' }}>
                {t('newBest')}
              </p>
            )}
            <p className="text-gray-300">{t('score')}: {state.score.toLocaleString()}</p>
            <button
              onClick={actions.reset}
              className="px-6 py-2 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition"
            >
              {t('retry')}
            </button>
          </div>
        )}
      </div>

      {/* 우측 패널: NEXT */}
      <div style={{ width: panelW }}>
        <NextPieces pieces={state.nextPieces} tier={tier} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/SoloGame.tsx
git commit -m "refactor(solo): unify stats into left panel, apply tier sizing"
```

---

## Task 13: `BattleGame` 재구성 — 상대방 rail 분리, tier 적용

**Files:**
- Modify: `src/components/BattleGame.tsx`

- [ ] **Step 1: 전체 교체 (게임 로직/useEffect 유지, 레이아웃만 재구성)**

`src/components/BattleGame.tsx` 의 `return (...)` JSX 블록을 다음으로 교체. 파일 상단 imports 에 `useViewportTier`, `useLanguage`, `getPanelWidth` 추가:

```typescript
import { useViewportTier } from '@/hooks/useViewportTier'
import { useLanguage } from '@/contexts/LanguageContext'
import { getPanelWidth } from '@/lib/tierSizes'
```

함수 본문 상단 (`useKeyboard` 호출 직후) 에 추가:

```typescript
  const tier = useViewportTier()
  const { t } = useLanguage()
  const panelW = getPanelWidth(tier)
```

`return (...)` 전체를 교체:

```tsx
  return (
    <div className="flex items-start gap-3 justify-center">
      {/* 좌측 패널 */}
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

      {/* 내 보드 */}
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
        {phase === 'over' && result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-4">
            <p
              className={`text-3xl font-bold ${
                result.isWin === true ? 'text-cyan-400' :
                result.isWin === false ? 'text-red-400' : 'text-yellow-400'
              }`}
              style={{
                textShadow: result.isWin === true ? '0 0 15px #00f5ff'
                  : result.isWin === false ? '0 0 15px #ff3333'
                  : '0 0 15px #ffe600',
              }}
            >
              {result.isWin === true ? t('win') : result.isWin === false ? t('lose') : t('draw')}
            </p>
            <p className="text-gray-300 text-sm">{t('score')}: {result.myScore.toLocaleString()}</p>
            <p className="text-gray-300 text-sm">{t('opponent')}: {result.opponentScore.toLocaleString()}</p>
            <button
              onClick={() => router.push('/lobby')}
              className="mt-2 px-6 py-2 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 transition text-sm"
            >
              {t('backToLobby')}
            </button>
          </div>
        )}
      </div>

      {/* NEXT */}
      <div style={{ width: panelW }}>
        <NextPieces pieces={gameState.nextPieces} tier={tier} />
      </div>

      {/* 디바이더 */}
      <div className="w-px self-stretch bg-[#1a1a2e]" />

      {/* 상대방 rail */}
      <div className="flex flex-col items-center" style={{ width: panelW + 16 }}>
        <p className="text-[10px] text-red-500 uppercase tracking-widest mb-2">{t('opponent')}</p>
        <OpponentMini
          state={opponentState}
          nickname={opponentNickname || t('opponent')}
          isConnected={opponentConnected}
          tier={tier}
        />
      </div>
    </div>
  )
```

- [ ] **Step 2: 타입 체크 + 게임 엔진 회귀**

Run: `npx tsc --noEmit && npx jest src/__tests__`
Expected: 에러/실패 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/BattleGame.tsx
git commit -m "refactor(battle): separate opponent rail, apply tier sizing, full i18n"
```

---

## Task 14: `/play` 페이지 — AppShell 적용 + 인라인 nav 제거

**Files:**
- Modify: `src/app/play/page.tsx`

- [ ] **Step 1: 전체 교체**

`src/app/play/page.tsx`:

```typescript
import AppShell from '@/components/AppShell'
import SoloGame from '@/components/SoloGame'

export default function PlayPage() {
  return (
    <AppShell>
      <SoloGame />
      <p className="mt-6 text-gray-600 text-xs text-center">
        ← → Move &nbsp;|&nbsp; ↑/X Rotate &nbsp;|&nbsp; Z Counter-rotate &nbsp;|&nbsp; Space Hard Drop &nbsp;|&nbsp; C Hold
      </p>
    </AppShell>
  )
}
```

- [ ] **Step 2: 타입 체크 + dev server 확인 (수동)**

Run: `npx tsc --noEmit`
Expected: 에러 없음

수동 확인: `npm run dev` 후 `/play` 접속 → 좌측 사이드바 + 보드 + 패널 보이는지, "← Menu / Battle / ..." 가로 nav 가 사라졌는지 확인.

- [ ] **Step 3: Commit**

```bash
git add src/app/play/page.tsx
git commit -m "refactor(play): wrap in AppShell, drop inline top nav"
```

---

## Task 15: `/battle/[roomId]` 페이지 — AppShell 적용

**Files:**
- Modify: `src/app/battle/[roomId]/page.tsx`

- [ ] **Step 1: 현재 파일 읽기**

Run: `cat src/app/battle/[roomId]/page.tsx` (또는 Read tool)

기존 페이지가 `BattleGame` 을 직접 렌더하는지, 또 페이지 chrome (`<main>`, nav 등) 이 있는지 확인.

- [ ] **Step 2: AppShell 로 wrap**

기존 `<main className="...">{...}</main>` 를 `<AppShell>{...}</AppShell>` 로 교체. `← Back` 류 링크가 있으면 제거.

예시 (구체적 구조는 현재 파일에 맞춰 조정):

```typescript
import AppShell from '@/components/AppShell'
import BattleGame from '@/components/BattleGame'

export default async function BattlePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  return (
    <AppShell>
      <BattleGame roomId={roomId} />
    </AppShell>
  )
}
```

(Next.js 16 의 dynamic route params 가 Promise 인 점 유의 — `node_modules/next/dist/docs/` 에서 확인.)

- [ ] **Step 3: 타입 체크 + 수동 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

수동: `/battle/[testroom]` 으로 진입 시 사이드바 + 게임 영역 보이는지 확인.

- [ ] **Step 4: Commit**

```bash
git add src/app/battle/[roomId]/page.tsx
git commit -m "refactor(battle-page): wrap in AppShell"
```

---

## Task 16: `/menu` 페이지 — AppShell 적용

**Files:**
- Modify: `src/app/menu/page.tsx`

- [ ] **Step 1: 외곽 `<main>` 을 `<AppShell>` 로 교체**

기존 `return (...)` 의 최상위:

```tsx
<main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center gap-10 px-4">
```

를:

```tsx
<AppShell>
  <div className="flex flex-col items-center justify-center gap-10 min-h-[calc(100vh-4rem)] w-full">
```

로 변경하고 닫는 태그도 `</div></AppShell>` 로 맞춤. 상단에 `import AppShell from '@/components/AppShell'` 추가.

(주의: 페이지 자체가 `useEffect` 로 미로그인 시 `/` 로 리다이렉트하는 로직은 그대로 유지.)

- [ ] **Step 2: 타입 체크 + 수동 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

수동: `/menu` 진입 시 사이드바 + 가운데 메뉴 카드 보이는지, 현재 페이지가 "Menu" 로 활성 표시되는지 확인.

- [ ] **Step 3: Commit**

```bash
git add src/app/menu/page.tsx
git commit -m "refactor(menu): wrap in AppShell"
```

---

## Task 17: `/lobby` 페이지 — AppShell 적용 + Back 링크 제거

**Files:**
- Modify: `src/app/lobby/page.tsx`

- [ ] **Step 1: 전체 교체**

`src/app/lobby/page.tsx`:

```typescript
import AppShell from '@/components/AppShell'
import MatchmakingLobby from '@/components/MatchmakingLobby'

export default function LobbyPage() {
  return (
    <AppShell>
      <h1
        className="text-purple-400 font-bold text-2xl tracking-widest mb-8"
        style={{ textShadow: '0 0 10px #ff00ff' }}
      >
        BATTLE LOBBY
      </h1>
      <MatchmakingLobby />
    </AppShell>
  )
}
```

(기존 `<Link href="/" className="...">← Back</Link>` 제거.)

- [ ] **Step 2: 타입 체크 + 수동 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

수동: `/lobby` 진입 시 사이드바 + `BATTLE LOBBY` 타이틀 + 매칭 컴포넌트 보이는지.

- [ ] **Step 3: Commit**

```bash
git add src/app/lobby/page.tsx
git commit -m "refactor(lobby): wrap in AppShell, drop back link"
```

---

## Task 18: `/leaderboard` 페이지 — AppShell 적용

**Files:**
- Modify: `src/app/leaderboard/page.tsx`

- [ ] **Step 1: 전체 교체**

`src/app/leaderboard/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'

type LeaderboardRow = {
  player_id: string
  nickname: string
  best_score: number
  total_wins: number
  total_games: number
  win_rate: number
}

export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('leaderboard_view')
    .select('*')
    .order('best_score', { ascending: false })
    .limit(50)

  const rows: LeaderboardRow[] = data ?? []

  return (
    <AppShell>
      <h1
        className="text-yellow-400 font-bold text-2xl tracking-widest mb-8"
        style={{ textShadow: '0 0 10px #ffe600' }}
      >
        LEADERBOARD
      </h1>
      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-5 text-xs text-gray-500 uppercase tracking-widest px-4 pb-2 border-b border-gray-800">
          <span>#</span>
          <span className="col-span-2">Player</span>
          <span className="text-right">Best Score</span>
          <span className="text-right">Win Rate</span>
        </div>
        {rows.map((row, i) => (
          <div
            key={row.player_id}
            className="grid grid-cols-5 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/20 transition items-center"
          >
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
    </AppShell>
  )
}
```

- [ ] **Step 2: 타입 체크 + 수동 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

수동: `/leaderboard` 진입 시 사이드바 + 리더보드 테이블 보이는지.

- [ ] **Step 3: Commit**

```bash
git add src/app/leaderboard/page.tsx
git commit -m "refactor(leaderboard): wrap in AppShell, drop back link"
```

---

## Task 19: `/profile` 페이지 — AppShell 적용

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: 전체 교체**

`src/app/profile/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'

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
  const bestScore = results && results.length > 0 ? Math.max(...results.map(r => r.my_score)) : 0
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

  return (
    <AppShell>
      <h1
        className="text-purple-400 font-bold text-2xl tracking-widest mb-8"
        style={{ textShadow: '0 0 10px #ff00ff' }}
      >
        {profile.nickname}
      </h1>

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

      <div className="w-full max-w-2xl">
        <h2 className="text-gray-400 text-sm uppercase tracking-widest mb-3">Recent Games</h2>
        <div className="flex flex-col gap-1">
          {results?.map(r => (
            <div
              key={r.id}
              className="flex items-center justify-between px-4 py-2 border border-gray-800/50"
            >
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
    </AppShell>
  )
}
```

- [ ] **Step 2: 타입 체크 + 수동 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음

수동: `/profile` 진입 시 사이드바 + 본인 통계가 보이는지.

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "refactor(profile): wrap in AppShell, drop back link"
```

---

## Task 20: 빌드 + 테스트 + 3단계 수동 검증

**Files:** N/A (검증만)

- [ ] **Step 1: 전체 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 2: 전체 jest 테스트**

Run: `npm test`
Expected: 모든 테스트 통과 (특히 새로 추가한 `tierSizes` / `useViewportTier`, 기존 `bag` / `engine`)

- [ ] **Step 3: 프로덕션 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공, lint/type 에러 없음

- [ ] **Step 4: dev server 띄우고 브라우저에서 수동 확인**

Run: `npm run dev`

브라우저 devtools 에서 뷰포트 높이를 각각 다음으로 변경해 확인:

| 높이 | 기대 셀 크기 | 기대 패널 폭 |
|---|---|---|
| 800px | 24px | 74px |
| 1080px | 32px | 90px |
| 1440px | 40px | 112px |

각 높이에서 다음 페이지를 차례로 확인:
- `/menu` — 사이드바 + 가운데 모드 카드, 현재 페이지 "Menu" 가 마젠타로 활성 표시
- `/play` — 사이드바 + 좌측 패널(HOLD+통계) + 보드 + 우측 NEXT, 가로 nav 없음
- `/lobby` — 사이드바 + 가운데 BATTLE LOBBY + 매칭 UI
- `/leaderboard` — 사이드바 + 리더보드 테이블 + ← Back 없음
- `/profile` — 사이드바 + 본인 통계
- `/battle/<test-id>` — 사이드바 + 좌측 패널 + 보드 + NEXT + 디바이더 + 상대방 rail

게스트 로그인 시:
- 사이드바 미니 프로필이 안 보이는지
- "Profile" nav 가 회색 비활성 텍스트로 표시되는지

설정 모달 (⚙):
- 우상단 고정 위치 유지, 사이드바와 시각적으로 분리되는지
- 언어 / 키바인딩 / 로그아웃이 모두 정상 동작하는지

- [ ] **Step 5: 빈 공간 확인 (1080p 화면 기준)**

`/play` 페이지에서 게임 보드 하단의 여백이 처음 스크린샷 (현 상태) 대비 의미있게 줄었는지 확인. 사용자의 1차 불만 ("화면 크기에 맞게 변화 안 함, 빈 공간 큼") 이 해결되었는지가 핵심 수용 기준.

- [ ] **Step 6: 회귀 확인**

기존 게임 동작 회귀 없음 확인:
- 솔로 게임 시작/일시정지/리셋 동작
- 키 바인딩 (← → ↑ Z Space C) 동작
- localStorage 최고 점수 갱신
- 배틀 매칭 → 카운트다운 → 플레이 → 결과
- 설정 모달 언어 전환

- [ ] **Step 7: 최종 commit (있으면)**

수동 검증 중 발견된 작은 픽셀 조정이 있다면 별도 commit. 없으면 스킵.

---

## Self-Review (작성자 체크리스트)

1. **Spec 커버리지:**
   - App Shell (사이드바 140px, 콘텐츠 영역) → Task 10, 11
   - 미니 프로필 (로고, 닉네임, 랭크, 베스트) → Task 8, 9
   - Stepped breakpoints (24/32/40, sm/md/lg) → Task 2, 3
   - 게임 컴포넌트 tier 전파 → Task 4-7
   - 게임 페이지 통계 통합 → Task 12
   - 배틀 페이지 상대방 rail 분리 → Task 13
   - 다른 페이지 AppShell wrap + Back 제거 → Task 14-19
   - i18n 정리 (sidebar / opponent) → Task 1, 일부 페이지 12-13
   - SettingsButton 고정 위치 유지 → 명시적 변경 없음 (`src/app/layout.tsx` 변경 시 SettingsButton 위치 그대로)

2. **Placeholder 없음:** 모든 Task 에 실제 코드 / 명령 / 기대 결과 포함. "적절히 처리", "TODO" 류 없음.

3. **타입 / 식별자 일관성:**
   - `Tier = 'sm' | 'md' | 'lg'` 는 `src/lib/tierSizes.ts` 에서 export, 다른 곳에서 import
   - `getCellSize`, `getPanelWidth`, `getCanvasSize` 시그니처 일관
   - `useViewportTier()` 반환 타입 `Tier`
   - `useUserProfile()` 반환 `{ profile, loading }`, `UserProfile` 필드 `id/nickname/isGuest/bestScore/rank`
   - `Sidebar` 의 `NAV` 배열은 i18n 키 `navMenu/navPlay/navBattle/navBoard/navProfile` 사용 (Task 1 에서 추가한 키와 일치)

4. **모호함:** `OpponentMini` 의 `tier` prop 은 현재 무시되지만 일관성을 위해 받음 (Task 7 에 명시).

빠진 부분 없음. 진행 가능.
