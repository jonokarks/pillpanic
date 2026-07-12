import { theme } from '../../utils/theme';

export const BOARD_WIDTH = 8;
export const BOARD_HEIGHT = 16;
export const CELL_SIZE = theme.dimensions.cellSize;

// Classic Dr. Mario speed system
export const BASE_FALL_SPEEDS = {
  LOW: 1200,    // slowest
  MEDIUM: 800,  // medium
  HIGH: 400,    // fastest
};

// Speed increases every 10 capsules placed (classic Dr. Mario behavior)
export const SPEED_INCREASE_INTERVAL = 10;
export const MAX_SPEED_INCREASES = 49; // Maximum of 50 speed levels total
export const SPEED_INCREASE_FACTOR = 0.95; // Each increase multiplies speed by this (makes it faster)

export const FAST_FALL_SPEED = 50; // Fast drop speed

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