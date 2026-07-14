import { Color, Orientation, CellType } from '../utils/constants';
import { Pill as PillType, Position } from '../utils/types';
import { Board } from './Board';

export class Pill implements PillType {
  id: string;
  position: Position;
  orientation: Orientation;
  colors: [Color, Color];
  isActive: boolean;
  isUserControllable: boolean; // Regular pills are user-controllable
  fallOffset: number;
  held: boolean;
  fastDrop: boolean;
  debris: boolean;
  dragOffsetX: number;
  dragOffsetY: number;

  constructor(colors: [Color, Color], startX: number = 3) {
    this.id = `pill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.position = { x: startX, y: 0 };
    this.orientation = Orientation.HORIZONTAL;
    this.colors = colors;
    this.isActive = true;
    this.isUserControllable = true; // Regular pills are user-controllable
    this.fallOffset = 0;
    this.held = false;
    this.fastDrop = false;
    this.debris = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
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
    // Always allow rotation attempts - wall kicks will handle positioning
    return true;
  }

  rotate(): void {
    if (this.orientation === Orientation.HORIZONTAL) {
      // Rotating horizontal to vertical (clockwise)
      // [left, right] becomes [left, right] (left stays top, right becomes bottom)
      this.orientation = Orientation.VERTICAL;
      // No color change needed - left becomes top, right becomes bottom
    } else {
      // Rotating vertical to horizontal (clockwise)  
      // [top, bottom] becomes [bottom, top] (top moves right, bottom moves left)
      this.orientation = Orientation.HORIZONTAL;
      // Swap colors: top becomes right, bottom becomes left
      this.colors = [this.colors[1], this.colors[0]];
    }
  }

  tryRotateWithKicks(board: Board): boolean {
    const originalX = this.position.x;
    const originalY = this.position.y;
    const originalOrientation = this.orientation;
    const originalColors = [...this.colors] as [Color, Color];
    
    // Get current positions before rotation
    const currentPositions = this.getPositions();

    // Try rotation at current position first
    this.rotate();
    const newPositions = this.getPositions();
    
    // Check if rotation works at current position
    let canRotateHere = true;
    for (const pos of newPositions) {
      if (!board.isValidPosition(pos.x, pos.y)) {
        canRotateHere = false;
        break;
      }
      
      // Check if position is empty OR occupied by the current pill itself
      const cell = board.getCell(pos.x, pos.y);
      if (cell && cell.type !== CellType.EMPTY) {
        // Check if this position was occupied by the rotating pill
        const wasOccupiedBySelf = currentPositions.some(
          oldPos => oldPos.x === pos.x && oldPos.y === pos.y
        );
        if (!wasOccupiedBySelf) {
          canRotateHere = false;
          break;
        }
      }
    }
    
    if (canRotateHere) {
      return true;
    }

    // Try wall kicks - more attempts for better success rate
    const kickOffsets: Array<{dx: number, dy: number}> = [];
    
    if (originalOrientation === Orientation.HORIZONTAL) {
      // Rotating from horizontal to vertical
      kickOffsets.push({dx: 0, dy: 0});   // Try current position again (in case of self-collision)
      kickOffsets.push({dx: -1, dy: 0});  // Try left if at right edge
      kickOffsets.push({dx: 1, dy: 0});   // Try right
      kickOffsets.push({dx: 0, dy: -1});  // Try up if at bottom
      kickOffsets.push({dx: 0, dy: 1});   // Try down
      kickOffsets.push({dx: -1, dy: -1}); // Try up-left
      kickOffsets.push({dx: 1, dy: -1});  // Try up-right
    } else {
      // Rotating from vertical to horizontal
      kickOffsets.push({dx: 0, dy: 0});   // Try current position again (in case of self-collision)
      kickOffsets.push({dx: -1, dy: 0});  // Try left
      kickOffsets.push({dx: 1, dy: 0});   // Try right  
      kickOffsets.push({dx: 0, dy: -1});  // Try up
      kickOffsets.push({dx: 0, dy: 1});   // Try down
      kickOffsets.push({dx: -1, dy: -1}); // Try diagonal up-left
      kickOffsets.push({dx: 1, dy: -1});  // Try diagonal up-right
    }

    // Try each kick offset
    for (const offset of kickOffsets) {
      this.position.x = originalX + offset.dx;
      this.position.y = originalY + offset.dy;
      
      const kickedPositions = this.getPositions();
      let canRotateWithKick = true;
      
      for (const pos of kickedPositions) {
        if (!board.isValidPosition(pos.x, pos.y)) {
          canRotateWithKick = false;
          break;
        }
        
        // Check if position is empty OR occupied by the current pill itself
        const cell = board.getCell(pos.x, pos.y);
        if (cell && cell.type !== CellType.EMPTY) {
          // Check if this position was occupied by the rotating pill's original position
          const wasOccupiedBySelf = currentPositions.some(
            oldPos => oldPos.x === pos.x && oldPos.y === pos.y
          );
          if (!wasOccupiedBySelf) {
            canRotateWithKick = false;
            break;
          }
        }
      }
      
      if (canRotateWithKick) {
        return true;
      }
    }

    // Rotation failed, restore original state
    this.position.x = originalX;
    this.position.y = originalY;
    this.orientation = originalOrientation;
    this.colors = originalColors;
    return false;
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

  // Rebuild a capsule entity from two connected board cells (used when a
  // clear leaves a whole capsule unsupported and it starts falling again)
  static fromBoardCells(
    cells: Array<{ position: Position; color: Color }>,
    pillId: string
  ): Pill {
    const [a, b] = cells;
    let pill: Pill;
    if (a.position.y === b.position.y) {
      const left = a.position.x < b.position.x ? a : b;
      const right = a.position.x < b.position.x ? b : a;
      pill = new Pill([left.color, right.color], left.position.x);
      pill.orientation = Orientation.HORIZONTAL;
      pill.position = { ...left.position };
    } else {
      const top = a.position.y < b.position.y ? a : b;
      const bottom = a.position.y < b.position.y ? b : a;
      pill = new Pill([top.color, bottom.color], top.position.x);
      pill.orientation = Orientation.VERTICAL;
      pill.position = { ...top.position };
    }
    pill.id = pillId;
    return pill;
  }
}