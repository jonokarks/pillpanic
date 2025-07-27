import { BOARD_WIDTH, BOARD_HEIGHT, CellType, Color } from '../utils/constants';
import { Cell, GameBoard, Position, Virus } from '../utils/types';

export class Board implements GameBoard {
  cells: Cell[][];

  constructor() {
    this.cells = this.createEmptyBoard();
  }

  private createEmptyBoard(): Cell[][] {
    return Array(BOARD_HEIGHT).fill(null).map(() =>
      Array(BOARD_WIDTH).fill(null).map(() => ({
        type: CellType.EMPTY,
        color: null,
      }))
    );
  }

  clear(): void {
    this.cells = this.createEmptyBoard();
  }

  getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) {
      return null;
    }
    return this.cells[y][x];
  }

  setCell(x: number, y: number, cell: Cell): void {
    if (x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT) {
      this.cells[y][x] = cell;
    }
  }

  isEmpty(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    return cell ? cell.type === CellType.EMPTY : false;
  }

  isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT;
  }

  addViruses(viruses: Virus[]): void {
    viruses.forEach(virus => {
      if (this.isValidPosition(virus.position.x, virus.position.y)) {
        this.cells[virus.position.y][virus.position.x] = {
          type: CellType.VIRUS,
          color: virus.color,
        };
      }
    });
  }

  countViruses(): number {
    let count = 0;
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (this.cells[y][x].type === CellType.VIRUS) {
          count++;
        }
      }
    }
    return count;
  }

  getFilledHeight(): number {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (this.cells[y][x].type !== CellType.EMPTY) {
          return BOARD_HEIGHT - y;
        }
      }
    }
    return 0;
  }
}