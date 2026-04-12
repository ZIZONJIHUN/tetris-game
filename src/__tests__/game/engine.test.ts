import {
  createEmptyBoard,
  createInitialState,
  isValidPosition,
  lockPiece,
  clearLines,
  calcGhostY,
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
