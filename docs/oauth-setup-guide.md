# Google / Facebook OAuth 로그인 설정 가이드

이 문서는 Tetris 게임에 Google 및 Facebook 소셜 로그인을 연동하는 전체 과정을 단계별로 설명합니다.

---

## 목차

1. [Supabase Redirect URL 허용](#1-supabase-redirect-url-허용)
2. [Google OAuth 설정](#2-google-oauth-설정)
3. [Facebook OAuth 설정](#3-facebook-oauth-설정)
4. [연동 확인](#4-연동-확인)
5. [자주 발생하는 오류](#5-자주-발생하는-오류)

---

## 1. Supabase Redirect URL 허용

OAuth 로그인 후 사용자가 게임으로 돌아올 URL을 Supabase에 미리 등록해야 합니다.

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속 후 프로젝트 선택
2. 왼쪽 사이드바 → **Authentication** 클릭
3. 상단 탭 → **URL Configuration** 클릭
4. **Redirect URLs** 섹션에서 **Add URL** 클릭
5. 아래 URL을 각각 추가:

   | 환경 | URL |
   |------|-----|
   | 로컬 개발 | `http://localhost:3000/auth/callback` |
   | 배포 후 | `https://your-domain.vercel.app/auth/callback` |

   > ⚠️ 배포 후에는 실제 도메인으로 된 URL을 반드시 추가해야 합니다.

6. **Save** 클릭

---

## 2. Google OAuth 설정

### 2-1. Google Cloud Console에서 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 구글 계정으로 로그인
3. 상단 프로젝트 선택 드롭다운 → **새 프로젝트** 클릭
4. 프로젝트 이름 입력 (예: `tetris-game`) → **만들기** 클릭
5. 생성된 프로젝트가 선택된 상태인지 확인

### 2-2. OAuth 동의 화면 설정

1. 왼쪽 메뉴 → **APIs 및 서비스** → **OAuth 동의 화면** 클릭
2. User Type: **외부** 선택 → **만들기** 클릭
3. 아래 항목 입력:

   | 항목 | 입력값 |
   |------|--------|
   | **앱 이름** | `Tetris Game` |
   | **사용자 지원 이메일** | 본인 구글 이메일 |
   | **개발자 연락처 이메일** | 본인 구글 이메일 |

4. **저장 후 계속** 클릭
5. 스코프 페이지 → 그냥 **저장 후 계속** 클릭 (기본값 유지)
6. 테스트 사용자 페이지 → **+ ADD USERS** 클릭 → 테스트할 구글 계정 이메일 추가
7. **저장 후 계속** → **대시보드로 돌아가기** 클릭

   > ℹ️ 앱이 "테스트" 상태일 때는 등록한 테스트 사용자만 로그인 가능합니다. 실제 서비스를 위해서는 앱을 "프로덕션"으로 게시해야 합니다.

### 2-3. OAuth 클라이언트 ID 생성

1. 왼쪽 메뉴 → **APIs 및 서비스** → **사용자 인증 정보** 클릭
2. 상단 **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID** 클릭
3. 애플리케이션 유형: **웹 애플리케이션** 선택
4. 이름: `Tetris Web Client` (원하는 이름)
5. **승인된 리디렉션 URI** 섹션 → **+ URI 추가** 클릭
6. 아래 URI 입력:

   ```
   https://nwigbtzpbjpsyaujvhkp.supabase.co/auth/v1/callback
   ```

   > ⚠️ 이 URL은 Supabase 프로젝트의 콜백 URL입니다. **절대 바꾸지 마세요.**
   > Supabase 대시보드 → Settings → API → Project URL 에서 확인 가능합니다.

7. **만들기** 클릭
8. 팝업에서 **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사 (창을 닫기 전에 꼭 복사!)

### 2-4. Supabase에 Google 키 입력

1. [Supabase 대시보드](https://supabase.com/dashboard) → 프로젝트 선택
2. 왼쪽 사이드바 → **Authentication** → **Providers** 탭 클릭
3. **Google** 항목 찾기 → 클릭하여 펼치기
4. **Enable Sign in with Google** 토글 → **켜기**
5. 아래 항목 입력:

   | 항목 | 입력값 |
   |------|--------|
   | **Client ID (for OAuth)** | Google에서 복사한 클라이언트 ID |
   | **Client Secret (for OAuth)** | Google에서 복사한 클라이언트 보안 비밀번호 |

6. **Save** 클릭

---

## 3. Facebook OAuth 설정

### 3-1. Facebook 개발자 계정 등록

1. [Facebook for Developers](https://developers.facebook.com) 접속
2. 우측 상단 **로그인** → Facebook 계정으로 로그인
3. 처음이라면 개발자 등록 절차 진행 (휴대폰 인증 등)

### 3-2. 앱 만들기

1. 우측 상단 **My Apps** → **앱 만들기** 클릭
2. 사용 사례 선택: **기타** → **다음** 클릭
3. 앱 유형: **소비자** → **다음** 클릭
4. 아래 항목 입력:

   | 항목 | 입력값 |
   |------|--------|
   | **앱 표시 이름** | `Tetris Game` |
   | **앱 연락처 이메일** | 본인 이메일 |

5. **앱 만들기** 클릭 (보안 문자 입력 필요할 수 있음)

### 3-3. Facebook 로그인 제품 추가

1. 앱 대시보드 왼쪽 메뉴 → **제품 추가** (+ 아이콘)
2. **Facebook 로그인** 찾기 → **설정** 클릭
3. 플랫폼 선택 화면에서 **웹** 클릭
4. 사이트 URL 입력: `http://localhost:3000` → **Save** → **Continue** 계속 클릭하여 퀵스타트 완료

### 3-4. OAuth 리디렉션 URI 등록

1. 왼쪽 메뉴 → **Facebook 로그인** → **설정** 클릭
2. **유효한 OAuth 리디렉션 URI** 항목에 아래 URL 입력:

   ```
   https://nwigbtzpbjpsyaujvhkp.supabase.co/auth/v1/callback
   ```

3. **변경 내용 저장** 클릭

### 3-5. 앱 ID와 앱 시크릿 복사

1. 왼쪽 메뉴 → **설정** → **기본** 클릭
2. **앱 ID** 확인 (화면에 바로 보임)
3. **앱 시크릿 코드** 옆 **보기** 클릭 → 비밀번호 입력 후 확인 → 복사

### 3-6. Supabase에 Facebook 키 입력

1. [Supabase 대시보드](https://supabase.com/dashboard) → 프로젝트 선택
2. 왼쪽 사이드바 → **Authentication** → **Providers** 탭 클릭
3. **Facebook** 항목 찾기 → 클릭하여 펼치기
4. **Enable Sign in with Facebook** 토글 → **켜기**
5. 아래 항목 입력:

   | 항목 | 입력값 |
   |------|--------|
   | **App ID** | Facebook에서 복사한 앱 ID |
   | **App Secret** | Facebook에서 복사한 앱 시크릿 코드 |

6. **Save** 클릭

---

## 4. 연동 확인

### 로컬에서 테스트

1. 터미널에서 개발 서버 실행:

   ```bash
   cd C:/Projects/Nike
   npm run dev
   ```

2. 브라우저에서 `http://localhost:3000` 접속
3. **Google로 로그인** 버튼 클릭 → Google 계정 선택 화면이 뜨면 성공
4. 로그인 완료 후 → **닉네임 설정 화면** 등장 (처음 로그인 시)
5. 닉네임 입력 (3글자 이상) → **시작하기** → `/menu` 화면으로 이동하면 완료

### Supabase에서 유저 확인

1. Supabase 대시보드 → **Authentication** → **Users** 탭
2. 방금 로그인한 계정이 목록에 보이면 성공
3. `profiles` 테이블 (**Table Editor** → `profiles`)에도 row가 생성됐는지 확인

---

## 5. 자주 발생하는 오류

### "redirect_uri_mismatch" 오류 (Google)

**원인:** Google Cloud Console에 등록된 리디렉션 URI와 Supabase 콜백 URL이 다름

**해결:**
1. Google Cloud Console → 사용자 인증 정보 → OAuth 클라이언트 → 수정
2. 승인된 리디렉션 URI에 정확히 아래 URL이 있는지 확인:
   ```
   https://nwigbtzpbjpsyaujvhkp.supabase.co/auth/v1/callback
   ```
3. 오타 없이 저장 후 재시도

### "Invalid OAuth app" 오류 (Facebook)

**원인:** Facebook 앱이 개발 모드이고 테스트 계정이 아닌 계정으로 로그인 시도

**해결:**
- 개발 중: Facebook 앱 대시보드 → **역할** → **테스터** 에 로그인할 계정 추가
- 실서비스: 앱 검수 후 **라이브** 모드로 전환

### "Provider not enabled" 오류

**원인:** Supabase에서 해당 OAuth Provider가 비활성화 상태

**해결:**
Supabase 대시보드 → Authentication → Providers → Google/Facebook → Enable 토글 켜기 → Save

### 로그인 후 `/auth/callback`에서 멈추는 경우

**원인:** Supabase Redirect URL에 `http://localhost:3000/auth/callback`이 등록되지 않음

**해결:**
Supabase → Authentication → URL Configuration → Redirect URLs → `http://localhost:3000/auth/callback` 추가

### 배포 후 OAuth가 안 되는 경우

로컬에서는 됐지만 Vercel 배포 후 안 될 때:

1. Supabase → Authentication → URL Configuration → Redirect URLs에 추가:
   ```
   https://your-app.vercel.app/auth/callback
   ```
2. Google Cloud Console → 승인된 리디렉션 URI에 추가:
   ```
   https://nwigbtzpbjpsyaujvhkp.supabase.co/auth/v1/callback
   ```
   (이미 있으면 추가 불필요)
3. Facebook → 유효한 OAuth 리디렉션 URI에 추가:
   ```
   https://nwigbtzpbjpsyaujvhkp.supabase.co/auth/v1/callback
   ```
   (이미 있으면 추가 불필요)

---

## 완료 체크리스트

### Supabase
- [ ] Redirect URLs에 `http://localhost:3000/auth/callback` 추가

### Google
- [ ] Google Cloud Console 프로젝트 생성
- [ ] OAuth 동의 화면 설정 (외부, 테스트 사용자 추가)
- [ ] OAuth 클라이언트 ID 생성 (리디렉션 URI: Supabase 콜백 URL)
- [ ] Supabase → Providers → Google 활성화 + 키 입력

### Facebook
- [ ] Facebook 개발자 앱 생성
- [ ] Facebook 로그인 제품 추가
- [ ] 유효한 OAuth 리디렉션 URI에 Supabase 콜백 URL 등록
- [ ] Supabase → Providers → Facebook 활성화 + 키 입력

### 최종 확인
- [ ] 로컬에서 Google 로그인 테스트 성공
- [ ] 로컬에서 Facebook 로그인 테스트 성공
- [ ] 닉네임 설정 화면 정상 작동 확인
- [ ] Supabase Users 테이블에 유저 생성 확인
