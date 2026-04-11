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
