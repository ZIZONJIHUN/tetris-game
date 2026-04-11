# Tetris.io 클론 — 설계 문서

**날짜**: 2026-04-11  
**스택**: Next.js 16, Supabase, Vercel  
**상태**: 승인됨

---

## 1. 프로젝트 개요

테트리스.io 스타일의 웹 테트리스 게임. 혼자 즐기는 **일반전**과 실시간 1vs1 **경쟁전** 두 모드를 제공한다. 네온 사이버펑크 비주얼, 데스크탑 키보드 조작 전용.

### 핵심 요구사항
- 일반전: 솔로 테트리스, 개인 최고 점수 기록
- 경쟁전: 1vs1 점수 경쟁 (2분 고정), 랜덤 매칭 + 방 코드 초대
- 인증: 게스트(닉네임만) 플레이 가능, 로그인 시 전적/리더보드 등록
- 리더보드: 글로벌 랭킹 + 개인 전적 통계

---

## 2. 기술 스택

| 역할 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 데이터베이스 | Supabase PostgreSQL |
| 실시간 통신 | Supabase Realtime (Broadcast + Presence) |
| 인증 | Supabase Auth (이메일 + Anonymous Auth) |
| 배포 | Vercel (main → Production 자동 배포) |
| 게임 렌더링 | HTML Canvas 2D API |
| 테스트 | Jest (유닛), Playwright (E2E) |

---

## 3. 페이지 구조

```
/                    ← 메인 홈 (닉네임 입력, 게스트/로그인 선택)
/play                ← 일반전 (솔로 테트리스)
/lobby               ← 경쟁전 로비 (랜덤 매칭 대기 / 방 만들기·입장)
/battle/[roomId]     ← 경쟁전 게임 화면
/leaderboard         ← 글로벌 랭킹
/profile             ← 개인 전적 (로그인 유저만)
```

---

## 4. 컴포넌트 구조

```
TetrisEngine         ← 순수 게임 로직 (프레임워크 무관, 테스트 가능)
TetrisBoard          ← Canvas 2D 렌더러
GameController       ← 키보드 이벤트 → 엔진 연결
SoloGame             ← 일반전 조합 (/play)
BattleGame           ← 경쟁전 조합 (/battle/[roomId])
  ├── MyBoard        ← 내 보드 (크게, Hold/Next/Ghost 포함)
  └── OpponentMini   ← 상대 미니보드 (Realtime 수신, 실시간 렌더링)
MatchmakingLobby     ← 랜덤 매칭 대기 + 방 코드 UI
```

---

## 5. 데이터베이스 스키마

```sql
-- 유저 프로필
-- 게스트: Supabase Anonymous Auth로 임시 auth.users 생성 → profiles에 is_guest=true로 저장
-- 로그인: 이메일 Auth → profiles에 is_guest=false로 저장
profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users,
  nickname    text NOT NULL,
  is_guest    boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
)

-- 게임 결과 기록 (로그인 유저만 저장)
game_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         text NOT NULL,
  player_id       uuid REFERENCES profiles,
  opponent_id     uuid REFERENCES profiles,
  my_score        int NOT NULL,
  opponent_score  int NOT NULL,
  is_win          boolean NOT NULL,
  played_at       timestamptz DEFAULT now()
)

-- 리더보드 뷰
CREATE VIEW leaderboard_view AS
SELECT
  p.id AS player_id,
  p.nickname,
  MAX(gr.my_score) AS best_score,
  COUNT(*) FILTER (WHERE gr.is_win) AS total_wins,
  COUNT(*) AS total_games,
  ROUND(COUNT(*) FILTER (WHERE gr.is_win)::numeric / COUNT(*) * 100, 1) AS win_rate
FROM profiles p
JOIN game_results gr ON gr.player_id = p.id
WHERE p.is_guest = false
GROUP BY p.id, p.nickname
ORDER BY best_score DESC;
```

---

## 6. Supabase Realtime 채널 설계

### 채널 구조

```
battle:{roomId}
  - Presence: 플레이어 입장/퇴장, 준비 상태
  - Broadcast: 게임 상태 동기화

waiting_room
  - Presence: 랜덤 매칭 대기열 관리
```

### Broadcast 페이로드

```typescript
// 게임 상태 (약 100ms 간격 전송)
{
  type: 'game_state',
  payload: {
    board: number[][]    // 20×10
    score: number
    lines: number
    level: number
  }
}

// 게임 이벤트
{
  type: 'game_event',
  payload: {
    event: 'ready' | 'start' | 'over'
  }
}
```

### 매칭 흐름

```
랜덤 매칭:
  1. waiting_room 채널에 Presence join (nickname, userId 포함)
  2. 다른 유저 감지 시 → 먼저 들어온 유저가 roomId 생성
  3. Broadcast로 roomId 전달 → 양쪽 /battle/{roomId} 이동

방 코드:
  1. 방장이 6자리 roomId 생성 → 화면에 표시
  2. 상대가 코드 입력 → 동일 채널 join → 시작
```

