# 반응형 UI 리디자인 — 설계 문서

**작성일:** 2026-05-13
**스코프:** 모든 페이지 (`/`, `/menu`, `/play`, `/lobby`, `/battle/[roomId]`, `/leaderboard`, `/profile`, `/auth/set-nickname`)
**타깃 폼 팩터:** 데스크탑 전용 (기준 ≥1280px 너비, 최소 ~1024px 까지 동작)

## 문제 정의

현재 UI는 전반에 걸쳐 픽셀 단위로 하드코딩되어 있고, 뷰포트에 적응하지 않는다. 일반적인 1080p 이상의 디스플레이에서 게임 페이지의 세로 공간 중 30~40% 가 비어 있고, 좌우 패널은 보드와 멀리 떨어져 있으며, 상단 가로 nav 가 게임 영역과 충돌한다. 모든 페이지가 같은 패턴 (`min-h-screen flex flex-col items-center py-X` + 고정 너비 내부 블록 + 반응형 사이징 없음) 을 반복하고 있다.

구체적으로:

- `TetrisBoard` 는 `CELL = 30` 으로 300×600 고정 보드, 스케일링 없음
- `HoldPiece` / `NextPieces` 는 80px 너비 고정 캔버스
- `SoloGame` / `BattleGame` 은 `w-24` (96px) 고정 좌우 패널, 보드와 `gap-6` 간격
- 레이아웃 사이징에 `vh`, `clamp()`, 미디어 쿼리가 어디에도 사용되지 않음
- nav 링크 (`Menu | Battle | Leaderboard | Profile`) 가 `/play` 에서는 보드 위에 인라인으로 표시되지만, 다른 페이지에서는 `← Back` 링크 + 타이틀로 표시 — 일관성 없음
- 라벨이 한국어 (홀드/점수/최고/레벨/라인) 와 영어 (NEXT/Score/Time/Level) 가 혼재
- 키 바인딩 안내는 페이지 하단에 단순 텍스트 한 줄

## 결정 사항

| 결정 항목 | 선택 |
|---|---|
| 타깃 | 데스크탑 전용 |
| 스코프 | 전체 페이지 |
| 보드 사이징 | Hybrid Stepped Breakpoints (뷰포트 높이 미디어 쿼리) |
| 페이지 레이아웃 | 좌측 고정 사이드바 nav + 콘텐츠 영역 |
| 사이드바 구성 | 로고 + 사용자 미니 프로필 + nav 링크 |

## App Shell

새로운 `AppShell` 컴포넌트가 인증 후 모든 페이지 (`/menu`, `/play`, `/lobby`, `/battle/[roomId]`, `/leaderboard`, `/profile`) 를 감싼다.

랜딩 페이지 `/` 와 `/auth/set-nickname` 은 기존의 풀스크린 중앙 정렬 레이아웃을 유지 — 인증 전이고 nav 가 불필요하다.

### 사이드바 (좌측)

- **너비:** 140px 고정
- **배경색:** `#0a0a14` (페이지 배경 `#0a0a1a` 보다 살짝 어두움), `border-r border-[#1a1a2e]`
- **레이아웃:** Flex column, 뷰포트 높이 100%, padding 14px

상단부터 아래로:

1. **로고** — Orbitron Bold 로 `TETRIS`, 시안색 + 네온 글로우 (`text-shadow: 0 0 8px #00f5ff`)
2. **미니 프로필 카드** (로그인 시에만 표시, 게스트는 숨김)
   - 아바타 원형 (그래디언트 플레이스홀더 — 아바타 업로드 기능은 아직 없음)
   - 닉네임 (흰색, truncate)
   - 랭킹: `★ Rank #N` (노란색)
   - 베스트 스코어: `Best 13,401` (회색)
   - `border border-[#1a1a2e] rounded` 박스로 감쌈
3. **Nav 링크** — 세로 리스트, 폰트 사이즈 12px, letter-spacing wide
   - `▢ Menu` → `/menu`
   - `▸ Play` → `/play`
   - `⚔ Battle` → `/lobby`
   - `★ Board` → `/leaderboard`
   - `◐ Profile` → `/profile` (게스트는 숨김, 현재 메뉴 로직과 동일)
   - 현재 페이지: 마젠타 + 네온 글로우 + `▸` 마커
   - 비활성: 회색, 호버 시 밝아짐

기존 `SettingsButton` (기어 아이콘) 은 `position: fixed` 우상단 위치를 유지하고 현재 모달 (언어, 키바인딩, 로그아웃) 을 그대로 사용. **사이드바에 로그아웃을 중복으로 넣지 않음** — 설정 모달에 이미 있음.

### 콘텐츠 영역 (사이드바 우측)

- 남은 뷰포트 너비를 가득 채움
- 기본 세로 패딩: `py-8`
- 페이지마다 내부 레이아웃을 따로 정의

## 보드 사이징 — Stepped Breakpoints

셀 크기를 **뷰포트 높이** 기준 3단계로 변경. 보드는 가로보다 세로가 길고, 화면 높이가 결정적이기 때문에 너비가 아닌 높이를 기준으로 한다.

