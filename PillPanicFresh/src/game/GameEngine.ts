import { Board } from './entities/Board';
import { Pill } from './entities/Pill';
import { SinglePill } from './entities/SinglePill';
import { MatchingSystem } from './systems/MatchingSystem';
import { GameState, Direction, BASE_FALL_SPEEDS, FAST_FALL_SPEED, Color, getVirusCount, SPEED_INCREASE_INTERVAL, MAX_SPEED_INCREASES, SPEED_INCREASE_FACTOR, BOARD_WIDTH } from './utils/constants';
import { GameStats, Virus, Controllable, SpeedSetting } from './utils/types';
import { SoundManager } from '../utils/SoundManager';

export class GameEngine {
  private board: Board;
  private matchingSystem: MatchingSystem;
  private fallingPills: Controllable[] = [];
  private nextPill: Pill | null = null;
  private gameState: GameState = GameState.MENU;
  private stats: GameStats = {
    score: 0,
    level: 1,
    virusCount: 0,
    linesCleared: 0,
    capsulesPlaced: 0,
    currentSpeedLevel: 0,
    speedSetting: SpeedSetting.MEDIUM,
  };
  private lastFallTime: number = 0;
  private baseFallSpeed: number = BASE_FALL_SPEEDS.MEDIUM;
  private currentFallSpeed: number = BASE_FALL_SPEEDS.MEDIUM;
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

  startGame(level: number = 1, speedSetting: SpeedSetting = SpeedSetting.MEDIUM, initialScore: number = 0): void {
    this.stats = {
      score: initialScore,
      level,
      virusCount: 0,
      linesCleared: 0,
      capsulesPlaced: 0,
      currentSpeedLevel: 0,
      speedSetting,
    };
    this.board.clear();
    this.generateViruses(level);
    this.stats.virusCount = this.board.countViruses();
    this.fallingPills = [];
    this.nextPill = Pill.generateRandomPill();
    // Set base speed based on speed setting
    this.baseFallSpeed = BASE_FALL_SPEEDS[speedSetting];
    this.currentFallSpeed = this.baseFallSpeed;
    this.lastFallTime = 0;
    this.accumulator = 0;
    this.changeState(GameState.PLAYING);
    this.spawnNextPill();
    this.notifyStatsChange();
  }

  private generateViruses(level: number): void {
    const virusCount = getVirusCount(level);
    const viruses: Virus[] = [];
    const colors = Object.values(Color);
    console.log(`🦠 Generating ${virusCount} viruses for level ${level}`);
    
    // For higher levels, use more of the board (classic Dr. Mario behavior)
    const boardUsage = Math.min(0.5 + (level * 0.02), 0.85); // Use more board area as level increases
    const minY = Math.floor(this.board.cells.length * (1 - boardUsage));
    const maxY = this.board.cells.length - 1;
    
    for (let i = 0; i < virusCount; i++) {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 200) { // More attempts for higher virus counts
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
      // Virus Buster style: sometimes spawn multiple pills at once
      const batchSize = this.shouldSpawnBatch() ? Math.floor(Math.random() * 3) + 1 : 1; // 1-3 pills
      
      // Calculate starting position to center the batch horizontally
      // Pills are 2 cells wide, so we need 2-cell spacing for side-by-side placement
      let startingX: number;
      if (batchSize === 1) {
        startingX = 3; // Center position
      } else if (batchSize === 2) {
        startingX = 2; // Start at x=2, next at x=4
      } else { // batchSize === 3
        startingX = 1; // Start at x=1, next at x=3, then x=5
      }

      for (let i = 0; i < batchSize; i++) {
        const pill = i === 0 ? this.nextPill : Pill.generateRandomPill();
        
        // Position pills side-by-side with 2-cell spacing (accounting for pill width)
        const pillX = startingX + (i * 2);
        
        // Ensure pill fits within board boundaries (pill occupies 2 cells: x and x+1)
        const safeX = Math.max(0, Math.min(BOARD_WIDTH - 2, pillX));
        pill.position.x = safeX;
        
        this.fallingPills.push(pill);
        console.log(`Spawned pill ${i + 1}/${batchSize} at x=${safeX} (occupies cells ${safeX}-${safeX + 1})`);
      }
      
      this.nextPill = Pill.generateRandomPill();
      
      // Check if the spawn positions are blocked
      for (const pill of this.fallingPills) {
        if (!pill.canMove(this.board, 0, 0)) {
          this.gameOver();
          return;
        }
      }
      
      if (batchSize > 1) {
        console.log(`Spawned batch of ${batchSize} pills - player can select and drag each individually`);
        console.log(`Pills positioned at: ${this.fallingPills.slice(-batchSize).map(p => `x=${p.position.x}`).join(', ')}`);
      }
    }
  }

