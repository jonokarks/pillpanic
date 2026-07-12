import { Color, CellType } from '../utils/constants';
import { Position, Controllable } from '../utils/types';
import { Board } from './Board';

export class SinglePill implements Controllable {
  id: string;
  position: Position;
  color: Color;
  isActive: boolean;
  isUserControllable: boolean; // Split pills are not user-controllable

  constructor(color: Color, position: Position, isUserControllable: boolean = false) {
    this.id = `single-${Date.now()}-${Math.random()}`;
    this.position = { ...position };
    this.color = color;
    this.isActive = true;
    this.isUserControllable = isUserControllable;
  }

  getPositions(): Position[] {
    return [this.position];
  }

  canMove(board: Board, dx: number, dy: number): boolean {
    const newX = this.position.x + dx;
    const newY = this.position.y + dy;
    
    return board.isValidPosition(newX, newY) && board.isEmpty(newX, newY);
  }

  move(dx: number, dy: number): void {
    this.position.x += dx;
    this.position.y += dy;
  }

  // Single pills cannot rotate
  canRotate(board: Board): boolean {
    return false;
  }

  rotate(): void {
    // No-op for single pills
  }

  place(board: Board): void {
    board.setCell(this.position.x, this.position.y, {
      type: CellType.PILL,
      color: this.color,
      pillId: this.id,
    });
    
    this.isActive = false;
  }
}