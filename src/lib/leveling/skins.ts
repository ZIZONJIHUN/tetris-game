// src/lib/leveling/skins.ts
export type SkinKey = 'gold_block' | 'neon_pink' | 'dark_board' | 'galaxy_board' | 'silver_board' | 'gold_board'

// Block-tinting skins override the per-piece color palette.
export const BLOCK_SKIN_COLORS: Partial<Record<SkinKey, string>> = {
  gold_block: '#ffd700',
  neon_pink:  '#ff00aa',
}

// Board-background skins override the board's surface CSS.
export const BOARD_SKIN_BACKGROUND: Partial<Record<SkinKey, string>> = {
  dark_board:    'radial-gradient(circle at 50% 0%, #0a0a18 0%, #000 100%)',
  galaxy_board:  'radial-gradient(ellipse at 30% 20%, #2a1a4a 0%, #0a0014 60%, #000 100%)',
  silver_board:  'linear-gradient(180deg, #1a1a22 0%, #000 100%)',
  gold_board:    'linear-gradient(180deg, #2a1f00 0%, #000 100%)',
}
