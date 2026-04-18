export type Lang = 'en' | 'ko'

export const translations = {
  en: {
    // Home
    guestPlay: 'GUEST PLAY',
    login: 'LOGIN',
    signUp: 'SIGN UP',
    nickname: 'NICKNAME',
    email: 'EMAIL',
    password: 'PASSWORD',
    start: 'START',
    back: '← Back',
    // Game
    hold: 'HOLD',
    next: 'NEXT',
    score: 'SCORE',
    level: 'LEVEL',
    lines: 'LINES',
    time: 'TIME',
    gameOver: 'GAME OVER',
    retry: 'RETRY',
    // Battle
    win: 'WIN',
    lose: 'LOSE',
    draw: 'DRAW',
    waitingOpponent: 'Waiting for opponent...',
    backToLobby: 'Back to Lobby',
    // Lobby
    randomMatch: 'RANDOM MATCH',
    createRoom: 'CREATE ROOM',
    roomCode: 'ROOM CODE',
    join: 'JOIN',
    searching: 'Searching for opponent...',
    cancel: 'Cancel',
    // Settings
    settings: 'Settings',
    language: 'Language',
    logout: 'Logout',
    logoutConfirm: 'Are you sure?',
  },
  ko: {
    // Home
    guestPlay: '게스트 플레이',
    login: '로그인',
    signUp: '회원가입',
    nickname: '닉네임',
    email: '이메일',
    password: '비밀번호',
    start: '시작',
    back: '← 뒤로',
    // Game
    hold: '홀드',
    next: '다음',
    score: '점수',
    level: '레벨',
    lines: '라인',
    time: '시간',
    gameOver: '게임 오버',
    retry: '다시하기',
    // Battle
    win: '승리',
    lose: '패배',
    draw: '무승부',
    waitingOpponent: '상대방을 기다리는 중...',
    backToLobby: '로비로 돌아가기',
    // Lobby
    randomMatch: '랜덤 매칭',
    createRoom: '방 만들기',
    roomCode: '방 코드',
    join: '입장',
    searching: '상대방 탐색 중...',
    cancel: '취소',
    // Settings
    settings: '설정',
    language: '언어',
    logout: '로그아웃',
    logoutConfirm: '정말 로그아웃할까요?',
  },
} satisfies Record<Lang, Record<string, string>>

export type TranslationKey = keyof typeof translations.en
