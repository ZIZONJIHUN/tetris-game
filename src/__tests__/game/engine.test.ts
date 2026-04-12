import {
  createEmptyBoard,
  createInitialState,
  isValidPosition,
  lockPiece,
  clearLines,
  calcGhostY,
  calcScore,
  calcLevel,
  calcSpeed,
  startGame,
  moveLeft,
  moveRight,
  softDrop,
  hardDrop,
  rotateClockwise,
  rotateCounterClockwise,
  hold,
  tick,
} from '../../game/engine'
import { createBag } from '../../game/bag'
import { SPAWN_X, SPAWN_Y, PIECE_ID } from '../../game/pieces'
import { GameState } from '../../game/types'

// Helper: build a filled row
function filledRow(): number[] {
  return Array(10).fill(1)
}

// Helper: build an empty row
function emptyRow(): number[] {
  return Array(10).fill(0)
}

describe('createEmptyBoard', () => {
  it('creates 20×10 board of zeros', () => {
    const board = createEmptyBoard()
    expect(board).toHaveLength(20)
    for (const row of board) {
      expect(row).toHaveLength(10)
      expect(row.every(cell => cell === 0)).toBe(true)
    }
  })

  it('returns independent rows (not same reference)', () => {
    const board = createEmptyBoard()
    board[0][0] = 9
    expect(board[1][0]).toBe(0)
  })
})

describe('isValidPosition', () => {
  it('valid spawn position for T piece', () => {
    const board = createEmptyBoard()
    expect(isValidPosition(board, 'T', 0, SPAWN_X, SPAWN_Y)).toBe(true)
  })

  it('rejects out-of-bounds left', () => {
    const board = createEmptyBoard()
    // Move piece far left so cells go below column 0
    expect(isValidPosition(board, 'T', 0, -2, 5)).toBe(false)
  })

  it('rejects out-of-bounds right', () => {
    const board = createEmptyBoard()
    // T piece is 3 wide; placing at x=9 pushes cells to c=11
    expect(isValidPosition(board, 'T', 0, 9, 5)).toBe(false)
  })

  it('rejects below board floor', () => {
    const board = createEmptyBoard()
    // I piece rotation 0: filled cells are at matrix row 1 (r = y+1).
    // At y=19 → r=20 which is >= 20, out of bounds.
    expect(isValidPosition(board, 'I', 0, SPAWN_X, 19)).toBe(false)
  })

  it('rejects collision with locked piece', () => {
    const board = createEmptyBoard()
    // Place a block at row 5, col 4
    board[5][4] = 1
    // T rotation 0 at x=3, y=4: cells at (4,3),(4,4),(4,5),(5,4) — (5,4) collides
    expect(isValidPosition(board, 'T', 0, 3, 4)).toBe(false)
  })

  it('allows piece above board (r < 0)', () => {
    const board = createEmptyBoard()
    // SPAWN_Y = -1, piece rows above board should be allowed
    expect(isValidPosition(board, 'T', 0, SPAWN_X, SPAWN_Y)).toBe(true)
  })
})