---

## 7. 게임 엔진 설계

### 핵심 상태 타입

```typescript
type GameState = {
  board: number[][]        // 20행 × 10열 (0: 빈칸, 1-7: 블록 색상)
  currentPiece: Piece
  holdPiece: Piece | null
  nextPieces: Piece[]      // 3개 미리보기
  ghostY: number           // 고스트 피스 Y 위치 (계산값)
  score: number
  lines: number
  level: number
  speed: number            // ms per tick
  status: 'idle' | 'playing' | 'over'
}

type Piece = {
  type: 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
  rotation: 0 | 1 | 2 | 3
  x: number
  y: number
}
```

### 점수 계산 (표준 테트리스 가이드라인)

| 줄 제거 | 점수 |
|---------|------|
| 1줄 | 100 × level |
| 2줄 | 300 × level |
| 3줄 | 500 × level |
| 4줄 (테트리스) | 800 × level |
| 소프트 드롭 | 1점/칸 |
| 하드 드롭 | 2점/칸 |

### 속도 공식

```
speed(ms) = max(100, 1000 - (level - 1) × 80)
레벨업 조건: 10줄 제거마다 +1레벨
2분 제한 내 최대 레벨: 약 6~7
```

### 키보드 조작

| 키 | 동작 |
|----|------|
| ← → | 좌우 이동 |
| ↑ / X | 시계방향 회전 |
| Z | 반시계방향 회전 |
| ↓ | 소프트 드롭 |
| Space | 하드 드롭 |
| C | 홀드 |

### 렌더링

- Canvas 2D API, 60fps requestAnimationFrame 루프
- 블록: `shadowBlur` + `shadowColor`로 네온 글로우 효과
- 고스트 피스: 동일 색상 20% 투명도
- 라인 클리어: 200ms 플래시 애니메이션
- 색상 팔레트: I=#00f5ff, O=#ffe600, T=#ff00ff, S=#00ff88, Z=#ff3333, J=#4488ff, L=#ff6600

---

## 8. 경쟁전 흐름

```
매칭 완료
    ↓
카운트다운 3-2-1 (Broadcast로 양쪽 동시 시작)
    ↓
게임 플레이 (2분)
  - 매 100ms: game_state broadcast
  - 상대 game_state 수신 → OpponentMini 렌더링
    ↓
종료 조건: 2분 경과 or 양쪽 모두 게임오버
    ↓
결과 화면 (점수 비교, 승/패/무승부)
  - game_results 저장 (로그인 유저만)
    ↓
재대전 or 로비 복귀
```

---

## 9. 엣지 케이스 처리

| 상황 | 처리 |
|------|------|
| 상대 연결 끊김 | Presence leave 감지 → 30초 대기 후 자동 승리 |
| 내가 게임오버 | 2분까지 대기, 최종 점수로 비교 |
| 동점 | 더 많은 줄 제거한 플레이어 승리, 그것도 같으면 무승부 |
| 매칭 대기 60초 초과 | 자동 취소, 일반전 유도 |
| 방 코드 오입력 | 존재하지 않는 방 안내 |
| Realtime 연결 끊김 | 자동 재연결 3회, 실패 시 로비 복귀 |

---

## 10. 게스트 vs 로그인 유저

| 기능 | 게스트 | 로그인 |
|------|--------|--------|
| 일반전 플레이 | ✅ | ✅ |
| 경쟁전 플레이 | ✅ | ✅ |
| 전적 저장 | ❌ | ✅ |
| 리더보드 등록 | ❌ | ✅ |
| 프로필 페이지 | ❌ | ✅ |
| 세션 지속 | Anonymous Auth 임시 세션 | 영구 유지 |

---

## 11. 환경변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 12. 개발 우선순위 (Phase)

### Phase 1 — 게임 코어
- TetrisEngine (순수 로직, Jest 테스트 포함)
- Canvas 렌더러 + 네온 스타일
- 키보드 조작 (Hold, Ghost, Hard Drop 포함)
- 일반전 `/play` 완성

### Phase 2 — 인증 & 인프라
- Supabase 프로젝트 세팅 + DB 마이그레이션
- 게스트: Anonymous Auth → profiles(is_guest=true) 저장
- 로그인: 이메일 Auth → profiles(is_guest=false) 저장
- 홈 화면 (`/`)

### Phase 3 — 멀티플레이어
- Supabase Realtime 채널 구성
- 랜덤 매칭 + 방 코드 시스템
- 경쟁전 화면 + 미니보드 동기화 (`/battle/[roomId]`)
- 로비 (`/lobby`)

### Phase 4 — 마무리
- 리더보드 & 전적 페이지
- 결과 화면 UI polish
- Vercel 배포 + 도메인 연결
- E2E 테스트 (Playwright)
