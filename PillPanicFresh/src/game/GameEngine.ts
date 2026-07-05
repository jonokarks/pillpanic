import { Board } from './entities/Board';
import { Pill } from './entities/Pill';
import { SinglePill } from './entities/SinglePill';
import { MatchingSystem } from './systems/MatchingSystem';
import {
  GameState,
  Direction,
  BASE_FALL_SPEEDS,
  FAST_FALL_SPEED,
  Color,
  CellType,
  getVirusCount,
  SPEED_INCREASE_INTERVAL,
  MAX_SPEED_INCREASES,
  SPEED_INCREASE_FACTOR,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  SPAWN_GAP_ROWS,
  SPAWN_COOLDOWN_MS,
  CONCURRENT_PILL_THRESHOLDS,
  MAX_CONCURRENT_PILLS,
  GROUNDED_RELEASE_LOCK,
  SPAWN_X,
} from './utils/constants';
import { GameStats, Virus, Controllable, SpeedSetting, Position } from './utils/types';
import { SoundManager } from '../utils/SoundManager';

// Germ Buster (Virus Buster) style engine:
// - capsules drift down smoothly and continuously
// - the player grabs any falling piece with a finger; a held piece stops
//   falling and follows the finger left/right/down (never up)
// - tapping a capsule rotates it
// - new capsules keep entering while others are still falling, ramping from
//   1 to 3 simultaneous capsules the longer the game goes
// - after a clear, unsupported pieces (including half capsules) become
//   slow-falling entities the player can steer into place for combos
export class GameEngine {
  private board: Board;
  private matchingSystem: MatchingSystem;
  private fallingPills: Controllable[] = [];
  private selectedPill: Controllable | null = null;
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
  private baseFallSpeed: number = BASE_FALL_SPEEDS.MEDIUM;
  private currentFallSpeed: number = BASE_FALL_SPEEDS.MEDIUM;
  private spawnCooldown: number = 0;
  private combo: number = 0;
  private grabStart: Position | null = null;
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
    this.selectedPill = null;
    this.grabStart = null;
    this.combo = 0;
    this.nextPill = Pill.generateRandomPill();
    this.baseFallSpeed = BASE_FALL_SPEEDS[speedSetting];
    this.currentFallSpeed = this.baseFallSpeed;
    this.spawnCooldown = 0;
    this.accumulator = 0;
    this.changeState(GameState.PLAYING);
    this.trySpawnPill();
    this.notifyStatsChange();
  }

  private generateViruses(level: number): void {
    const virusCount = getVirusCount(level);
    const viruses: Virus[] = [];
    const colors = Object.values(Color);

    const boardUsage = Math.min(0.5 + (level * 0.02), 0.85);
    const minY = Math.floor(this.board.cells.length * (1 - boardUsage));
    const maxY = this.board.cells.length - 1;

    for (let i = 0; i < virusCount; i++) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 200) {
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

  update(deltaTime: number): void {
    if (this.gameState !== GameState.PLAYING) return;

    deltaTime = Math.min(deltaTime, 100);
    this.accumulator += deltaTime;

    while (this.accumulator >= this.FIXED_TIMESTEP) {
      this.fixedUpdate(this.FIXED_TIMESTEP);
      this.accumulator -= this.FIXED_TIMESTEP;
    }
  }

  private fixedUpdate(timestep: number): void {
    const placedAny = this.updateFalling(timestep);

    if (placedAny) {
      this.processMatches();
    }

    if (this.gameState === GameState.PLAYING) {
      this.maybeSpawnPill(timestep);
    }

    if (this.fallingPills.length > 0 || placedAny) {
      this.notifyBoardChange();
    }
  }

  // True if moving this piece by (dx, dy) would overlap another active
  // falling piece. Board collision is checked separately via pill.canMove.
  private entityBlocked(pill: Controllable, dx: number, dy: number): boolean {
    const targets = pill.getPositions().map(pos => ({ x: pos.x + dx, y: pos.y + dy }));
    for (const other of this.fallingPills) {
      if (other === pill || !other.isActive) continue;
      for (const pos of other.getPositions()) {
        if (targets.some(t => t.x === pos.x && t.y === pos.y)) {
          return true;
        }
      }
    }
    return false;
  }

  // Combined board + falling-piece collision check
  private canPieceMove(pill: Controllable, dx: number, dy: number): boolean {
    return pill.canMove(this.board, dx, dy) && !this.entityBlocked(pill, dx, dy);
  }

  // Smooth gravity: each piece accumulates sub-cell fall progress. Held
  // pieces are suspended. A piece resting on support uses fallOffset as a
  // lock timer, so the player still has a moment to slide or rotate it.
  private updateFalling(timestep: number): boolean {
    let placedAny = false;

    // Process bottom-most pieces first so pieces stacked mid-air move in
    // the same tick as the piece beneath them
    const order = [...this.fallingPills].sort((a, b) => b.position.y - a.position.y);

    for (const pill of order) {
      if (!pill || !pill.isActive) continue;
      if (pill.held) continue;

      const rate = pill.fastDrop ? FAST_FALL_SPEED : this.currentFallSpeed;
      pill.fallOffset += timestep / rate;

      while (pill.fallOffset >= 1) {
        if (!pill.canMove(this.board, 0, 1)) {
          // Lock timer expired while grounded: settle into the board
          pill.place(this.board);
          const index = this.fallingPills.indexOf(pill);
          if (index !== -1) this.fallingPills.splice(index, 1);
          if (pill === this.selectedPill) {
            this.selectedPill = null;
          }
          if (pill instanceof Pill) {
            this.stats.capsulesPlaced++;
            this.updateSpeed();
          }
          placedAny = true;
          break;
        }
        if (this.entityBlocked(pill, 0, 1)) {
          // Resting on another falling piece: wait for it to move
          pill.fallOffset = 0;
          break;
        }
        pill.move(0, 1);
        pill.fallOffset -= 1;
      }
    }

    return placedAny;
  }

  // --- Continuous Germ Buster spawning ---

  private maxConcurrentCapsules(): number {
    let max = 1;
    for (const threshold of CONCURRENT_PILL_THRESHOLDS) {
      if (this.stats.capsulesPlaced >= threshold) max++;
    }
    return Math.min(max, MAX_CONCURRENT_PILLS);
  }

  private maybeSpawnPill(timestep: number): void {
    this.spawnCooldown = Math.max(0, this.spawnCooldown - timestep);
    if (this.spawnCooldown > 0) return;

    const capsules = this.fallingPills.filter(
      p => p.isActive && p instanceof Pill
    );
    if (capsules.length >= this.maxConcurrentCapsules()) return;

    // Wait until the newest capsule has cleared the entry area
    if (capsules.some(p => p.position.y < SPAWN_GAP_ROWS)) return;

    this.trySpawnPill();
  }

  private trySpawnPill(): void {
    if (!this.nextPill) return;

    // Game over only if the entry cells are blocked by settled pieces
    if (!this.board.isEmpty(SPAWN_X, 0) || !this.board.isEmpty(SPAWN_X + 1, 0)) {
      this.gameOver();
      return;
    }

    // If another falling piece is passing through the entry area, wait
    for (const pill of this.fallingPills) {
      if (!pill.isActive) continue;
      for (const pos of pill.getPositions()) {
        if (pos.y <= 1 && pos.x >= SPAWN_X - 1 && pos.x <= SPAWN_X + 2) {
          return;
        }
      }
    }

    const pill = this.nextPill;
    pill.position = { x: SPAWN_X, y: 0 };
    this.fallingPills.push(pill);
    this.nextPill = Pill.generateRandomPill();
    this.spawnCooldown = SPAWN_COOLDOWN_MS;
    this.notifyStatsChange();
    this.notifyBoardChange();
  }

  // --- Touch controls: grab / drag / release / tap-rotate ---

  // Grab the piece under the finger; it stops falling while held
  grabPill(pillId: string): boolean {
    if (this.gameState !== GameState.PLAYING) return false;
    const pill = this.fallingPills.find(p => p.id === pillId && p.isActive);
    if (!pill || !pill.isUserControllable) return false;

    this.selectedPill = pill;
    pill.held = true;
    // Fold current sub-cell progress into the drag offset so the piece
    // doesn't visually snap when grabbed
    this.grabStart = { x: pill.position.x, y: pill.position.y + pill.fallOffset };
    pill.dragOffsetX = 0;
    pill.dragOffsetY = pill.fallOffset;
    pill.fallOffset = 0;
    this.notifyBoardChange();
    return true;
  }

  // Move the held piece toward the finger. Translation is cumulative since
  // the grab, in cell units. Movement is committed cell-by-cell with
  // collision checks; the fractional remainder is a visual lean only.
  // Pieces can move sideways and down, never up (as in Germ Buster).
  dragHeldPill(translationX: number, translationY: number): void {
    const pill = this.selectedPill;
    if (!pill || !pill.held || !pill.isActive || !this.grabStart) return;
    if (this.gameState !== GameState.PLAYING) return;

    const targetX = this.grabStart.x + translationX;
    const targetY = this.grabStart.y + translationY;

    let guard = BOARD_WIDTH;
    while (guard-- > 0 && Math.round(targetX) > pill.position.x && this.canPieceMove(pill, 1, 0)) {
      pill.move(1, 0);
    }
    guard = BOARD_WIDTH;
    while (guard-- > 0 && Math.round(targetX) < pill.position.x && this.canPieceMove(pill, -1, 0)) {
      pill.move(-1, 0);
    }
    guard = BOARD_HEIGHT;
    while (guard-- > 0 && Math.floor(targetY) > pill.position.y && this.canPieceMove(pill, 0, 1)) {
      pill.move(0, 1);
    }

    // Visual lean toward the finger, clamped so the piece never appears
    // inside a wall or below its support
    const fracX = targetX - pill.position.x;
    const maxLeanRight = this.canPieceMove(pill, 1, 0) ? 0.45 : 0.05;
    const maxLeanLeft = this.canPieceMove(pill, -1, 0) ? -0.45 : -0.05;
    pill.dragOffsetX = Math.max(maxLeanLeft, Math.min(maxLeanRight, fracX));

    const fracY = targetY - pill.position.y;
    const maxLeanDown = this.canPieceMove(pill, 0, 1) ? 0.9 : 0.05;
    pill.dragOffsetY = Math.max(-0.15, Math.min(maxLeanDown, fracY));

    this.notifyBoardChange();
  }

  // Finger lifted: the piece resumes falling from where it was left
  releaseHeldPill(): void {
    const pill = this.selectedPill;
    if (!pill || !pill.held) return;

    pill.held = false;
    if (!pill.canMove(this.board, 0, 1)) {
      // Resting on settled pieces: start the lock timer partway through so
      // the piece settles quickly after release
      pill.fallOffset = GROUNDED_RELEASE_LOCK;
    } else if (this.entityBlocked(pill, 0, 1)) {
      // Resting on another falling piece: wait for it to move
      pill.fallOffset = 0;
    } else {
      pill.fallOffset = Math.max(0, Math.min(0.99, pill.dragOffsetY));
    }
    pill.dragOffsetX = 0;
    pill.dragOffsetY = 0;
    pill.fastDrop = false;
    this.selectedPill = null;
    this.grabStart = null;
    this.notifyBoardChange();
  }

  // Tap a capsule to rotate it clockwise (with wall kicks)
  rotatePillById(pillId: string): boolean {
    if (this.gameState !== GameState.PLAYING) return false;
    const pill = this.fallingPills.find(p => p.id === pillId && p.isActive);
    if (!pill || !pill.isUserControllable) return false;

    this.selectedPill = pill;
    if (pill instanceof Pill) {
      if (pill.tryRotateWithKicks(this.board)) {
        this.soundManager.playRotate();
        this.notifyBoardChange();
        return true;
      }
    }
    return false;
  }

  // Tap to rotate pill at board position (kept for external callers)
  tapToRotate(boardX: number, boardY: number): boolean {
    const pill = this.findPillAt(boardX, boardY);
    if (pill) {
      return this.rotatePillById(pill.id);
    }
    return false;
  }

  // --- Keyboard controls (web) ---

  private findBestPillForGesture(): Controllable | null {
    const controllablePills = this.fallingPills.filter(pill => pill.isActive && pill.isUserControllable);
    if (controllablePills.length === 0) return null;

    let bestPill = controllablePills[0];
    let lowestY = bestPill.position.y;

    for (const pill of controllablePills) {
      if (pill.position.y > lowestY) {
        lowestY = pill.position.y;
        bestPill = pill;
      }
    }

    return bestPill;
  }

  private resolveControlledPill(): Controllable | null {
    let currentPill = this.selectedPill;
    if (!currentPill || !this.fallingPills.includes(currentPill)) {
      currentPill = this.findBestPillForGesture();
      if (currentPill) {
        this.selectPill(currentPill);
      }
    }
    return currentPill;
  }

  movePill(direction: Direction): void {
    if (this.fallingPills.length === 0 || this.gameState !== GameState.PLAYING) return;

    const currentPill = this.resolveControlledPill();
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

    if (this.canPieceMove(currentPill, dx, dy)) {
      currentPill.move(dx, dy);
      if (direction !== Direction.DOWN) {
        this.soundManager.playMove();
      }
      this.notifyBoardChange();
    }
  }

  rotatePill(): void {
    if (this.fallingPills.length === 0 || this.gameState !== GameState.PLAYING) return;

    const currentPill = this.resolveControlledPill();
    if (!currentPill) return;

    if (currentPill instanceof Pill) {
      if (currentPill.tryRotateWithKicks(this.board)) {
        this.soundManager.playRotate();
        this.notifyBoardChange();
      }
    }
  }

  dropPill(): void {
    if (this.fallingPills.length === 0 || this.gameState !== GameState.PLAYING) return;

    const currentPill = this.resolveControlledPill();
    if (!currentPill) return;

    while (this.canPieceMove(currentPill, 0, 1)) {
      currentPill.move(0, 1);
    }
    currentPill.fallOffset = GROUNDED_RELEASE_LOCK;

    this.soundManager.playDrop();
    this.notifyBoardChange();
  }

  setFastDrop(fast: boolean): void {
    let pill = this.selectedPill;
    if ((!pill || !this.fallingPills.includes(pill)) && fast) {
      pill = this.findBestPillForGesture();
      if (pill) this.selectPill(pill);
    }
    if (pill && this.fallingPills.includes(pill)) {
      pill.fastDrop = fast;
    }
  }

  // Cycle keyboard selection through the falling pieces (Tab on web)
  switchToNextPill(): void {
    const pills = this.fallingPills.filter(p => p.isActive && p.isUserControllable);
    if (pills.length === 0) return;
    const idx = this.selectedPill ? pills.indexOf(this.selectedPill) : -1;
    this.selectPill(pills[(idx + 1) % pills.length]);
  }

  // --- Matching, chains, and floating-piece release ---

  private processMatches(): void {
    const matches = this.matchingSystem.findMatches();

    if (matches.length === 0) {
      // Chain is over once everything has settled with no new matches
      if (this.fallingPills.length === 0) {
        this.combo = 0;
      }
      this.checkEndConditions();
      return;
    }

    const { clearedCount, splits } = this.matchingSystem.clearMatches(matches);

    if (clearedCount > 0) {
      this.combo++;
      this.stats.score += clearedCount * 100 * this.combo;
      this.stats.linesCleared += Math.floor(clearedCount / 4);
      this.soundManager.playMatch();

      // Rare multi-cell splits reported by the matching system
      splits.forEach(split => {
        this.fallingPills.push(new SinglePill(split.color, split.position, true));
      });

      // Germ Buster signature: unsupported pieces start falling slowly and
      // can be grabbed and steered by the player
      this.releaseFloatingPieces();

      this.notifyBoardChange();
    }

    this.checkEndConditions();
  }

  // Convert every unsupported piece on the board (half capsules and whole
  // capsules alike) into a slow-falling, draggable entity
  private releaseFloatingPieces(): void {
    let releasedAny = true;

    while (releasedAny) {
      releasedAny = false;

      // Collect pill cells grouped by capsule id
      const groups = new Map<string, Array<{ position: Position; color: Color }>>();
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          const cell = this.board.getCell(x, y);
          if (cell && cell.type === CellType.PILL && cell.color) {
            const key = cell.pillId ?? `loose-${x}-${y}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push({ position: { x, y }, color: cell.color });
          }
        }
      }

      groups.forEach((cells, pillId) => {
        if (!this.canGroupFall(cells)) return;

        // Remove from the board and re-create as a falling entity
        cells.forEach(({ position }) => {
          this.board.setCell(position.x, position.y, { type: CellType.EMPTY, color: null });
        });

        if (cells.length === 2) {
          this.fallingPills.push(Pill.fromBoardCells(cells, pillId));
        } else {
          cells.forEach(({ position, color }) => {
            this.fallingPills.push(new SinglePill(color, position, true));
          });
        }
        releasedAny = true;
      });
    }
  }

  private canGroupFall(cells: Array<{ position: Position }>): boolean {
    for (const { position } of cells) {
      if (position.y >= BOARD_HEIGHT - 1) return false;
      const below = this.board.getCell(position.x, position.y + 1);
      if (below && below.type !== CellType.EMPTY) {
        // Support from a cell of the same group doesn't count as support
        const isOwnCell = cells.some(
          c => c.position.x === position.x && c.position.y === position.y + 1
        );
        if (!isOwnCell) return false;
      }
    }
    return true;
  }

  private checkEndConditions(): void {
    this.stats.virusCount = this.board.countViruses();
    this.notifyStatsChange();

    if (this.stats.virusCount === 0) {
      this.levelComplete();
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

  private updateSpeed(): void {
    const newSpeedLevel = Math.floor(this.stats.capsulesPlaced / SPEED_INCREASE_INTERVAL);
    if (newSpeedLevel > this.stats.currentSpeedLevel && newSpeedLevel <= MAX_SPEED_INCREASES) {
      this.stats.currentSpeedLevel = newSpeedLevel;
      this.currentFallSpeed = this.getProgressiveSpeed();
      this.notifyStatsChange();
    }
  }

  private getProgressiveSpeed(): number {
    const speedMultiplier = Math.pow(SPEED_INCREASE_FACTOR, this.stats.currentSpeedLevel);
    return Math.max(50, Math.floor(this.baseFallSpeed * speedMultiplier));
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

  getAllFallingPills(): Controllable[] {
    return this.fallingPills;
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

  selectPill(pill: Controllable | null): boolean {
    if (pill && this.fallingPills.includes(pill)) {
      this.selectedPill = pill;
      this.notifyBoardChange();
      return true;
    }
    return false;
  }

  deselectPill(): void {
    if (this.selectedPill) {
      this.selectedPill = null;
      this.notifyBoardChange();
    }
  }

  getSelectedPill(): Controllable | null {
    return this.selectedPill;
  }
}