describe('lockPiece', () => {
  function makeState(): GameState {
    const bag = createBag()
    return createInitialState(bag)
  }

  it('places piece cells on board with correct PIECE_ID', () => {
    const state = makeState()
    // Move piece fully onto the board
    const stateOnBoard: GameState = {
      ...state,
      currentPiece: { ...state.currentPiece, y: 10 },
    }
    const newState = lockPiece(stateOnBoard)
    const type = stateOnBoard.currentPiece.type
    const id = PIECE_ID[type]
    // At least one cell should be set to the piece's ID
    const hasCell = newState.board.some(row => row.some(cell => cell === id))
    expect(hasCell).toBe(true)
  })

  it('returns new state (immutable)', () => {
    const state = makeState()
    const stateOnBoard: GameState = {
      ...state,
      currentPiece: { ...state.currentPiece, y: 10 },
    }
    const newState = lockPiece(stateOnBoard)
    expect(newState).not.toBe(stateOnBoard)
    expect(newState.board).not.toBe(stateOnBoard.board)
  })

  it('does not mutate original board', () => {
    const state = makeState()
    const stateOnBoard: GameState = {
      ...state,
      currentPiece: { ...state.currentPiece, y: 10 },
    }
    const originalBoard = stateOnBoard.board.map(row => [...row])
    lockPiece(stateOnBoard)
    // Original board should be unchanged
    for (let r = 0; r < 20; r++) {
      expect(stateOnBoard.board[r]).toEqual(originalBoard[r])
    }
  })

  it('skips cells above board (r < 0)', () => {
    const state = makeState()
    // Keep piece at spawn (y = SPAWN_Y = -1): some cells are above board
    const newState = lockPiece(state)
    // Row 0 might have cells but no row should throw; board still 20 rows
    expect(newState.board).toHaveLength(20)
  })

  it('resets holdUsed to false', () => {
    const state = makeState()
    const stateHoldUsed: GameState = {
      ...state,
      holdUsed: true,
      currentPiece: { ...state.currentPiece, y: 10 },
    }
    const newState = lockPiece(stateHoldUsed)
    expect(newState.holdUsed).toBe(false)
  })
})

describe('clearLines', () => {
  it('clears a single full row', () => {
    const board = createEmptyBoard()
    board[19] = filledRow()
    const { board: newBoard, linesCleared } = clearLines(board)
    expect(linesCleared).toBe(1)
    expect(newBoard).toHaveLength(20)
    // The previously full row should be gone; top row should be empty
    expect(newBoard[0]).toEqual(emptyRow())
    // No row should be fully filled anymore
    const stillFull = newBoard.some(row => row.every(cell => cell !== 0))
    expect(stillFull).toBe(false)
  })

  it('clears multiple full rows', () => {
    const board = createEmptyBoard()
    board[17] = filledRow()
    board[18] = filledRow()
    board[19] = filledRow()
    const { board: newBoard, linesCleared } = clearLines(board)
    expect(linesCleared).toBe(3)
    expect(newBoard).toHaveLength(20)
    // Top 3 rows should now be empty
    expect(newBoard[0]).toEqual(emptyRow())
    expect(newBoard[1]).toEqual(emptyRow())
    expect(newBoard[2]).toEqual(emptyRow())
  })

  it('returns linesCleared count', () => {
    const board = createEmptyBoard()
    board[10] = filledRow()
    board[15] = filledRow()
    const { linesCleared } = clearLines(board)
    expect(linesCleared).toBe(2)
  })

  it('does not clear partial rows', () => {
    const board = createEmptyBoard()
    // Row 19 has a gap at column 5
    board[19] = filledRow()
    board[19][5] = 0
    const { board: newBoard, linesCleared } = clearLines(board)
    expect(linesCleared).toBe(0)
    expect(newBoard[19]).toEqual(board[19])
  })

  it('does not mutate original board', () => {
    const board = createEmptyBoard()
    board[19] = filledRow()
    const original = board[19].slice()
    clearLines(board)
    expect(board[19]).toEqual(original)
  })

  it('returned rows are not aliased to original rows', () => {
    const board = createEmptyBoard()
    board[19][0] = 1 // partial row — survives
    const { board: newBoard } = clearLines(board)
    // Different reference
    expect(newBoard[newBoard.length - 1]).not.toBe(board[19])
    // Mutation of returned board must not affect original
    newBoard[newBoard.length - 1][0] = 99
    expect(board[19][0]).toBe(1)
  })
})

describe('calcGhostY', () => {
  it('drops to floor on empty board', () => {
    const board = createEmptyBoard()
    // I piece rotation 0: filled cells are at matrix row 1 (r = y + 1).
    // Last valid y is when y+1 = 19, i.e. y = 18. y=19 would put cells at r=20 (invalid).
    const ghostY = calcGhostY(board, 'I', 0, SPAWN_X, SPAWN_Y)
    expect(ghostY).toBe(18)
  })

  it('stops above locked piece', () => {
    const board = createEmptyBoard()
    // Fill row 10 as a barrier
    board[10] = filledRow()
    // I piece rotation 0, matrix row 1 is filled. Stops when row 1+y+1 = 10, so y+1 = 9, y = 9...
    // Actually: piece cells are at r = y + matrixRow. For I rot 0, filled at matrixRow=1.
    // Valid as long as r < 20 and board[r][c] === 0.
    // board[10] is filled, so y+1 = 10 → y = 9 is invalid, y = 8 is last valid.
    const ghostY = calcGhostY(board, 'I', 0, SPAWN_X, SPAWN_Y)
    expect(ghostY).toBe(8)
  })
})

