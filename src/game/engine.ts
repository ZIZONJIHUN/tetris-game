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

// ────────────────────────────────────────────────────────────
// calcScore
// ────────────────────────────────────────────────────────────
export function calcScore(linesCleared: number, level: number, dropBonus: number): number {
  const baseScores: Record<number, number> = {
    0: 0,
    1: 100,
    2: 300,
    3: 500,
    4: 800,
  }
  const base = baseScores[linesCleared] ?? 0
  return base * level + dropBonus
}

// ────────────────────────────────────────────────────────────
// calcLevel
// ────────────────────────────────────────────────────────────
export function calcLevel(lines: number): number {
  return Math.floor(lines / 10) + 1
}

// ────────────────────────────────────────────────────────────
// calcSpeed
// ────────────────────────────────────────────────────────────
export function calcSpeed(level: number): number {
  return Math.max(100, 1000 - (level - 1) * 80)
}

// ────────────────────────────────────────────────────────────
// lockAndSpawn (private helper)
// ────────────────────────────────────────────────────────────
function lockAndSpawn(state: GameState): GameState {
  // 1. Lock current piece onto the board
  const lockedState = lockPiece(state)

  // 2. Clear completed lines
  const { board: clearedBoard, linesCleared } = clearLines(lockedState.board)

  // 3. Recalculate lines, level, score, speed
  const newLines = state.lines + linesCleared
  const newLevel = calcLevel(newLines)
  const newScore = lockedState.score + calcScore(linesCleared, newLevel, 0)
  const newSpeed = calcSpeed(newLevel)

  // 4. Spawn next piece (reset to spawn position)
  const newCurrentPiece: Piece = {
    ...state.nextPieces[0],
    rotation: 0,
    x: SPAWN_X,
    y: SPAWN_Y,
  }

  // 5. Pop a new piece for the queue
  const { piece: newNextType, bag: newBag } = popPiece(state.pieceBag)
  const newNextPieces: Piece[] = [
    ...state.nextPieces.slice(1),
    { type: newNextType, rotation: 0, x: SPAWN_X, y: SPAWN_Y },
  ]

  // 6. Check game over
  const isOver = !isValidPosition(clearedBoard, newCurrentPiece.type, 0, SPAWN_X, SPAWN_Y)
  const ghostY = isOver
    ? SPAWN_Y
    : calcGhostY(clearedBoard, newCurrentPiece.type, 0, SPAWN_X, SPAWN_Y)

  return {
    ...lockedState,
    board: clearedBoard,
    currentPiece: newCurrentPiece,
    nextPieces: newNextPieces,
    pieceBag: newBag,
    ghostY,
    score: newScore,
    lines: newLines,
    level: newLevel,
    speed: newSpeed,
    status: isOver ? 'over' : state.status,
    flashRows: [],
  }
}

// ────────────────────────────────────────────────────────────
// startGame
// ────────────────────────────────────────────────────────────
export function startGame(state: GameState): GameState {
  return { ...state, status: 'playing' }
}

// ────────────────────────────────────────────────────────────
// moveLeft
// ────────────────────────────────────────────────────────────
export function moveLeft(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const { currentPiece, board } = state
  const newX = currentPiece.x - 1
  if (!isValidPosition(board, currentPiece.type, currentPiece.rotation, newX, currentPiece.y)) {
    return state
  }
  const newPiece = { ...currentPiece, x: newX }
  return {
    ...state,
    currentPiece: newPiece,
    ghostY: calcGhostY(board, newPiece.type, newPiece.rotation, newX, newPiece.y),
  }
}

// ────────────────────────────────────────────────────────────
// moveRight
// ────────────────────────────────────────────────────────────
export function moveRight(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const { currentPiece, board } = state
  const newX = currentPiece.x + 1
  if (!isValidPosition(board, currentPiece.type, currentPiece.rotation, newX, currentPiece.y)) {
    return state
  }
  const newPiece = { ...currentPiece, x: newX }
  return {
    ...state,
    currentPiece: newPiece,
    ghostY: calcGhostY(board, newPiece.type, newPiece.rotation, newX, newPiece.y),
  }
}

// ────────────────────────────────────────────────────────────
// softDrop
// ────────────────────────────────────────────────────────────
export function softDrop(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const { currentPiece, board } = state
  const newY = currentPiece.y + 1
  if (!isValidPosition(board, currentPiece.type, currentPiece.rotation, currentPiece.x, newY)) {
    return lockAndSpawn(state)
  }
  const newPiece = { ...currentPiece, y: newY }
  return {
    ...state,
    currentPiece: newPiece,
    score: state.score + 1,
    ghostY: calcGhostY(board, newPiece.type, newPiece.rotation, newPiece.x, newY),
  }
}