  // Determine if we should spawn multiple pills (Virus Buster style)
  private shouldSpawnBatch(): boolean {
    // 50% chance to spawn multiple pills (increased for testing)
    return Math.random() < 0.5;
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
    if (this.fallingPills.length === 0) return;
    
    this.lastFallTime += timestep;
    
    if (this.lastFallTime >= this.currentFallSpeed) {
      this.lastFallTime = 0;
      this.applyGravityToAllPills();
    }
  }

  private applyGravityToAllPills(): void {
    // Apply gravity to all falling pills simultaneously
    let falllingCount = 0;
    let placedCount = 0;
    
    for (let i = this.fallingPills.length - 1; i >= 0; i--) {
      const pill = this.fallingPills[i];
      if (!pill || !pill.isActive) continue;
      
      // Don't skip any pills - let gravity apply to all
      
      // Check if pill can move down
      if (pill.canMove(this.board, 0, 1)) {
        pill.move(0, 1);
        falllingCount++;
        console.log(`Gravity applied to pill ${i} at (${pill.position.x}, ${pill.position.y})`);
      } else {
        // Pill can't move down, place it
        console.log(`Placing pill ${i} at (${pill.position.x}, ${pill.position.y})`);
        pill.place(this.board);
        this.fallingPills.splice(i, 1);
        placedCount++;
        
        // Increment capsule counter for speed progression (classic Dr. Mario behavior)
        this.stats.capsulesPlaced++;
        this.updateSpeed();
      }
    }
    
    if (falllingCount > 0 || placedCount > 0) {
      console.log(`Gravity cycle: ${falllingCount} pills fell, ${placedCount} pills placed`);
    }
    
    this.notifyBoardChange();
    
    // Process matches after pills have been placed
    if (this.fallingPills.length === 0 || this.fallingPills.every(pill => !pill.isActive)) {
      this.processMatchesAndGravity();
    }
  }

  // Keyboard/gesture movement - works with the currently falling pill
  movePill(direction: Direction): void {
    if (this.fallingPills.length === 0 || this.gameState !== GameState.PLAYING) return;
    
    // Get the first active controllable pill
    const currentPill = this.fallingPills.find(pill => pill.isActive && pill.isUserControllable);
    if (!currentPill) return;
    
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
    
    if (currentPill.canMove(this.board, dx, dy)) {
      currentPill.move(dx, dy);
      if (direction !== Direction.DOWN) {
        this.soundManager.playMove();
      }
      this.notifyBoardChange();
    }
  }

  // Keyboard/gesture rotation - works with the currently falling pill
  rotatePill(): void {
    if (this.fallingPills.length === 0 || this.gameState !== GameState.PLAYING) return;
    
    // Get the first active controllable pill
    const currentPill = this.fallingPills.find(pill => pill.isActive && pill.isUserControllable);
    if (!currentPill) return;
    
    // Only rotate regular pills, not single pills
    if ('tryRotateWithKicks' in currentPill) {
      if (currentPill.tryRotateWithKicks(this.board)) {
        this.soundManager.playRotate();
        this.notifyBoardChange();
      }
    }
  }

  // Drop pill instantly to bottom
  dropPill(): void {
    if (this.fallingPills.length === 0 || this.gameState !== GameState.PLAYING) return;
    
    // Get the first active controllable pill
    const currentPill = this.fallingPills.find(pill => pill.isActive && pill.isUserControllable);
    if (!currentPill) return;
    
    // Move down until can't move anymore
    while (currentPill.canMove(this.board, 0, 1)) {
      currentPill.move(0, 1);
    }
    
    this.soundManager.playDrop();
    this.notifyBoardChange();
  }

  // Pill switching no longer needed - one pill at a time


