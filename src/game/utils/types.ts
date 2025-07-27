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

export interface GameStats {
  score: number;
  level: number;
  virusCount: number;
  linesCleared: number;
}

export interface SplitResult {
  position: Position;
  color: Color;
}