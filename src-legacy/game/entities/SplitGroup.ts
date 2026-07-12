import { Color, CellType } from '../utils/constants';
import { Position, Controllable } from '../utils/types';
import { Board } from './Board';
import { SinglePill } from './SinglePill';

export class SplitGroup implements Controllable {
  id: string;
  position: Position; // Position of the first piece (for interface compatibility)
  pieces: SinglePill[];
  isActive: boolean;

  constructor(splitPositions: { position: Position; color: Color }[]) {
    this.id = `split-group-${Date.now()}-${Math.random()}`;
    this.pieces = splitPositions.map(split => new SinglePill(split.color, split.position));
    this.isActive = true;
    
    // Set position to the first piece's position for interface compatibility
    this.position = this.pieces.length > 0 ? { ...this.pieces[0].position } : { x: 0, y: 0 };
  }

  getPositions(): Position[] {
    return this.pieces.map(piece => piece.position);
  }

  canMove(board: Board, dx: number, dy: number): boolean {
    // All pieces in the group must be able to move for the group to move
    return this.pieces.every(piece => piece.canMove(board, dx, dy));
  }

  move(dx: number, dy: number): void {
    // Move all pieces together
    this.pieces.forEach(piece => {
      piece.move(dx, dy);
    });
    
    // Update the group's position to the first piece's position
    if (this.pieces.length > 0) {
      this.position = { ...this.pieces[0].position };
    }
  }

  // Split groups cannot rotate (they're individual pieces)
  canRotate(board: Board): boolean {
    return false;
  }

  rotate(): void {
    // No-op for split groups
  }

  place(board: Board): void {
    // Place all pieces in the group
    this.pieces.forEach(piece => {
      piece.place(board);
    });
    
    this.isActive = false;
  }

  // Check if any piece in the group has landed (can't move down)
  hasLanded(board: Board): boolean {
    return this.pieces.some(piece => !piece.canMove(board, 0, 1));
  }

  // Get the lowest Y position in the group (for priority sorting)
  getLowestY(): number {
    return Math.max(...this.pieces.map(piece => piece.position.y));
  }

  // Check if the group is still falling (all pieces are active)
  isFalling(): boolean {
    return this.isActive && this.pieces.every(piece => piece.isActive);
  }

  // Get unique colors in this group (for rendering purposes)
  getColors(): Color[] {
    return [...new Set(this.pieces.map(piece => piece.color))];
  }
}