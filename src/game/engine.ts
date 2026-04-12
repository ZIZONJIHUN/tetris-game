import { GameState, Piece, PieceType } from './types'
import { getPieceCells, PIECE_ID, SPAWN_X, SPAWN_Y } from './pieces'
import { popPiece } from './bag'

// ────────────────────────────────────────────────────────────
// createEmptyBoard
// ────────────────────────────────────────────────────────────
export function createEmptyBoard(): number[][] {
  return Array.from({ length: 20 }, () => Array(10).fill(0))
}

// ────────────────────────────────────────────────────────────
// isValidPosition
// ────────────────────────────────────────────────────────────
export function isValidPosition(
  board: number[][],
  type: PieceType,
  rotation: 0 | 1 | 2 | 3,
  x: number,
  y: number,
): boolean {
  const cells = getPieceCells(type, rotation, x, y)
  for (const { r, c } of cells) {
    // Must be within horizontal bounds
    if (c < 0 || c >= 10) return false
    // Must not be below the floor
    if (r >= 20) return false
    // If on the board, must not collide
    if (r >= 0 && board[r][c] !== 0) return false
    // r < 0 is above the board — allowed
  }
  return true
}

// ────────────────────────────────────────────────────────────
// calcGhostY
// ────────────────────────────────────────────────────────────
export function calcGhostY(
  board: number[][],
  type: PieceType,
  rotation: 0 | 1 | 2 | 3,
  x: number,
  y: number,
): number {
  let ghostY = y
  while (isValidPosition(board, type, rotation, x, ghostY + 1)) {
    ghostY++
  }
  return ghostY
}

// ────────────────────────────────────────────────────────────
// createInitialState
// ────────────────────────────────────────────────────────────
export function createInitialState(bag: PieceType[]): GameState {
  const board = createEmptyBoard()

  // Pop current piece
  const { piece: currentType, bag: bag1 } = popPiece(bag)

  // Pop 3 next pieces
  const { piece: next0Type, bag: bag2 } = popPiece(bag1)
  const { piece: next1Type, bag: bag3 } = popPiece(bag2)
  const { piece: next2Type, bag: bag4 } = popPiece(bag3)

  const currentPiece: Piece = {
    type: currentType,
    rotation: 0,
    x: SPAWN_X,
    y: SPAWN_Y,
  }

  const nextPieces: Piece[] = [
    { type: next0Type, rotation: 0, x: SPAWN_X, y: SPAWN_Y },
    { type: next1Type, rotation: 0, x: SPAWN_X, y: SPAWN_Y },
    { type: next2Type, rotation: 0, x: SPAWN_X, y: SPAWN_Y },
  ]

  const ghostY = calcGhostY(board, currentType, 0, SPAWN_X, SPAWN_Y)

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
  }
}

// ────────────────────────────────────────────────────────────
// lockPiece
// ────────────────────────────────────────────────────────────
export function lockPiece(state: GameState): GameState {
  const { currentPiece, board } = state
  const { type, rotation, x, y } = currentPiece

  // Deep-copy the board
  const newBoard = board.map(row => [...row])

  const cells = getPieceCells(type, rotation, x, y)
  const id = PIECE_ID[type]

  for (const { r, c } of cells) {
    if (r < 0) continue // above board — skip
    newBoard[r][c] = id
  }

  return {
    ...state,
    board: newBoard,
    holdUsed: false,
  }
}

// ────────────────────────────────────────────────────────────
// clearLines
// ────────────────────────────────────────────────────────────
export function clearLines(board: number[][]): { board: number[][]; linesCleared: number } {
  const surviving = board
    .filter(row => row.some(cell => cell === 0))
    .map(row => [...row])
  const linesCleared = board.length - surviving.length
  const emptyRows = Array.from({ length: linesCleared }, () => Array(10).fill(0))
  return {
    board: [...emptyRows, ...surviving],
    linesCleared,
  }
}
