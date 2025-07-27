import { Board } from '../entities/Board';
import { CellType, Color, BOARD_WIDTH, BOARD_HEIGHT } from '../utils/constants';
import { Position, SplitResult } from '../utils/types';

export class MatchingSystem {
  private board: Board;
  private minMatchLength = 4;

  constructor(board: Board) {
    this.board = board;
  }

  findMatches(): Position[][] {
    const matches: Position[][] = [];
    const visited = new Set<string>();

    // Check horizontal matches
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      let currentColor: Color | null = null;
      let matchPositions: Position[] = [];

      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = this.board.getCell(x, y);
        
        if (cell && cell.type !== CellType.EMPTY && cell.color) {
          if (cell.color === currentColor) {
            matchPositions.push({ x, y });
          } else {
            if (matchPositions.length >= this.minMatchLength) {
              matches.push([...matchPositions]);
              matchPositions.forEach(pos => visited.add(`${pos.x},${pos.y}`));
            }
            currentColor = cell.color;
            matchPositions = [{ x, y }];
          }
        } else {
          if (matchPositions.length >= this.minMatchLength) {
            matches.push([...matchPositions]);
            matchPositions.forEach(pos => visited.add(`${pos.x},${pos.y}`));
          }
          currentColor = null;
          matchPositions = [];
        }
      }

