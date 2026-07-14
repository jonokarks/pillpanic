import { CellType, Color, Orientation } from './constants';
import { Board } from '../entities/Board';

export interface Cell {
  type: CellType;
  color: Color | null;
  pillId?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Controllable {
  id: string;
  position: Position;
  isActive: boolean;
  isUserControllable: boolean;
  // Sub-cell fall progress (0..1) toward the next row; doubles as the lock
  // timer while a piece is resting on support
  fallOffset: number;
  // True while the player's finger is holding this piece (suspends gravity)
  held: boolean;
  fastDrop: boolean;
  // Loose half/capsule left after a clear — drops fast to settle chains
  debris: boolean;
  // Visual-only lean toward the finger while dragging, in cell fractions
  dragOffsetX: number;
  dragOffsetY: number;
  canMove(board: Board, dx: number, dy: number): boolean;
  move(dx: number, dy: number): void;
  canRotate(board: Board): boolean;
  rotate(): void;
  place(board: Board): void;
  getPositions(): Position[] | [Position, Position];
}

export interface Pill {
  id: string;
  position: Position;
  orientation: Orientation;
  colors: [Color, Color];
  isActive: boolean;
}

export interface Virus {
  position: Position;
  color: Color;
}

export interface GameBoard {
  cells: Cell[][];
}

export enum SpeedSetting {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum GameMode {
  // Level-based: clear all viruses to finish the level
  CLASSIC = 'CLASSIC',
  // Virus Buster style continuous play: clearing the board immediately
  // brings the next wave of viruses; the run ends only on game over
  ENDLESS = 'ENDLESS',
}

export interface GameStats {
  score: number;
  level: number;
  virusCount: number;
  linesCleared: number;
  capsulesPlaced: number;
  currentSpeedLevel: number;
  speedSetting: SpeedSetting;
}

export type GameFeedbackEvent =
  | { type: 'land' }
  | { type: 'match'; cleared: number; combo: number }
  | { type: 'wave'; level: number };

export interface SplitResult {
  position: Position;
  color: Color;
}

export interface SavedGameState {
  currentLevel: number;
  totalScore: number;
  speedSetting: SpeedSetting;
  lastPlayed: string;
}

// A resumable snapshot of an in-progress Endless run. Only occupied cells are
// stored; in-flight falling capsules are dropped and respawn fresh on load.
export interface EndlessCell {
  x: number;
  y: number;
  type: CellType;
  color: Color;
  pillId?: string;
}

export interface EndlessSnapshot {
  version: number;
  cells: EndlessCell[];
  score: number;
  wave: number;
  capsulesPlaced: number;
  speedSetting: SpeedSetting;
  nextColors: [Color, Color];
  lastPlayed: string;
}