| 뷰포트 높이 | 셀 크기 | 보드 크기 |
|---|---|---|
| ≤ 900px | 24px | 240 × 480 |
| 901~1200px | 32px | 320 × 640 |
| ≥ 1201px | 40px | 400 × 800 |

`HoldPiece` 와 `NextPieces` 의 셀 크기도 비례해서 스케일:

| 단계 | 보드 셀 | Hold 셀 | Next 셀 |
|---|---|---|---|
| Small | 24 | 16 | 12 |
| Medium | 32 | 20 | 16 |
| Large | 40 | 26 | 20 |

### 구현 방식

셀 크기는 렌더 시점에 `window.innerHeight` 로부터 한 번 결정되어 React state 를 통해 전달된다. `useViewportTier()` 훅은:

1. 마운트 시 `window.innerHeight` 를 읽음
2. `window.resize` 를 100ms 디바운스로 구독
3. `'sm' | 'md' | 'lg'` 를 반환

`TetrisBoard`, `HoldPiece`, `NextPieces` 는 tier 를 prop (또는 context) 으로 받아 셀 크기를 결정한다. 캔버스의 `width` / `height` 속성도 tier 변경 시 업데이트되며, 기존 `useEffect` deps 를 통해 다시 그려진다.

CSS `transform: scale()` 은 사용하지 않는다 — 캔버스는 픽셀 해상도가 실제로 변해야 선명하게 유지된다.

## 게임 페이지 (`/play`) 레이아웃

콘텐츠 영역 내부:

```
┌─────────────────────────────────────────────────────────┐
│                                            ⚙ (fixed)   │
│                                                         │
│   ┌──────┐    ┌────────────┐    ┌──────┐                │
│   │ HOLD │    │            │    │ NEXT │                │
│   │      │    │            │    │      │                │
│   ├──────┤    │   BOARD    │    │      │                │
│   │SCORE │    │            │    │      │                │
│   │BEST  │    │            │    └──────┘                │
│   │LEVEL │    │            │                            │
│   │LINES │    │            │                            │
│   └──────┘    └────────────┘                            │
│                                                         │
│       ← → Move | ↑/X Rotate | Z CCW | Space | C        │
└─────────────────────────────────────────────────────────┘
```

- 좌우 패널 너비는 tier 에 따라: `74px / 90px / 112px`
- 패널과 보드 사이 간격: `12px` (기존 `24px` 에서 축소)
- 통계 (Score, Best, Level, Lines) 가 별도 컬럼에서 좌측 패널의 `HoldPiece` 아래로 통합
- 키 안내 라인은 페이지 하단에 작고 회색으로 유지

좌측 패널은 단일 컬럼 flex 레이아웃: HOLD 캔버스 → SCORE → BEST → LEVEL → LINES, 각각 8px 대문자 라벨 + 색상 (시안 / 노랑 / 마젠타 / 흰색) 값.

## 배틀 페이지 (`/battle/[roomId]`) 레이아웃

같은 shell, 보드는 동일한 tier 사이징 사용. 보드 우측:

```
┌──────┐  ┌────────────┐  ┌──────┐  │ ┌──────────┐
│ HOLD │  │            │  │ NEXT │  │ │ OPPONENT │
│      │  │            │  │      │  │ │  enemy   │
├──────┤  │   BOARD    │  │      │  │ │ ┌──────┐ │
│SCORE │  │            │  └──────┘  │ │ │      │ │
│TIME  │  │            │            │ │ │ MINI │ │
│LEVEL │  │            │            │ │ │      │ │
│me    │  │            │            │ │ └──────┘ │
└──────┘  └────────────┘            │ │ score    │
                                    │ └──────────┘
```

- 기존 `OpponentMini` 컴포넌트의 위치 변경: "오른쪽 패널 NEXT 아래" → "NEXT 옆 별도 rail, 얇은 세로 디바이더로 구분"
- 상대방 rail 은 자체 배경 톤을 가짐 (테두리에 살짝 붉은 틴트) — "내 쪽" 과 시각적으로 구분
- 모든 셀 크기는 동일한 tier 적용

## 다른 페이지

다른 모든 인증 페이지도 같은 shell 사용. 내부 콘텐츠는 가독성을 위해 `max-width` 컨테이너 (풀 블리드 X):

- **`/menu`** — 타이틀을 콘텐츠 영역 중앙에, 모드 버튼들을 `max-w-md` 컬럼에 중앙 정렬. 중복인 `← Back` 링크 제거 (사이드바가 nav 담당)
- **`/lobby`** — 타이틀 `BATTLE LOBBY`, 아래에 `MatchmakingLobby` 컴포넌트를 `max-w-lg` 컨테이너로. `← Back` 제거
- **`/leaderboard`** — `max-w-2xl` 중앙 정렬 테이블, `← Back` 제거
- **`/profile`** — `max-w-2xl` 중앙 정렬 통계 그리드 + 최근 경기, `← Back` 제거