      if (matchPositions.length >= this.minMatchLength) {
        matches.push([...matchPositions]);
        matchPositions.forEach(pos => visited.add(`${pos.x},${pos.y}`));
      }
    }

    // Check vertical matches
    for (let x = 0; x < BOARD_WIDTH; x++) {
      let currentColor: Color | null = null;
      let matchPositions: Position[] = [];

      for (let y = 0; y < BOARD_HEIGHT; y++) {
        const cell = this.board.getCell(x, y);
        
        if (cell && cell.type !== CellType.EMPTY && cell.color) {
          if (cell.color === currentColor) {
            matchPositions.push({ x, y });
          } else {
            if (matchPositions.length >= this.minMatchLength) {
              matches.push([...matchPositions]);
              matchPositions.forEach(pos => visited.add(`${pos.x},${pos.y}`));
            }
            currentColor = cell.color;
            matchPositions = [{ x, y }];
          }
        } else {
          if (matchPositions.length >= this.minMatchLength) {
            matches.push([...matchPositions]);
            matchPositions.forEach(pos => visited.add(`${pos.x},${pos.y}`));
          }
          currentColor = null;
          matchPositions = [];
        }
      }

      if (matchPositions.length >= this.minMatchLength) {
        matches.push([...matchPositions]);
        matchPositions.forEach(pos => visited.add(`${pos.x},${pos.y}`));
      }
    }

    return matches;
  }

  clearMatches(matches: Position[][]): { clearedCount: number; splits: SplitResult[] } {
    let clearedCount = 0;
    const clearedPositions = new Set<string>();
    const affectedPills = new Map<string, Position[]>();
    const splits: SplitResult[] = [];

    // First pass: mark positions to be cleared and track affected pills
    matches.forEach(match => {
      match.forEach(pos => {
        const cell = this.board.getCell(pos.x, pos.y);
        if (cell && cell.type !== CellType.EMPTY) {
          clearedPositions.add(`${pos.x},${pos.y}`);
          
          if (cell.type === CellType.PILL && cell.pillId) {
            if (!affectedPills.has(cell.pillId)) {
              affectedPills.set(cell.pillId, []);
            }
            affectedPills.get(cell.pillId)!.push(pos);
          }
        }
      });
    });

    // Second pass: handle pill splitting
    affectedPills.forEach((clearedParts, pillId) => {
      const allPillCells = this.findPillCells(pillId);
      
      // If only part of the pill is being cleared, mark the remaining part for splitting
      if (clearedParts.length < allPillCells.length) {
        allPillCells.forEach(pos => {
          const posKey = `${pos.x},${pos.y}`;
          if (!clearedPositions.has(posKey)) {
            const cell = this.board.getCell(pos.x, pos.y);
            if (cell && cell.color) {
              // Add to splits array for the GameEngine to handle
              splits.push({
                position: { x: pos.x, y: pos.y },
                color: cell.color
              });
              // Clear this position too - it will be replaced by a controllable single pill
              clearedPositions.add(posKey);
            }
          }
        });
      }
    });

    // Third pass: clear all affected positions
    clearedPositions.forEach(posKey => {
      const [x, y] = posKey.split(',').map(Number);
      this.board.setCell(x, y, {
        type: CellType.EMPTY,
        color: null,
      });
      clearedCount++;
    });

    return { clearedCount, splits };
  }

  applyGravity(): boolean {
    let moved = false;
    const processedPills = new Set<string>();

    // Process from bottom to top
    for (let y = BOARD_HEIGHT - 2; y >= 0; y--) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = this.board.getCell(x, y);
        
        if (cell && cell.type !== CellType.EMPTY) {
          if (cell.type === CellType.PILL) {
            if (cell.pillId) {
              // Handle connected pill gravity (pills should fall as a unit)
              if (!processedPills.has(cell.pillId)) {
                processedPills.add(cell.pillId);
                const pillCells = this.findPillCells(cell.pillId);
                if (this.canPillFall(pillCells)) {
                  this.movePillDown(pillCells);
                  moved = true;
                }
              }
            } else {
              // Handle single block gravity
              if (this.canSingleBlockFall(x, y)) {
                this.moveSingleBlockDown(x, y);
                moved = true;
              }
            }
          } else if (cell.type === CellType.VIRUS) {
            // Viruses don't fall
            continue;
          }
        }
      }
    }

    return moved;
  }

  private findPillCells(pillId: string): Position[] {
    const positions: Position[] = [];
    
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = this.board.getCell(x, y);
        if (cell && cell.type === CellType.PILL && cell.pillId === pillId) {
          positions.push({ x, y });
        }
      }
    }
    
    return positions;
  }

  private canPillFall(positions: Position[]): boolean {
    for (const pos of positions) {
      if (pos.y >= BOARD_HEIGHT - 1) {
        return false;
      }
      
      const below = this.board.getCell(pos.x, pos.y + 1);
      if (below && below.type !== CellType.EMPTY) {
        // Check if it's the same pill
        if (below.type === CellType.PILL && below.pillId === this.board.getCell(pos.x, pos.y)?.pillId) {
          continue;
        }
        return false;
      }
    }
    
    return true;
  }

  private movePillDown(positions: Position[]): void {
    // Sort positions by y coordinate (bottom first) to avoid overwriting
    positions.sort((a, b) => b.y - a.y);
    
    const pillData = positions.map(pos => ({
      pos,
      cell: this.board.getCell(pos.x, pos.y)!
    }));
    
    // Clear old positions
    positions.forEach(pos => {
      this.board.setCell(pos.x, pos.y, {
        type: CellType.EMPTY,
        color: null,
      });
    });
    
    // Set new positions
    pillData.forEach(({ pos, cell }) => {
      this.board.setCell(pos.x, pos.y + 1, cell);
    });
  }

  private canSingleBlockFall(x: number, y: number): boolean {
    if (y >= BOARD_HEIGHT - 1) {
      return false;
    }
    
    const below = this.board.getCell(x, y + 1);
    return below !== null && below.type === CellType.EMPTY;
  }

  private moveSingleBlockDown(x: number, y: number): void {
    const cell = this.board.getCell(x, y);
    if (cell) {
      this.board.setCell(x, y, {
        type: CellType.EMPTY,
        color: null,
      });
      this.board.setCell(x, y + 1, cell);
    }
  }

  processMatches(): { cleared: number; matches: Position[][]; splits: SplitResult[] } {
    const matches = this.findMatches();
    const { clearedCount, splits } = this.clearMatches(matches);
    
    // Apply gravity until no more pieces can fall
    while (this.applyGravity()) {
      // Continue applying gravity
    }
    
    return { cleared: clearedCount, matches, splits };
  }
}