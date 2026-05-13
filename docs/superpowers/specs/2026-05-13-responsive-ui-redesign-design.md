# Responsive UI Redesign — Design Spec

**Date:** 2026-05-13
**Scope:** All pages (`/`, `/menu`, `/play`, `/lobby`, `/battle/[roomId]`, `/leaderboard`, `/profile`, `/auth/set-nickname`)
**Target form factor:** Desktop only (≥1280px wide nominally; min ~1024px should still work)

## Problem

Current UI uses hardcoded pixel sizes throughout and does not adapt to viewport. On a typical 1080p+ display, the game page leaves roughly 30–40% of the vertical space empty, side panels sit far from the board, and the top horizontal nav clashes with the game area. Every page repeats the same pattern: `min-h-screen flex flex-col items-center py-X` with a fixed-width inner content block and no responsive sizing.

Specifically:

- `TetrisBoard` uses `CELL = 30`, giving a fixed 300×600 board with no scaling
- `HoldPiece` / `NextPieces` use 80px-wide fixed canvases
- `SoloGame` / `BattleGame` use `w-24` (96px) fixed side panels with `gap-6` between them and the board
- No use of `vh`, `clamp()`, or media queries for layout sizing anywhere
- Nav links (`Menu | Battle | Leaderboard | Profile`) appear inline above the board on `/play`, but as a `← Back` link + page title on other pages — inconsistent
- Labels are mixed Korean (홀드/점수/최고/레벨/라인) and English (NEXT/Score/Time/Level)
- Key-binding help is a single line of plain text at page bottom

## Decisions

| Decision | Choice |
|---|---|
| Target | Desktop only |
| Scope | All pages |
| Board sizing | Hybrid stepped breakpoints (viewport-height media queries) |
| Page layout | Persistent left sidebar nav + content area |
| Sidebar content | Logo + user mini-profile + nav links |

## App Shell

A new persistent `AppShell` component wraps all authenticated pages (`/menu`, `/play`, `/lobby`, `/battle/[roomId]`, `/leaderboard`, `/profile`).

The landing page `/` and `/auth/set-nickname` keep their full-screen centered layout — they are pre-auth and have no nav.

### Sidebar (left)

- **Width:** 140px fixed
- **Background:** `#0a0a14` (slightly darker than page background `#0a0a1a`) with `border-r border-[#1a1a2e]`
- **Layout:** Flex column, full viewport height, padding 14px

Sections, top to bottom:

