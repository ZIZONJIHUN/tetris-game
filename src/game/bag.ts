import { PieceType } from './types'

const ALL_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createBag(): PieceType[] {
  return shuffle(ALL_TYPES)
}

// 남은 피스가 7개 미만이면 새 bag을 뒤에 추가
export function refillBag(bag: PieceType[]): PieceType[] {
  if (bag.length >= 7) return bag
  return [...bag, ...createBag()]
}

// 다음 피스를 꺼내고 필요시 bag을 보충
export function popPiece(bag: PieceType[]): { piece: PieceType; bag: PieceType[] } {
  const filled = refillBag(bag)
  const [piece, ...rest] = filled
  return { piece, bag: rest }
}
