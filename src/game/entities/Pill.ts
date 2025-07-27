import { Color, Orientation, CellType } from '../utils/constants';
import { Pill as PillType, Position } from '../utils/types';
import { Board } from './Board';

export class Pill implements PillType {
  id: string;
  position: Position;
  orientation: Orientation;
  colors: [Color, Color];
  isActive: boolean;

  constructor(colors: [Color, Color], startX: number = 3) {
    this.id = `pill-${Date.now()}`;
    this.position = { x: startX, y: 0 };
    this.orientation = Orientation.HORIZONTAL;
    this.colors = colors;
    this.isActive = true;
  }

  getPositions(): [Position, Position] {
    const { x, y } = this.position;
    if (this.orientation === Orientation.HORIZONTAL) {
      return [
        { x, y },
        { x: x + 1, y }
      ];
    } else {
      return [
        { x, y },
        { x, y: y + 1 }
      ];
    }
  }

  canMove(board: Board, dx: number, dy: number): boolean {
    const positions = this.getPositions();
    
    for (const pos of positions) {
      const newX = pos.x + dx;
      const newY = pos.y + dy;
      
      if (!board.isValidPosition(newX, newY) || !board.isEmpty(newX, newY)) {
        return false;
      }
    }
    
    return true;
  }

  move(dx: number, dy: number): void {
    this.position.x += dx;
    this.position.y += dy;
  }

  canRotate(board: Board): boolean {
    const { x, y } = this.position;
    
    if (this.orientation === Orientation.HORIZONTAL) {
      // Check if can rotate to vertical
      return board.isValidPosition(x, y + 1) && board.isEmpty(x, y + 1);
    } else {
      // Check if can rotate to horizontal
      return board.isValidPosition(x + 1, y) && board.isEmpty(x + 1, y);
    }
  }

  rotate(): void {
    if (this.orientation === Orientation.HORIZONTAL) {
      this.orientation = Orientation.VERTICAL;
    } else {
      this.orientation = Orientation.HORIZONTAL;
      // Swap colors when rotating from vertical to horizontal
      this.colors = [this.colors[1], this.colors[0]];
    }
  }

  place(board: Board): void {
    const positions = this.getPositions();
    
    positions.forEach((pos, index) => {
      board.setCell(pos.x, pos.y, {
        type: CellType.PILL,
        color: this.colors[index],
        pillId: this.id,
      });
    });
    
    this.isActive = false;
  }

  static generateRandomPill(): Pill {
    const colors = Object.values(Color);
    const color1 = colors[Math.floor(Math.random() * colors.length)];
    const color2 = colors[Math.floor(Math.random() * colors.length)];
    return new Pill([color1 as Color, color2 as Color]);
  }
}