1. **Logo** — `TETRIS` in Orbitron bold, cyan with neon glow (`text-shadow: 0 0 8px #00f5ff`)
2. **Mini profile card** (only when logged in, hidden for guests)
   - Avatar circle (gradient placeholder; we don't have avatar uploads yet)
   - Nickname (white, truncate)
   - Rank line: `★ Rank #N` (yellow)
   - Best score line: `Best 13,401` (gray)
   - Bordered with `border border-[#1a1a2e] rounded`
3. **Nav links** — vertical list, font-size 12px, letter-spacing wide
   - `▢ Menu` → `/menu`
   - `▸ Play` → `/play`
   - `⚔ Battle` → `/lobby`
   - `★ Board` → `/leaderboard`
   - `◐ Profile` → `/profile` (hidden for guests, like current menu logic)
   - Active page: magenta with neon glow + `▸` marker
   - Inactive: gray, hover lightens

The existing `SettingsButton` (gear icon) remains `position: fixed` top-right and keeps its current modal (language, keybindings, logout). **Do not duplicate logout in the sidebar** — it already lives in the settings modal.

### Content area (right of sidebar)

- Fills remaining viewport width
- Default vertical padding: `py-8`
- Each page provides its own inner layout

## Board Sizing — Stepped Breakpoints

Cell size scales by **viewport height** in three steps. We use viewport height (not width) because the board is taller than wide and screen height is the binding dimension.

| Viewport height | Cell size | Board dimensions |
|---|---|---|
| ≤ 900px | 24px | 240 × 480 |
| 901–1200px | 32px | 320 × 640 |
| ≥ 1201px | 40px | 400 × 800 |

`HoldPiece` and `NextPieces` cell sizes scale proportionally:

| Tier | Board cell | Hold cell | Next cell |
|---|---|---|---|
| Small | 24 | 16 | 12 |
| Medium | 32 | 20 | 16 |
| Large | 40 | 26 | 20 |

### Implementation approach

Cell size is decided once at render time from `window.innerHeight` and propagated through React state via a `useViewportTier()` hook that:

1. Reads `window.innerHeight` on mount
2. Subscribes to `window.resize` (debounced 100ms)
3. Returns `'sm' | 'md' | 'lg'`

`TetrisBoard`, `HoldPiece`, `NextPieces` accept the tier as a prop (or read from a context) and pick their cell size accordingly. Canvas `width` / `height` attributes update on tier change, causing a redraw via existing `useEffect` deps.

We do **not** use CSS `transform: scale()` — the canvas needs real pixel resolution to stay crisp.

## Game Page (`/play`) Layout

Inside the content area:

```
┌─────────────────────────────────────────────────────────┐
│                                            ⚙ (fixed)   │
│                                                         │
│   ┌──────┐    ┌────────────┐    ┌──────┐                │
│   │HOLD  │    │            │    │ NEXT │                │
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

- Left panel and right panel widths scale with tier: `74px / 90px / 112px`
- Gap between panels and board: `12px` (was `24px`)
- Stats (Score, Best, Level, Lines) move from a separate column into the left panel below `HoldPiece`
- Key-help line stays at page bottom, smaller and gray

The left panel uses a single column flex layout: HOLD canvas → SCORE → BEST → LEVEL → LINES, each labeled with a small uppercase 8px label and a colored value (cyan / yellow / magenta / white as today).

## Battle Page (`/battle/[roomId]`) Layout

Same shell, board uses the same tier sizing. Right of the board:

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

- Existing `OpponentMini` component placement changes: from "below NEXT in right panel" to "separated rail to the right of NEXT" with a thin vertical divider
- Opponent rail has its own background tone (slight red tint on border) to visually distinguish from "my" side
- All cell sizing follows the same tier

## Other Pages

All other authenticated pages use the same shell. Inner content uses `max-width` containers (not full-bleed) for readability:

- **`/menu`** — Title centered in content area, mode buttons centered in a `max-w-md` column. Drop the redundant `← Back` link (sidebar handles nav).
- **`/lobby`** — Title `BATTLE LOBBY`, `MatchmakingLobby` component below in `max-w-lg` container. Drop `← Back`.
- **`/leaderboard`** — Table in `max-w-2xl` centered, drop `← Back`.
- **`/profile`** — Stats grid + recent games in `max-w-2xl` centered, drop `← Back`.

The current cyberpunk neon palette stays unchanged across all pages (cyan primary, magenta accent, yellow highlight, dark navy background).

## Localization Cleanup

The sidebar nav labels and game stat labels go through `useLanguage()`/`t()`. Today:

- `SoloGame` mixes `{t('score')}` with hardcoded `'Score'` etc — inconsistent
- `BattleGame` uses hardcoded English (`Score`, `Time`, `Level`)
- `Leaderboard` / `Profile` use hardcoded English headings

Scope of i18n cleanup in this redesign: **sidebar nav, page titles, stat labels**. Pre-existing translation keys are reused where they exist (`score`, `bestScore`, `level`, `lines`, `hold`); new keys added for page titles and `time`, `opponent`, `myBoard`.

## Components — New / Modified

**New:**

- `src/components/AppShell.tsx` — sidebar + content slot
- `src/components/Sidebar.tsx` — logo, profile, nav links
- `src/components/UserMiniProfile.tsx` — avatar + nickname + rank + best (uses Supabase profile + leaderboard query)
- `src/hooks/useViewportTier.ts` — returns `'sm' | 'md' | 'lg'` from `window.innerHeight`

**Modified:**

- `src/components/TetrisBoard.tsx` — accept `tier` prop, compute `CELL` from tier
- `src/components/HoldPiece.tsx` — accept `tier`, compute cell + canvas size
- `src/components/NextPieces.tsx` — accept `tier`, compute cell + canvas size
- `src/components/OpponentMini.tsx` — accept `tier` (already a mini, smaller jumps)
- `src/components/SoloGame.tsx` — drop outer page chrome, lay out left panel + board + right panel inside shell
- `src/components/BattleGame.tsx` — same restructure, opponent rail to the right
- `src/app/play/page.tsx` — replace inline nav with `<AppShell><SoloGame/></AppShell>`
- `src/app/battle/[roomId]/page.tsx` — wrap with `AppShell`
- `src/app/menu/page.tsx` — wrap with `AppShell`, drop guest-redirect inside shell (still client-side)
- `src/app/lobby/page.tsx` — wrap with `AppShell`, drop `← Back`
- `src/app/leaderboard/page.tsx` — wrap with `AppShell`, drop `← Back`
- `src/app/profile/page.tsx` — wrap with `AppShell`, drop `← Back`
- `src/lib/i18n.ts` — add translation keys for new sidebar labels and page titles

**Unchanged:**

- `src/app/page.tsx` (landing) and `src/app/auth/set-nickname/page.tsx` — pre-auth, no shell
- `src/components/SettingsButton.tsx` — keeps fixed top-right position and modal
- `src/components/TetrisBackground.tsx` — drifting tetromino background continues to render behind the shell
- `src/game/*`, `src/hooks/useGame.ts`, `src/hooks/useBattle.ts` — pure game logic untouched

## Out of Scope

- Mobile / tablet layouts (desktop-only by decision)
- Visual identity change — cyberpunk neon stays
- Avatar image uploads (mini profile uses gradient placeholder)
- Settings modal redesign (separate concern)
- Re-skinning the landing page or set-nickname flow
- Refactoring `useGame` / `useBattle` / game engine

## Risks

- **Canvas redraw on tier change:** Existing `useEffect` deps in `TetrisBoard` already include `cellSize`, so a tier change should trigger a redraw. Verify no flicker.
- **Profile data fetch in sidebar:** `UserMiniProfile` runs a Supabase query on every page; needs to be cached or fetched once at shell level and passed down. Plan to use a lightweight context that fetches once on mount.
- **`min-h-screen` on inner pages:** Several pages use `min-h-screen` directly — when wrapped in shell they must drop this so the shell controls the viewport, otherwise nested scroll.
- **`SettingsButton` z-index:** Fixed gear icon may overlap sidebar logo at very small widths. With desktop-only assumption and sidebar at 140px, gear at top-right is well clear — but verify at 1024px.
