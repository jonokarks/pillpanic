import { Board } from './entities/Board';
import { Pill } from './entities/Pill';
import { SinglePill } from './entities/SinglePill';
import { SplitGroup } from './entities/SplitGroup';
import { MatchingSystem } from './systems/MatchingSystem';
import { GameState, Direction, FALL_SPEED, FAST_FALL_SPEED, Color } from './utils/constants';
import { GameStats, Virus, Controllable } from './utils/types';
import { SoundManager } from '../utils/SoundManager';

export class GameEngine {
  private board: Board;
  private matchingSystem: MatchingSystem;
  private fallingPills: Controllable[] = [];
  private activePillIndex: number = 0;
  private nextPill: Pill | null = null;
  private gameState: GameState = GameState.MENU;
  private stats: GameStats = {
    score: 0,
    level: 1,
    virusCount: 0,
    linesCleared: 0,
  };
  private lastFallTime: number = 0;
  private fallSpeed: number = FALL_SPEED;
  private onStateChange?: (state: GameState) => void;
  private onStatsChange?: (stats: GameStats) => void;
  private onBoardChange?: () => void;
  private soundManager: SoundManager;
  private accumulator: number = 0;
  private readonly FIXED_TIMESTEP: number = 16.67; // 60 FPS

  constructor() {
    this.board = new Board();
    this.matchingSystem = new MatchingSystem(this.board);
    this.soundManager = SoundManager.getInstance();
    this.soundManager.initialize();
  }

  setCallbacks(callbacks: {
    onStateChange?: (state: GameState) => void;
    onStatsChange?: (stats: GameStats) => void;
    onBoardChange?: () => void;
  }) {
    this.onStateChange = callbacks.onStateChange;
    this.onStatsChange = callbacks.onStatsChange;
    this.onBoardChange = callbacks.onBoardChange;
  }

  startGame(level: number = 1): void {
    this.stats = {
      score: 0,
      level,
      virusCount: 0,
      linesCleared: 0,
    };
    this.board.clear();
    this.generateViruses(level);
    this.stats.virusCount = this.board.countViruses();
    this.fallingPills = [];
    this.activePillIndex = 0;
    this.nextPill = Pill.generateRandomPill();
    // Adjust fall speed based on level
    this.fallSpeed = Math.max(200, FALL_SPEED - (level - 1) * 80);
    this.lastFallTime = 0;
    this.accumulator = 0;
    this.changeState(GameState.PLAYING);
    this.spawnNextPill();
    this.notifyStatsChange();
  }

  private generateViruses(level: number): void {
    const virusCount = Math.min(4 + level * 2, 20);
    const viruses: Virus[] = [];
    const colors = Object.values(Color);
    
    // Generate viruses in the lower half of the board
    const minY = Math.floor(this.board.cells.length * 0.5);
    const maxY = this.board.cells.length - 1;
    
    for (let i = 0; i < virusCount; i++) {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 100) {
        const x = Math.floor(Math.random() * this.board.cells[0].length);
        const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
        
        if (this.board.isEmpty(x, y)) {
          viruses.push({
            position: { x, y },
            color: colors[Math.floor(Math.random() * colors.length)] as Color,
          });
          placed = true;
        }
        attempts++;
      }
    }
    