describe('calcScore', () => {
  it('returns 0 for 0 lines cleared', () => {
    expect(calcScore(0, 1, 0)).toBe(0)
  })

  it('returns 100 for 1 line at level 1', () => {
    expect(calcScore(1, 1, 0)).toBe(100)
  })

  it('returns 300 for 2 lines at level 1', () => {
    expect(calcScore(2, 1, 0)).toBe(300)
  })

  it('returns 500 for 3 lines at level 1', () => {
    expect(calcScore(3, 1, 0)).toBe(500)
  })

  it('returns 800 for 4 lines at level 1', () => {
    expect(calcScore(4, 1, 0)).toBe(800)
  })

  it('returns 2400 for 4 lines at level 3', () => {
    expect(calcScore(4, 3, 0)).toBe(2400)
  })

  it('adds dropBonus to score', () => {
    expect(calcScore(1, 1, 50)).toBe(150)
    expect(calcScore(4, 2, 100)).toBe(1700)
  })

  it('returns dropBonus for 0 lines', () => {
    expect(calcScore(0, 1, 50)).toBe(50)
    expect(calcScore(0, 5, 123)).toBe(123)
  })
})

describe('calcLevel', () => {
  it('returns 1 for 0 lines', () => {
    expect(calcLevel(0)).toBe(1)
  })

  it('returns 1 for 9 lines', () => {
    expect(calcLevel(9)).toBe(1)
  })

  it('returns 2 for 10 lines', () => {
    expect(calcLevel(10)).toBe(2)
  })

  it('returns 2 for 19 lines', () => {
    expect(calcLevel(19)).toBe(2)
  })

  it('returns 3 for 20 lines', () => {
    expect(calcLevel(20)).toBe(3)
  })
})

describe('calcSpeed', () => {
  it('returns 1000 for level 1', () => {
    expect(calcSpeed(1)).toBe(1000)
  })

  it('returns 920 for level 2', () => {
    expect(calcSpeed(2)).toBe(920)
  })

  it('returns 120 for level 12', () => {
    expect(calcSpeed(12)).toBe(120)
  })

  it('returns 100 for level 13 (capped)', () => {
    expect(calcSpeed(13)).toBe(100)
  })

  it('returns 100 for level 20 (still capped)', () => {
    expect(calcSpeed(20)).toBe(100)
  })
})

// ─── Player Action Tests ───────────────────────────────────────────────────

// Helper: creates a playing state
function playingState() {
  return startGame(createInitialState(createBag()))
}

describe('startGame', () => {
  it('sets status to playing', () => {
    const state = createInitialState(createBag())
    expect(startGame(state).status).toBe('playing')
  })
})

describe('moveLeft', () => {
  it('decrements x when valid', () => {
    const s = playingState()
    expect(moveLeft(s).currentPiece.x).toBe(s.currentPiece.x - 1)
  })
  it('does not move when blocked by wall', () => {
    const s = playingState()
    // Move left until blocked
    let cur = s
    for (let i = 0; i < 10; i++) cur = moveLeft(cur)
    const blocked = moveLeft(cur)
    expect(blocked.currentPiece.x).toBe(cur.currentPiece.x)
  })
  it('returns state unchanged when not playing', () => {
    const s = createInitialState(createBag()) // status = 'idle'
    expect(moveLeft(s)).toBe(s)
  })
})

describe('moveRight', () => {
  it('increments x when valid', () => {
    const s = playingState()
    expect(moveRight(s).currentPiece.x).toBe(s.currentPiece.x + 1)
  })
  it('does not move when blocked by wall', () => {
    const s = playingState()
    let cur = s
    for (let i = 0; i < 10; i++) cur = moveRight(cur)
    const blocked = moveRight(cur)
    expect(blocked.currentPiece.x).toBe(cur.currentPiece.x)
  })
})

