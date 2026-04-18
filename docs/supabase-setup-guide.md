# Supabase 연동 가이드

이 프로젝트(Tetris.io 클론)에 Supabase를 연결하는 전체 과정을 단계별로 설명합니다.

---

## 목차

1. [Supabase 프로젝트 생성](#1-supabase-프로젝트-생성)
2. [API 키 복사 및 환경변수 설정](#2-api-키-복사-및-환경변수-설정)
3. [DB 스키마 실행 (마이그레이션)](#3-db-스키마-실행-마이그레이션)
4. [Anonymous Auth 활성화](#4-anonymous-auth-활성화)
5. [이메일 인증 설정](#5-이메일-인증-설정)
6. [연동 확인](#6-연동-확인)
7. [자주 발생하는 오류](#7-자주-발생하는-오류)

---

## 1. Supabase 프로젝트 생성

### 1-1. 회원가입 / 로그인

1. 브라우저에서 **https://supabase.com** 접속
2. 우측 상단 **"Start your project"** 클릭
3. GitHub 계정으로 로그인하거나 이메일로 회원가입

### 1-2. 새 프로젝트 만들기

1. 로그인 후 대시보드에서 **"New project"** 클릭
2. 아래 항목 입력:

   | 항목 | 입력값 |
   |------|--------|
   | **Name** | `tetris-game` (원하는 이름) |
   | **Database Password** | 강력한 비밀번호 설정 (나중에 필요할 수 있으니 저장해두기) |
   | **Region** | `Northeast Asia (Seoul)` 선택 |

3. **"Create new project"** 클릭
4. 프로젝트 초기화까지 **약 1~2분** 기다림 (진행 바가 100%가 될 때까지)

---

## 2. API 키 복사 및 환경변수 설정

### 2-1. API 키 찾기

1. 프로젝트 대시보드 → 왼쪽 사이드바에서 **Settings** (톱니바퀴 아이콘) 클릭
2. **API** 메뉴 클릭
3. 아래 두 값을 찾아 복사:

```
Project URL:  https://abcdefghijklmn.supabase.co
              (위치: "Project URL" 섹션)

anon key:     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhY...
              (위치: "Project API keys" > "anon public" 항목)
```

> ⚠️ **service_role 키는 절대 복사하지 마세요.** 브라우저 클라이언트에서 사용하는 키는 반드시 `anon` 키입니다.

### 2-2. 환경변수 파일에 입력

프로젝트 루트(`C:/Projects/Nike/`)에 있는 `.env.local` 파일을 열어 아래처럼 입력:

```env
NEXT_PUBLIC_SUPABASE_URL=https://여기에_Project_URL_입력.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key_입력
```

**예시:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiO...
```

> ✅ `.env.local`은 `.gitignore`에 이미 포함되어 있어 Git에 올라가지 않습니다.

---

## 3. DB 스키마 실행 (마이그레이션)

### 3-1. SQL Editor 열기

1. 좌측 사이드바 → **SQL Editor** 클릭 (코드 아이콘)
2. 우측 상단 **"New query"** 클릭

### 3-2. SQL 붙여넣기 및 실행

아래 SQL 전체를 복사해서 에디터에 붙여넣은 후 **"Run"** (▶ 버튼) 클릭:

```sql
-- =============================================
-- profiles 테이블
-- 게스트(anonymous auth)와 로그인 유저 모두 저장
-- =============================================
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


-- =============================================
-- game_results 테이블
-- 경쟁전 결과 저장 (로그인 유저만)
-- =============================================
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


-- =============================================
-- leaderboard_view
-- 글로벌 랭킹 (로그인 유저만 포함)
-- =============================================
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
```

3. 하단에 **"Success. No rows returned"** 메시지가 뜨면 성공

### 3-3. 생성 확인

1. 좌측 사이드바 → **Table Editor** 클릭
2. `profiles`, `game_results` 테이블이 보이면 완료

---

## 4. Anonymous Auth 활성화

게스트 플레이어(닉네임만 입력)가 Supabase Auth를 통해 임시 계정을 갖도록 설정합니다.

1. 좌측 사이드바 → **Authentication** 클릭
2. 상단 탭 중 **Providers** 클릭
3. 목록에서 **"Anonymous Sign-ins"** 찾기
4. 토글을 **켜기 (파란색)** 로 변경
5. **"Save"** 클릭

> ✅ 이 설정이 활성화되어야 게스트가 `auth.users`에 임시 row를 생성하고, `profiles` 테이블 FK가 정상 작동합니다.

---

## 5. 이메일 인증 설정

로그인 유저(이메일+비밀번호)를 위한 설정입니다.

### 5-1. 이메일 인증 이메일 끄기 (개발 중 편의를 위해)

개발 단계에서는 이메일 인증 없이 바로 가입되도록 설정하면 편합니다:

1. **Authentication** → **Providers** → **Email**
2. **"Confirm email"** 토글 → **끄기**
3. **Save** 클릭

> ⚠️ 프로덕션 배포 전에는 다시 켜는 것을 권장합니다.

### 5-2. 리다이렉트 URL 설정 (나중에 배포 시 필요)

1. **Authentication** → **URL Configuration**
2. **Site URL**: `http://localhost:3000` (개발용)
3. 나중에 Vercel 배포 후 실제 도메인으로 변경

---

## 6. 연동 확인

모든 설정 완료 후 개발 서버를 실행해서 연결이 되는지 확인합니다.

터미널에서:
```bash
cd C:/Projects/Nike
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후 개발자 도구(F12) → Console에 Supabase 관련 에러가 없으면 정상입니다.

---

## 7. 자주 발생하는 오류

### "Invalid API key" 에러
- `.env.local`의 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 값이 잘못 복사된 경우
- `service_role` 키를 실수로 사용한 경우
- **해결:** Supabase 대시보드 → Settings → API에서 `anon public` 키를 다시 복사

### "relation does not exist" 에러
- SQL 마이그레이션이 실행되지 않은 경우
- **해결:** SQL Editor에서 위의 SQL을 다시 실행

### Anonymous sign-in 에러
- Anonymous Sign-ins가 비활성화된 경우
- **해결:** Authentication → Providers → Anonymous Sign-ins 토글 켜기

### CORS 에러
- `.env.local`의 URL 끝에 슬래시(`/`)가 붙어 있는 경우
- **해결:** `https://xxxx.supabase.co` (슬래시 없이)

### `.env.local` 변경 후 반영 안 됨
- Next.js는 환경변수 변경 시 개발 서버 재시작 필요
- **해결:** 터미널에서 `Ctrl+C` → `npm run dev` 다시 실행

---

## 완료 체크리스트

- [ ] Supabase 프로젝트 생성
- [ ] `.env.local`에 URL, anon key 입력
- [ ] SQL Editor에서 마이그레이션 실행 (`profiles`, `game_results`, `leaderboard_view` 생성 확인)
- [ ] Anonymous Sign-ins 활성화
- [ ] 이메일 인증 끄기 (개발용)
- [ ] `npm run dev` 실행 후 에러 없음 확인