// ────────────────────────────────────────────────────────────
// hardDrop
// ────────────────────────────────────────────────────────────
export function hardDrop(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const { currentPiece, ghostY } = state
  const distance = ghostY - currentPiece.y
  const bonus = distance * 2
  const droppedState: GameState = {
    ...state,
    currentPiece: { ...currentPiece, y: ghostY },
    score: state.score + bonus,
  }
  return lockAndSpawn(droppedState)
}

// ────────────────────────────────────────────────────────────
// rotateClockwise
// ────────────────────────────────────────────────────────────
export function rotateClockwise(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const { currentPiece, board } = state
  const newRotation = ((currentPiece.rotation + 1) % 4) as 0 | 1 | 2 | 3
  const { x, y, type } = currentPiece

  // Try original position first
  if (isValidPosition(board, type, newRotation, x, y)) {
    const newPiece = { ...currentPiece, rotation: newRotation }
    return {
      ...state,
      currentPiece: newPiece,
      ghostY: calcGhostY(board, type, newRotation, x, y),
    }
  }

  // Wall kicks: try x offsets
  for (const dx of [-1, 1, -2, 2]) {
    const kickX = x + dx
    if (isValidPosition(board, type, newRotation, kickX, y)) {
      const newPiece = { ...currentPiece, rotation: newRotation, x: kickX }
      return {
        ...state,
        currentPiece: newPiece,
        ghostY: calcGhostY(board, type, newRotation, kickX, y),
      }
    }
  }

  return state
}

// ────────────────────────────────────────────────────────────
// rotateCounterClockwise
// ────────────────────────────────────────────────────────────
export function rotateCounterClockwise(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const { currentPiece, board } = state
  const newRotation = ((currentPiece.rotation + 3) % 4) as 0 | 1 | 2 | 3
  const { x, y, type } = currentPiece

  // Try original position first
  if (isValidPosition(board, type, newRotation, x, y)) {
    const newPiece = { ...currentPiece, rotation: newRotation }
    return {
      ...state,
      currentPiece: newPiece,
      ghostY: calcGhostY(board, type, newRotation, x, y),
    }
  }

  // Wall kicks: try x offsets
  for (const dx of [-1, 1, -2, 2]) {
    const kickX = x + dx
    if (isValidPosition(board, type, newRotation, kickX, y)) {
      const newPiece = { ...currentPiece, rotation: newRotation, x: kickX }
      return {
        ...state,
        currentPiece: newPiece,
        ghostY: calcGhostY(board, type, newRotation, kickX, y),
      }
    }
  }

  return state
}

// ────────────────────────────────────────────────────────────
// hold
// ────────────────────────────────────────────────────────────
export function hold(state: GameState): GameState {
  if (state.status !== 'playing' || state.holdUsed) return state

  const { currentPiece, holdPiece, nextPieces, pieceBag, board } = state

  let newCurrentPiece: Piece
  let newHoldPiece: Piece
  let newNextPieces: Piece[]
  let newBag: PieceType[]

  if (holdPiece === null) {
    // No held piece: take from nextPieces[0]
    newHoldPiece = { type: currentPiece.type, rotation: 0, x: SPAWN_X, y: SPAWN_Y }
    newCurrentPiece = { type: nextPieces[0].type, rotation: 0, x: SPAWN_X, y: SPAWN_Y }
    const { piece: newNextType, bag: updatedBag } = popPiece(pieceBag)
    newBag = updatedBag
    newNextPieces = [
      ...nextPieces.slice(1),
      { type: newNextType, rotation: 0, x: SPAWN_X, y: SPAWN_Y },
    ]
  } else {
    // Swap currentPiece with holdPiece
    newHoldPiece = { type: currentPiece.type, rotation: 0, x: SPAWN_X, y: SPAWN_Y }
    newCurrentPiece = { type: holdPiece.type, rotation: 0, x: SPAWN_X, y: SPAWN_Y }
    newNextPieces = nextPieces
    newBag = pieceBag
  }

  const ghostY = calcGhostY(board, newCurrentPiece.type, 0, SPAWN_X, SPAWN_Y)

  return {
    ...state,
    currentPiece: newCurrentPiece,
    holdPiece: newHoldPiece,
    holdUsed: true,
    nextPieces: newNextPieces,
    pieceBag: newBag,
    ghostY,
  }
}

// ────────────────────────────────────────────────────────────
// tick
// ────────────────────────────────────────────────────────────
export function tick(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const { currentPiece, board } = state
  const newY = currentPiece.y + 1
  if (!isValidPosition(board, currentPiece.type, currentPiece.rotation, currentPiece.x, newY)) {
    return lockAndSpawn(state)
  }
  const newPiece = { ...currentPiece, y: newY }
  return {
    ...state,
    currentPiece: newPiece,
    ghostY: calcGhostY(board, newPiece.type, newPiece.rotation, newPiece.x, newY),
  }
}