describe('softDrop', () => {
  it('increments y when valid', () => {
    const s = playingState()
    expect(softDrop(s).currentPiece.y).toBe(s.currentPiece.y + 1)
  })
  it('adds 1 to score per cell dropped', () => {
    const s = playingState()
    const dropped = softDrop(s)
    expect(dropped.score).toBe(s.score + 1)
  })
})

describe('hardDrop', () => {
  it('spawns next piece after drop', () => {
    const s = playingState()
    const dropped = hardDrop(s)
    expect(dropped.currentPiece.type).toBe(s.nextPieces[0].type)
  })
  it('adds 2 * distance to score', () => {
    const s = playingState()
    const distance = s.ghostY - s.currentPiece.y
    const dropped = hardDrop(s)
    expect(dropped.score).toBeGreaterThanOrEqual(distance * 2)
  })
})

describe('rotateClockwise', () => {
  it('increments rotation mod 4', () => {
    const s = playingState()
    const rotated = rotateClockwise(s)
    expect(rotated.currentPiece.rotation).toBe((s.currentPiece.rotation + 1) % 4)
  })
})

describe('rotateCounterClockwise', () => {
  it('decrements rotation mod 4', () => {
    const s = playingState()
    const rotated = rotateCounterClockwise(s)
    expect(rotated.currentPiece.rotation).toBe((s.currentPiece.rotation + 3) % 4)
  })
})

describe('hold', () => {
  it('sets holdPiece to currentPiece type', () => {
    const s = playingState()
    const held = hold(s)
    expect(held.holdPiece?.type).toBe(s.currentPiece.type)
  })
  it('swaps currentPiece with nextPieces[0] on first hold', () => {
    const s = playingState()
    const held = hold(s)
    expect(held.currentPiece.type).toBe(s.nextPieces[0].type)
  })
  it('cannot hold twice in a row', () => {
    const s = playingState()
    const held = hold(s)
    const heldAgain = hold(held)
    expect(heldAgain.currentPiece.type).toBe(held.currentPiece.type)
  })
  it('swaps currentPiece with holdPiece on second hold', () => {
    // hold → lock a piece → hold again to trigger swap
    const s = playingState()
    const held = hold(s) // hold first piece
    const dropped = hardDrop(held) // lock to reset holdUsed
    const swapped = hold(dropped)
    expect(swapped.currentPiece.type).toBe(held.holdPiece?.type)
  })
})

describe('tick', () => {
  it('moves piece down by 1', () => {
    const s = playingState()
    expect(tick(s).currentPiece.y).toBe(s.currentPiece.y + 1)
  })
  it('spawns next piece when cannot move down', () => {
    const s = playingState()
    const atBottom = { ...s, currentPiece: { ...s.currentPiece, y: s.ghostY } }
    const ticked = tick(atBottom)
    expect(ticked.currentPiece.type).toBe(s.nextPieces[0].type)
  })
  it('sets status to over when new piece cannot spawn', () => {
    const s = playingState()
    // Fill all rows with partial rows (not full, so clearLines won't remove them)
    // Columns 3-6 are filled — blocks all piece spawns at SPAWN_X=3 with rotation 0
    const blockedRow = [0, 0, 0, 1, 1, 1, 1, 0, 0, 0]
    const fullBoard = s.board.map(() => [...blockedRow])
    // Place current piece at bottom of its valid range on the new board
    // Find the lowest valid y on the new board
    const { type, rotation, x } = s.currentPiece
    let testY = s.currentPiece.y
    while (isValidPosition(fullBoard, type, rotation, x, testY + 1)) {
      testY++
    }
    const atBottom = { ...s, board: fullBoard, currentPiece: { ...s.currentPiece, y: testY } }
    const ticked = tick(atBottom)
    expect(ticked.status).toBe('over')
  })
  it('returns state unchanged when not playing', () => {
    const s = createInitialState(createBag())
    expect(tick(s)).toBe(s)
  })
})
