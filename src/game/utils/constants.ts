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
// baseConcurrent: capsules kept airborne together from the start of a run
// maxConcurrent: cap on simultaneous capsules for this difficulty
// concurrencyThresholds: capsulesPlaced counts at which one more
//   simultaneous capsule starts appearing (ramps baseConcurrent -> max)
export const DIFFICULTY_SETTINGS = {
  LOW: {
    fallSpeed: 1450,
    spawnCooldownMs: 1000,
    baseConcurrent: 1,
    maxConcurrent: 2,
    concurrencyThresholds: [18],
  },
  MEDIUM: {
    fallSpeed: 1150,
    spawnCooldownMs: 760,
    baseConcurrent: 2,
    maxConcurrent: 3,
    concurrencyThresholds: [16],
  },
  HIGH: {
    fallSpeed: 950,
    spawnCooldownMs: 560,
    baseConcurrent: 2,
    maxConcurrent: 4,
    concurrencyThresholds: [8, 20],
  },
};

export const FAST_FALL_SPEED = 50; // Fast drop speed
// Loose halves left after a clear drop quicker than a capsule so chains settle
// briskly, but stay slow enough that the player can still grab and steer them
// into combos (a Germ Buster hallmark).
export const DEBRIS_FALL_SPEED = 280;

// Endless mode: after the last germ is cleared, the leftover capsules wipe
// off the tray and there's a short beat before the next germs appear
export const WAVE_CLEAR_DELAY_MS = 520;

// Germ Buster (Virus Buster) style continuous spawning:
// a new capsule enters while others are still falling
export const SPAWN_GAP_ROWS = 3; // newest capsule must fall this far before the next enters
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