    this.board.addViruses(viruses);
  }

  private spawnNextPill(): void {
    if (!this.nextPill) return;
    
    // Only spawn if there are no falling pills
    if (this.fallingPills.length === 0) {
      this.fallingPills.push(this.nextPill);
      this.activePillIndex = 0;
      this.nextPill = Pill.generateRandomPill();
      
      // Check if the spawn position is blocked
      if (!this.fallingPills[0].canMove(this.board, 0, 0)) {
        this.gameOver();
      }
    }
  }

  update(deltaTime: number): void {
    if (this.gameState !== GameState.PLAYING) return;
    
    // Cap deltaTime to prevent spiral of death
    deltaTime = Math.min(deltaTime, 100);
    
    this.accumulator += deltaTime;
    
    // Fixed timestep with interpolation
    while (this.accumulator >= this.FIXED_TIMESTEP) {
      this.fixedUpdate(this.FIXED_TIMESTEP);
      this.accumulator -= this.FIXED_TIMESTEP;
    }
  }

  private fixedUpdate(timestep: number): void {
    if (this.fallingPills.length === 0 || this.activePillIndex >= this.fallingPills.length) return;
    
    this.lastFallTime += timestep;
    
    if (this.lastFallTime >= this.fallSpeed) {
      this.lastFallTime = 0;
      this.movePill(Direction.DOWN);
    }
  }

  movePill(direction: Direction): void {
    if (this.fallingPills.length === 0 || this.activePillIndex >= this.fallingPills.length || this.gameState !== GameState.PLAYING) return;
    
    const activePill = this.fallingPills[this.activePillIndex];
    if (!activePill) return;
    
    let dx = 0, dy = 0;
    
    switch (direction) {
      case Direction.LEFT:
        dx = -1;
        break;
      case Direction.RIGHT:
        dx = 1;
        break;
      case Direction.DOWN:
        dy = 1;
        break;
    }
    
    if (activePill.canMove(this.board, dx, dy)) {
      activePill.move(dx, dy);
      if (direction !== Direction.DOWN) {
        this.soundManager.playMove();
      }
      this.notifyBoardChange();
    } else if (direction === Direction.DOWN) {
      // Pill can't move down, place it
      this.placePill();
    }
  }

  rotatePill(): void {
    if (this.fallingPills.length === 0 || this.activePillIndex >= this.fallingPills.length || this.gameState !== GameState.PLAYING) return;
    
    const activePill = this.fallingPills[this.activePillIndex];
    if (!activePill) return;
    
    if (activePill.canRotate(this.board)) {
      activePill.rotate();
      this.soundManager.playRotate();
      this.notifyBoardChange();
    }
  }

  dropPill(): void {
    if (this.fallingPills.length === 0 || this.activePillIndex >= this.fallingPills.length || this.gameState !== GameState.PLAYING) return;
    
    const activePill = this.fallingPills[this.activePillIndex];
    if (!activePill) return;
    
    while (activePill.canMove(this.board, 0, 1)) {
      activePill.move(0, 1);
    }
    
    this.soundManager.playDrop();
    this.placePill();
  }

  private placePill(): void {
    if (this.fallingPills.length === 0 || this.activePillIndex >= this.fallingPills.length) return;
    
    const activePill = this.fallingPills[this.activePillIndex];
    if (!activePill) return;
    
    activePill.place(this.board);
    
    // Remove the placed pill from falling pills
    this.fallingPills.splice(this.activePillIndex, 1);
    
    // If there are still falling pills, switch to the next one (prefer lower positions)
    if (this.fallingPills.length > 0) {
      this.activePillIndex = this.findLowestPill();
    } else {
      // Process matches and check for splits
      this.processMatchesAndGravity();
    }
  }

  private findLowestPill(): number {
    let lowestIndex = 0;
    let lowestY = this.getLowestPositionY(this.fallingPills[0]);
    
    for (let i = 1; i < this.fallingPills.length; i++) {
      const pillLowestY = this.getLowestPositionY(this.fallingPills[i]);
      if (pillLowestY > lowestY) {
        lowestY = pillLowestY;
        lowestIndex = i;
      }
    }
    
    return lowestIndex;
  }

  private getLowestPositionY(pill: Controllable): number {
    if ('getLowestY' in pill) {
      // SplitGroup has getLowestY method
      return (pill as SplitGroup).getLowestY();
    }
    // Regular pill or single pill
    return pill.position.y;
  }

  private processMatchesAndGravity(): void {
    let totalCleared = 0;
    let combo = 0;
    
    // Keep processing matches until no more are found
    let hasMatches = true;
    while (hasMatches) {
      const { cleared, matches, splits } = this.matchingSystem.processMatches();
      
      if (cleared > 0) {
        totalCleared += cleared;
        combo++;
        this.stats.score += cleared * 100 * combo;
        this.soundManager.playMatch();
        
        // Handle splits - create controllable split groups
        if (splits.length > 0) {
          // Group splits that should fall together (for now all splits fall as one group)
          // In the future, we could group by proximity or other criteria
          const splitGroup = new SplitGroup(splits);
          this.fallingPills.push(splitGroup);
          
          // Set the active pill to the lowest one
          if (this.fallingPills.length > 0) {
            this.activePillIndex = this.findLowestPill();
          }
        }
        
        this.notifyBoardChange();
        
        // Small delay between combo steps would go here in a real game
      } else {
        hasMatches = false;
      }
    }
    
    if (totalCleared > 0) {
      this.stats.linesCleared += Math.floor(totalCleared / 4);
      this.notifyStatsChange();
    }
    
    // Check win condition
    this.stats.virusCount = this.board.countViruses();
    this.notifyStatsChange();
    
    if (this.stats.virusCount === 0) {
      this.levelComplete();
    } else if (this.fallingPills.length === 0) {
      // Only spawn next pill if no pills are falling
      this.spawnNextPill();
    }
  }

  private gameOver(): void {
    this.soundManager.playGameOver();
    this.changeState(GameState.GAME_OVER);
  }

  private levelComplete(): void {
    this.soundManager.playLevelComplete();
    this.changeState(GameState.LEVEL_COMPLETE);
    this.stats.score += 1000 * this.stats.level;
    this.notifyStatsChange();
  }

  pause(): void {
    if (this.gameState === GameState.PLAYING) {
      this.changeState(GameState.PAUSED);
    }
  }

  resume(): void {
    if (this.gameState === GameState.PAUSED) {
      this.changeState(GameState.PLAYING);
    }
  }

  setFastDrop(fast: boolean): void {
    this.fallSpeed = fast ? FAST_FALL_SPEED : FALL_SPEED;
  }

  private changeState(newState: GameState): void {
    this.gameState = newState;
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
  }

  private notifyStatsChange(): void {
    if (this.onStatsChange) {
      this.onStatsChange({ ...this.stats });
    }
  }

  private notifyBoardChange(): void {
    if (this.onBoardChange) {
      this.onBoardChange();
    }
  }

  getBoard(): Board {
    return this.board;
  }

  getCurrentPill(): Controllable | null {
    if (this.fallingPills.length === 0 || this.activePillIndex >= this.fallingPills.length) {
      return null;
    }
    return this.fallingPills[this.activePillIndex];
  }

  getAllFallingPills(): Controllable[] {
    return this.fallingPills;
  }

  getActivePillIndex(): number {
    return this.activePillIndex;
  }

  getNextPill(): Pill | null {
    return this.nextPill;
  }

  getGameState(): GameState {
    return this.gameState;
  }

  getStats(): GameStats {
    return { ...this.stats };
  }
}