import { theme } from '../../utils/theme';

export const BOARD_WIDTH = 8;
export const BOARD_HEIGHT = 16;
export const CELL_SIZE = theme.dimensions.cellSize;
export const FALL_SPEED = 800; // milliseconds - slower for better control
export const FAST_FALL_SPEED = 80; // slightly slower for smoother fast drop

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