  // Legacy method - pills now place automatically when gravity is applied
  private placePill(): void {
    // This method is deprecated - pills automatically place when they can't fall further
    console.warn('placePill() is deprecated. Pills place automatically via gravity.');
  }

  // Legacy method - no longer needed without active pill index
  private findLowestPill(): number {
    console.warn('findLowestPill() is deprecated. No active pill management needed.');
    return -1;
  }

  private getLowestPositionY(pill: Controllable): number {
    // All controllables now have a position property
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
        
        // Handle splits - create individual touchable pills
        if (splits.length > 0) {
          console.log(`Creating ${splits.length} individual split pills:`, splits);
          // Create individual SinglePill that can be touched and dragged
          splits.forEach(split => {
            const singlePill = new SinglePill(split.color, split.position, true); // true = touchable
            this.fallingPills.push(singlePill);
            console.log(`Added touchable split pill at (${split.position.x}, ${split.position.y}) with color ${split.color}`);
          });
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
    console.log(`Level ${this.stats.level} completed! Score: ${this.stats.score}`);
    this.soundManager.playLevelComplete();
    this.changeState(GameState.LEVEL_COMPLETE);
    this.stats.score += 1000 * this.stats.level;
    console.log(`Level complete bonus applied. New score: ${this.stats.score}`);
    this.notifyStatsChange();
  }

  pause(): void {
    console.log('Pause requested, current state:', this.gameState);
    if (this.gameState === GameState.PLAYING) {
      this.changeState(GameState.PAUSED);
    }
  }

  resume(): void {
    console.log('Resume requested, current state:', this.gameState);
    if (this.gameState === GameState.PAUSED) {
      this.changeState(GameState.PLAYING);
    }
  }

  setFastDrop(fast: boolean): void {
    this.currentFallSpeed = fast ? FAST_FALL_SPEED : this.getProgressiveSpeed();
  }

  private updateSpeed(): void {
    // Classic Dr. Mario: speed increases every 10 capsules placed
    const newSpeedLevel = Math.floor(this.stats.capsulesPlaced / SPEED_INCREASE_INTERVAL);
    if (newSpeedLevel > this.stats.currentSpeedLevel && newSpeedLevel <= MAX_SPEED_INCREASES) {
      this.stats.currentSpeedLevel = newSpeedLevel;
      this.currentFallSpeed = this.getProgressiveSpeed();
      this.notifyStatsChange();
    }
  }

  private getProgressiveSpeed(): number {
    // Calculate current speed based on speed level (each level makes it faster)
    const speedMultiplier = Math.pow(SPEED_INCREASE_FACTOR, this.stats.currentSpeedLevel);
    return Math.max(50, Math.floor(this.baseFallSpeed * speedMultiplier)); // Never go faster than 50ms
  }

  private changeState(newState: GameState): void {
    console.log(`GameEngine state change: ${this.gameState} -> ${newState}`);
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

  // Legacy method - replaced by getSelectedPill()
  getCurrentPill(): Controllable | null {
    // Return currently selected pill instead of "active" pill
    return this.getSelectedPill();
  }

  getAllFallingPills(): Controllable[] {
    return this.fallingPills;
  }

  // Legacy method - no longer relevant in touch-based gameplay
  getActivePillIndex(): number {
    console.warn('getActivePillIndex() is deprecated. Use getSelectedPill() instead.');
    return -1;
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


  // Find pill at screen/board coordinates
  findPillAt(boardX: number, boardY: number): Controllable | null {
    for (const pill of this.fallingPills) {
      if (!pill.isActive) continue;
      
      const positions = pill.getPositions();
      for (const pos of positions) {
        if (pos.x === boardX && pos.y === boardY) {
          return pill;
        }
      }
    }
    return null;
  }



  // Tap to rotate pill at position  
  tapToRotate(boardX: number, boardY: number): boolean {
    if (this.gameState !== GameState.PLAYING) return false;
    
    const pill = this.findPillAt(boardX, boardY);
    if (pill && 'tryRotateWithKicks' in pill) {
      if (pill.tryRotateWithKicks(this.board)) {
        this.soundManager.playRotate();
        this.notifyBoardChange();
        return true;
      }
    }
    return false;
  }
}