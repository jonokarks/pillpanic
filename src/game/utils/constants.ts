import { theme } from '../../utils/theme';

export const BOARD_WIDTH = 8;
export const BOARD_HEIGHT = 16;
export const CELL_SIZE = theme.dimensions.cellSize;

// Germ Buster (Virus Buster) difficulty model: the fall speed stays gentle
// and constant — difficulty comes from how MANY capsules are airborne at
// once and how quickly new ones are added, not from speeding up.
//
// fallSpeed: ms per row while drifting down
// spawnCooldownMs: minimum gap between two capsules entering
// maxConcurrent: cap on simultaneous capsules for this difficulty
// concurrencyThresholds: capsulesPlaced counts at which one more
//   simultaneous capsule starts appearing (ramps 1 -> maxConcurrent)
export const DIFFICULTY_SETTINGS = {
  LOW: {
    fallSpeed: 1100,
    spawnCooldownMs: 900,
    maxConcurrent: 2,
    concurrencyThresholds: [15],
  },
  MEDIUM: {
    fallSpeed: 950,
    spawnCooldownMs: 600,
    maxConcurrent: 3,
    concurrencyThresholds: [8, 20],
  },
  HIGH: {
    fallSpeed: 850,
    spawnCooldownMs: 450,
    maxConcurrent: 4,
    concurrencyThresholds: [5, 12, 24],
  },
};

export const FAST_FALL_SPEED = 50; // Fast drop speed

// Germ Buster (Virus Buster) style continuous spawning:
// a new capsule enters while others are still falling
export const SPAWN_GAP_ROWS = 4; // newest capsule must fall this far before the next enters
export const MAX_CONCURRENT_PILLS = 4;
// A piece released while resting on support locks after the remaining
// (1 - GROUNDED_RELEASE_LOCK) fraction of a fall interval
export const GROUNDED_RELEASE_LOCK = 0.6;
export const SPAWN_X = 3; // entry column (capsule occupies SPAWN_X and SPAWN_X + 1)

// Classic Dr. Mario virus count formula
export const getVirusCount = (level: number): number => {
  if (level >= 20) return 84; // Level 20+ always has 84 viruses
  return (level * 4) + 4; // Classic formula: (level * 4) + 4
};

export enum CellType {
  EMPTY = 'EMPTY',
  VIRUS = 'VIRUS',
  PILL = 'PILL',
}

export enum Color {
  RED = 'RED',
  BLUE = 'BLUE',
  YELLOW = 'YELLOW',
}

export const COLOR_VALUES = {
  [Color.RED]: theme.colors.primary.red,
  [Color.BLUE]: theme.colors.secondary.blue,
  [Color.YELLOW]: theme.colors.tertiary.yellow,
};

export const COLOR_GRADIENTS = {
  [Color.RED]: theme.colors.pill.red,
  [Color.BLUE]: theme.colors.pill.blue,
  [Color.YELLOW]: theme.colors.pill.yellow,
};

export const VIRUS_GRADIENTS = {
  [Color.RED]: theme.colors.virus.red,
  [Color.BLUE]: theme.colors.virus.blue,
  [Color.YELLOW]: theme.colors.virus.yellow,
};

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
}

export enum Direction {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  DOWN = 'DOWN',
}

export enum Orientation {
  HORIZONTAL = 'HORIZONTAL',
  VERTICAL = 'VERTICAL',
}