현재의 사이버펑크 네온 팔레트는 전 페이지에서 유지 (시안 메인, 마젠타 액센트, 노랑 하이라이트, 다크 네이비 배경).

## 다국어 정리

사이드바 nav 라벨과 게임 통계 라벨을 `useLanguage()`/`t()` 로 통일. 현재 상태:

- `SoloGame` 은 `{t('score')}` 와 하드코딩된 `'Score'` 가 혼재 — 일관성 없음
- `BattleGame` 은 하드코딩 영어 (`Score`, `Time`, `Level`) 사용
- `Leaderboard` / `Profile` 은 하드코딩 영어 헤딩 사용

이번 리디자인에서 i18n 정리 범위: **사이드바 nav, 페이지 타이틀, 통계 라벨**. 기존 번역 키 (`score`, `bestScore`, `level`, `lines`, `hold`) 는 재사용; 페이지 타이틀과 `time`, `opponent`, `myBoard` 키를 새로 추가.

## 컴포넌트 — 신규 / 수정

**신규:**

- `src/components/AppShell.tsx` — 사이드바 + 콘텐츠 슬롯
- `src/components/Sidebar.tsx` — 로고, 프로필, nav 링크
- `src/components/UserMiniProfile.tsx` — 아바타 + 닉네임 + 랭킹 + 베스트 (Supabase profile + leaderboard 쿼리 사용)
- `src/hooks/useViewportTier.ts` — `window.innerHeight` 로부터 `'sm' | 'md' | 'lg'` 반환

**수정:**

- `src/components/TetrisBoard.tsx` — `tier` prop 추가, tier 기반 `CELL` 계산
- `src/components/HoldPiece.tsx` — `tier` 추가, 셀 + 캔버스 사이즈 계산
- `src/components/NextPieces.tsx` — `tier` 추가, 셀 + 캔버스 사이즈 계산
- `src/components/OpponentMini.tsx` — `tier` 추가 (이미 미니 사이즈, 변동 폭은 작게)
- `src/components/SoloGame.tsx` — 외부 페이지 chrome 제거, shell 내부에서 좌측 패널 + 보드 + 우측 패널 레이아웃
- `src/components/BattleGame.tsx` — 같은 방식으로 재구성, 상대방 rail 을 우측으로
- `src/app/play/page.tsx` — 인라인 nav 를 `<AppShell><SoloGame/></AppShell>` 로 교체
- `src/app/battle/[roomId]/page.tsx` — `AppShell` 로 감쌈
- `src/app/menu/page.tsx` — `AppShell` 로 감쌈, 게스트 리다이렉트는 shell 내부에서도 유지 (클라이언트 사이드)
- `src/app/lobby/page.tsx` — `AppShell` 로 감쌈, `← Back` 제거
- `src/app/leaderboard/page.tsx` — `AppShell` 로 감쌈, `← Back` 제거
- `src/app/profile/page.tsx` — `AppShell` 로 감쌈, `← Back` 제거
- `src/lib/i18n.ts` — 사이드바 라벨 및 페이지 타이틀 번역 키 추가

**변경 없음:**

- `src/app/page.tsx` (랜딩) 과 `src/app/auth/set-nickname/page.tsx` — 인증 전, shell 사용 안 함
- `src/components/SettingsButton.tsx` — 우상단 고정 + 모달 그대로 유지
- `src/components/TetrisBackground.tsx` — 떠다니는 테트리미노 배경은 shell 뒤에 계속 렌더
- `src/game/*`, `src/hooks/useGame.ts`, `src/hooks/useBattle.ts` — 순수 게임 로직 손대지 않음

## 스코프 외

- 모바일 / 태블릿 레이아웃 (데스크탑 전용 결정)
- 비주얼 아이덴티티 변경 — 사이버펑크 네온 유지
- 아바타 이미지 업로드 (미니 프로필은 그래디언트 플레이스홀더 사용)
- 설정 모달 리디자인 (별도 작업)
- 랜딩 페이지 / set-nickname 화면 리스킨
- `useGame` / `useBattle` / 게임 엔진 리팩토링

## 리스크

- **Tier 변경 시 캔버스 리드로:** `TetrisBoard` 의 기존 `useEffect` deps 에 `cellSize` 가 이미 포함되어 있어 tier 변경 시 자동 리드로 발생 예정. 깜빡임 없는지 확인 필요.
- **사이드바의 프로필 데이터 fetch:** `UserMiniProfile` 이 페이지마다 Supabase 쿼리를 돌리지 않도록 shell 레벨에서 한 번만 fetch 하고 내려주는 가벼운 context 사용 예정.
- **내부 페이지의 `min-h-screen`:** 여러 페이지가 `min-h-screen` 을 직접 사용 중인데, shell 로 감싸면서 이걸 제거해야 함. 안 그러면 중첩 스크롤 발생.
- **`SettingsButton` z-index:** 고정 기어 아이콘이 매우 작은 너비에서 사이드바 로고와 겹칠 수 있음. 데스크탑 전용 + 사이드바 140px 가정이면 우상단 기어는 충분히 떨어져 있지만 1024px 에서 확인 필요.
