import { Board } from './entities/Board';
import { Pill } from './entities/Pill';
import { SinglePill } from './entities/SinglePill';
import { MatchingSystem } from './systems/MatchingSystem';
import {
  GameState,
  Direction,
  DIFFICULTY_SETTINGS,
  FAST_FALL_SPEED,
  DEBRIS_FALL_SPEED,
  WAVE_CLEAR_DELAY_MS,
  Color,
  CellType,
  getVirusCount,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  SPAWN_GAP_ROWS,
  MAX_CONCURRENT_PILLS,
  GROUNDED_RELEASE_LOCK,
  SPAWN_X,
} from './utils/constants';
import { GameStats, Virus, Controllable, SpeedSetting, GameMode, Position, GameFeedbackEvent, EndlessSnapshot } from './utils/types';
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
  private difficulty = DIFFICULTY_SETTINGS.MEDIUM;
  private currentFallSpeed: number = DIFFICULTY_SETTINGS.MEDIUM.fallSpeed;
  private gameMode: GameMode = GameMode.CLASSIC;
  private spawnCooldown: number = 0;
  private combo: number = 0;
  private grabStart: Position | null = null;
  // Countdown between an Endless wave clearing and the next germs appearing
  private waveDelay: number = 0;
  private onStateChange?: (state: GameState) => void;
  private onStatsChange?: (stats: GameStats) => void;
  private onBoardChange?: () => void;
  private onFeedback?: (event: GameFeedbackEvent) => void;
  private soundManager: SoundManager;
  private accumulator: number = 0;
  private readonly FIXED_TIMESTEP: number = 16.67; // 60 FPS

  constructor() {
    this.board = new Board();
    this.matchingSystem = new MatchingSystem(this.board);
    this.soundManager = SoundManager.getInstance();
    this.soundManager.initialize();
  }

  // Merge semantics: callers only overwrite the callbacks they provide, so
  // the screen (state/stats) and the board renderer can register separately
  setCallbacks(callbacks: {
    onStateChange?: (state: GameState) => void;
    onStatsChange?: (stats: GameStats) => void;
    onBoardChange?: () => void;
    onFeedback?: (event: GameFeedbackEvent) => void;
  }) {
    if (callbacks.onStateChange) this.onStateChange = callbacks.onStateChange;
    if (callbacks.onStatsChange) this.onStatsChange = callbacks.onStatsChange;
    if (callbacks.onBoardChange) this.onBoardChange = callbacks.onBoardChange;
    if (callbacks.onFeedback) this.onFeedback = callbacks.onFeedback;
  }

  startGame(
    level: number = 1,
    speedSetting: SpeedSetting = SpeedSetting.MEDIUM,
    initialScore: number = 0,
    mode: GameMode = GameMode.CLASSIC
  ): void {
    this.stats = {
      score: initialScore,
      level,
      virusCount: 0,
      linesCleared: 0,
      capsulesPlaced: 0,
      currentSpeedLevel: 0,
      speedSetting,
    };
    this.gameMode = mode;
    this.board.clear();
    this.generateViruses(level);
    this.stats.virusCount = this.board.countViruses();
    this.fallingPills = [];
    this.selectedPill = null;
    this.grabStart = null;
    this.combo = 0;
    this.nextPill = Pill.generateRandomPill();
    // Virus Buster style: fall speed is gentle per difficulty and, in
    // Endless, ratchets up wave by wave along with the capsule count
    this.difficulty = DIFFICULTY_SETTINGS[speedSetting];
    this.currentFallSpeed = this.effectiveFallSpeed();
    this.spawnCooldown = 0;
    this.accumulator = 0;
    this.changeState(GameState.PLAYING);
    this.trySpawnPill();
    this.notifyStatsChange();
  }

  // True if putting `color` at (x, y) would form a run of 3+ same-colored
  // cells with what's already on the board or in the pending virus list.
  // Placement never creates a ready-made match (or a 3-run one placement
  // away from a free clear), matching the original games' generators.
  private wouldCreateRun(
    x: number,
    y: number,
    color: Color,
    pending: Virus[]
  ): boolean {
    const colorAt = (cx: number, cy: number): Color | null => {
      const cell = this.board.getCell(cx, cy);
      if (cell && cell.type !== CellType.EMPTY) return cell.color;
      const queued = pending.find(v => v.position.x === cx && v.position.y === cy);
      return queued ? queued.color : null;
    };

    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      let run = 1;
      for (let step = 1; step <= 2; step++) {
        if (colorAt(x + dx * step, y + dy * step) === color) run++;
        else break;
      }
      for (let step = 1; step <= 2; step++) {
        if (colorAt(x - dx * step, y - dy * step) === color) run++;
        else break;
      }
      if (run >= 3) return true;
    }
    return false;
  }

  // Cells currently occupied by airborne pieces (a new endless-mode wave
  // must not materialize inside a falling capsule)
  private fallingOccupancy(): Set<string> {
    const occupied = new Set<string>();
    for (const pill of this.fallingPills) {
      if (!pill.isActive) continue;
      for (const pos of pill.getPositions()) {
        occupied.add(`${pos.x},${pos.y}`);
      }
    }
    return occupied;
  }

  private generateViruses(level: number): void {
    const virusCount = getVirusCount(level);
    const viruses: Virus[] = [];
    const colors = Object.values(Color) as Color[];
    const occupied = this.fallingOccupancy();

    const boardUsage = Math.min(0.5 + (level * 0.02), 0.85);
    const minY = Math.floor(this.board.cells.length * (1 - boardUsage));
    const maxY = this.board.cells.length - 1;

    for (let i = 0; i < virusCount; i++) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 200) {
        attempts++;
        const x = Math.floor(Math.random() * this.board.cells[0].length);
        const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

        if (!this.board.isEmpty(x, y) || occupied.has(`${x},${y}`)) continue;
        if (viruses.some(v => v.position.x === x && v.position.y === y)) continue;

        // Pick a color that doesn't create a pre-made run; if every color
        // would, try a different cell
        const colorOrder = [...colors].sort(() => Math.random() - 0.5);
        const safeColor = colorOrder.find(c => !this.wouldCreateRun(x, y, c, viruses));
        if (!safeColor) continue;

        viruses.push({ position: { x, y }, color: safeColor });
        placed = true;
      }
    }

    this.board.addViruses(viruses);
  }

  update(deltaTime: number): void {
    if (this.gameState !== GameState.PLAYING) return;

    deltaTime = Math.min(deltaTime, 100);

    // During an Endless wave change the tray sits cleared (old capsules gone)
    // for a short beat before the next germs drop in
    if (this.waveDelay > 0) {
      this.waveDelay -= deltaTime;
      if (this.waveDelay <= 0) {
        this.waveDelay = 0;
        this.spawnNextWaveGerms();
      }
      return;
    }

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
      // Held pieces keep falling (they're only steered, never frozen)

      const rate = pill.fastDrop
        ? FAST_FALL_SPEED
        : pill.debris
          ? DEBRIS_FALL_SPEED
          : this.currentFallSpeed;
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
          }
          this.onFeedback?.({ type: 'land' });
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

  // How far the run has escalated. In Endless each cleared wave cranks the
  // pressure up; Classic levels are self-contained so there's no carry-over.
  private waveIndex(): number {
    return this.gameMode === GameMode.ENDLESS ? Math.max(0, this.stats.level - 1) : 0;
  }

  // Capsules drift a little faster each Endless wave (never below a floor)
  private effectiveFallSpeed(): number {
    const scaled = this.difficulty.fallSpeed * Math.pow(0.96, this.waveIndex());
    return Math.max(430, Math.floor(scaled));
  }

  // New capsules enter more often each Endless wave
  private effectiveSpawnCooldown(): number {
    const scaled = this.difficulty.spawnCooldownMs * Math.pow(0.95, this.waveIndex());
    return Math.max(330, Math.floor(scaled));
  }

  private maxConcurrentCapsules(): number {
    // Several capsules share the sky from the outset (Germ Buster style),
    // then more are added as the run progresses
    let max = this.difficulty.baseConcurrent;
    for (const threshold of this.difficulty.concurrencyThresholds) {
      if (this.stats.capsulesPlaced >= threshold) max++;
    }
    // Endless keeps adding capsules to the sky as waves stack up, toward the
    // Virus Buster ceiling of four in the air at once
    max += Math.floor(this.waveIndex() / 3);
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

  // Entry columns whose two top cells are free of settled pieces. A capsule
  // occupies (x, 0) and (x + 1, 0) when it enters.
  private openEntryColumns(): number[] {
    const columns: number[] = [];
    for (let x = 0; x < BOARD_WIDTH - 1; x++) {
      if (this.board.isEmpty(x, 0) && this.board.isEmpty(x + 1, 0)) {
        columns.push(x);
      }
    }
    return columns;
  }

  private trySpawnPill(): void {
    if (!this.nextPill) return;

    // Game over when the pile walls off the top: no entry pair is free
    const openColumns = this.openEntryColumns();
    if (openColumns.length === 0) {
      this.gameOver();
      return;
    }

    // Skip columns where a falling piece is still passing through the entry
    // area; if every open column is busy, wait for the next tick
    const clearColumns = openColumns.filter(x => {
      for (const pill of this.fallingPills) {
        if (!pill.isActive) continue;
        for (const pos of pill.getPositions()) {
          if (pos.y <= 1 && pos.x >= x - 1 && pos.x <= x + 2) {
            return false;
          }
        }
      }
      return true;
    });
    if (clearColumns.length === 0) return;

    // Capsules enter at varying positions across the top, as in Germ Buster,
    // since several can be airborne at once. Bias toward the center columns.
    const centered = clearColumns.includes(SPAWN_X) && Math.random() < 0.4;
    const spawnX = centered
      ? SPAWN_X
      : clearColumns[Math.floor(Math.random() * clearColumns.length)];

    const pill = this.nextPill;
    pill.position = { x: spawnX, y: 0 };
    this.fallingPills.push(pill);
    this.nextPill = Pill.generateRandomPill();
    this.spawnCooldown = this.effectiveSpawnCooldown();
    this.notifyStatsChange();
    this.notifyBoardChange();
  }

  // --- Touch controls: grab / drag / release / tap-rotate ---

  // Grab the piece under the finger. As in Germ Buster the capsule KEEPS
  // FALLING while held — the finger steers it left/right and can pull it down
  // faster, but it can never be frozen in mid-air.
  grabPill(pillId: string): boolean {
    if (this.gameState !== GameState.PLAYING) return false;
    const pill = this.fallingPills.find(p => p.id === pillId && p.isActive);
    if (!pill || !pill.isUserControllable) return false;

    this.selectedPill = pill;
    pill.held = true;
    // Anchor the finger to the capsule's current cell; gravity keeps running
    // via fallOffset, so there's no need to fold or reset it here
    this.grabStart = { x: pill.position.x, y: pill.position.y };
    pill.dragOffsetX = 0;
    pill.dragOffsetY = 0;
    this.notifyBoardChange();
    return true;
  }

  // Steer the held piece toward the finger. Horizontal movement is committed
  // cell-by-cell (with a fractional lean for smoothness); vertical descent is
  // still governed by gravity, but pulling the finger below the capsule makes
  // it drop faster. The piece never moves up and never stops falling.
  dragHeldPill(translationX: number, translationY: number): void {
    const pill = this.selectedPill;
    if (!pill || !pill.held || !pill.isActive || !this.grabStart) return;
    if (this.gameState !== GameState.PLAYING) return;

    const targetX = this.grabStart.x + translationX;

    let guard = BOARD_WIDTH;
    while (guard-- > 0 && Math.round(targetX) > pill.position.x && this.canPieceMove(pill, 1, 0)) {
      pill.move(1, 0);
    }
    guard = BOARD_WIDTH;
    while (guard-- > 0 && Math.round(targetX) < pill.position.x && this.canPieceMove(pill, -1, 0)) {
      pill.move(-1, 0);
    }

    // Horizontal lean toward the finger, clamped to avoid clipping walls
    const fracX = targetX - pill.position.x;
    const maxLeanRight = this.canPieceMove(pill, 1, 0) ? 0.45 : 0.05;
    const maxLeanLeft = this.canPieceMove(pill, -1, 0) ? -0.45 : -0.05;
    pill.dragOffsetX = Math.max(maxLeanLeft, Math.min(maxLeanRight, fracX));

    // Finger held below the capsule -> soft-drop faster; otherwise it keeps
    // drifting down under normal gravity
    const targetY = this.grabStart.y + translationY;
    pill.fastDrop = targetY > pill.position.y + 0.75;

    this.notifyBoardChange();
  }

  // Finger lifted: the piece simply keeps falling from where it is
  releaseHeldPill(): void {
    const pill = this.selectedPill;
    if (!pill || !pill.held) return;

    pill.held = false;
    pill.fastDrop = false;
    pill.dragOffsetX = 0;
    pill.dragOffsetY = 0;
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

  // --- Forgiving finger control: act on the nearest piece to a touch ---

  // Closest active, user-controllable falling piece to a fractional board
  // cell, or null if nothing is within `maxDist` cells. Uses each piece's
  // smooth visual position so the target matches what the player sees.
  private findNearestControllable(
    cellX: number,
    cellY: number,
    maxDist: number
  ): Controllable | null {
    let best: Controllable | null = null;
    let bestDistSq = Infinity;

    for (const pill of this.fallingPills) {
      if (!pill.isActive || !pill.isUserControllable) continue;
      for (const pos of pill.getPositions()) {
        const visualX = pos.x + pill.dragOffsetX;
        const visualY = pos.y + Math.min(pill.fallOffset, 0.99);
        const dx = visualX + 0.5 - cellX;
        const dy = visualY + 0.5 - cellY;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          best = pill;
        }
      }
    }

    if (!best || bestDistSq > maxDist * maxDist) return null;
    return best;
  }

  // Grab the nearest piece to a touch; returns its id (for the renderer to
  // drive per-piece feedback) or null if nothing was close enough
  grabNearestPill(cellX: number, cellY: number, maxDist: number = 2.4): string | null {
    if (this.gameState !== GameState.PLAYING) return null;
    const pill = this.findNearestControllable(cellX, cellY, maxDist);
    if (!pill) return null;
    return this.grabPill(pill.id) ? pill.id : null;
  }

  // Rotate the nearest piece to a tap; returns its id on success
  rotateNearestPill(cellX: number, cellY: number, maxDist: number = 2.4): string | null {
    if (this.gameState !== GameState.PLAYING) return null;
    const pill = this.findNearestControllable(cellX, cellY, maxDist);
    if (!pill) return null;
    return this.rotatePillById(pill.id) ? pill.id : null;
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
      if (this.combo > 1) this.soundManager.playCombo();
      this.onFeedback?.({ type: 'match', cleared: clearedCount, combo: this.combo });

      // Rare multi-cell splits reported by the matching system
      splits.forEach(split => {
        const piece = new SinglePill(split.color, split.position, true);
        piece.debris = true;
        this.fallingPills.push(piece);
      });

      // Germ Buster signature: unsupported pieces break loose and plummet
      // fast to settle the stack (still grabbable on the way down)
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
          const piece = Pill.fromBoardCells(cells, pillId);
          piece.debris = true;
          this.fallingPills.push(piece);
        } else {
          cells.forEach(({ position, color }) => {
            const piece = new SinglePill(color, position, true);
            piece.debris = true;
            this.fallingPills.push(piece);
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
      if (this.gameMode === GameMode.ENDLESS) {
        this.startNextWave();
      } else {
        this.levelComplete();
      }
    }
  }

  // Virus Buster style continuous play: clearing the board immediately
  // brings the next wave without interrupting play — capsules already in
  // the air keep falling, leftover pill halves stay where they settled
  private startNextWave(): void {
    this.stats.score += 1000 * this.stats.level;
    this.stats.level++;
    // Wipe the tray clean: the capsules you used clear off before the next
    // germs arrive (rather than the new germs landing among old halves)
    this.clearPlayfield();
    this.currentFallSpeed = this.effectiveFallSpeed();
    this.soundManager.playLevelComplete();
    this.notifyStatsChange();
    this.notifyBoardChange();
    // Hold the cleared tray for a beat, then drop in the new germs
    this.waveDelay = WAVE_CLEAR_DELAY_MS;
  }

  // Remove every capsule — settled halves and anything still airborne — so
  // the next wave starts on a clean tray (germs remain since they're cleared)
  private clearPlayfield(): void {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = this.board.getCell(x, y);
        if (cell && cell.type === CellType.PILL) {
          this.board.setCell(x, y, { type: CellType.EMPTY, color: null });
        }
      }
    }
    this.fallingPills = [];
    this.selectedPill = null;
    this.grabStart = null;
    this.combo = 0;
  }

  // The second half of an Endless wave change: germs appear and play resumes
  private spawnNextWaveGerms(): void {
    this.generateViruses(this.stats.level);
    this.stats.virusCount = this.board.countViruses();
    if (!this.nextPill) this.nextPill = Pill.generateRandomPill();
    this.spawnCooldown = 0;
    this.onFeedback?.({ type: 'wave', level: this.stats.level });
    this.notifyStatsChange();
    this.notifyBoardChange();
    this.trySpawnPill();
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

  // --- Endless save / resume ---

  // Snapshot the resumable state of an Endless run. Only settled cells are
  // stored; airborne capsules are dropped (they respawn on load).
  serializeEndless(): EndlessSnapshot {
    const cells: EndlessSnapshot['cells'] = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = this.board.getCell(x, y);
        if (cell && cell.type !== CellType.EMPTY && cell.color) {
          cells.push({ x, y, type: cell.type, color: cell.color, pillId: cell.pillId });
        }
      }
    }
    const nextColors = this.nextPill
      ? ([...this.nextPill.colors] as [Color, Color])
      : ([Color.RED, Color.BLUE] as [Color, Color]);

    return {
      version: 1,
      cells,
      score: this.stats.score,
      wave: this.stats.level,
      capsulesPlaced: this.stats.capsulesPlaced,
      speedSetting: this.stats.speedSetting,
      nextColors,
      lastPlayed: '',
    };
  }

  // Restore an Endless run from a snapshot and resume play immediately.
  loadEndless(snapshot: EndlessSnapshot): void {
    this.stats = {
      score: snapshot.score,
      level: snapshot.wave,
      virusCount: 0,
      linesCleared: 0,
      capsulesPlaced: snapshot.capsulesPlaced,
      currentSpeedLevel: 0,
      speedSetting: snapshot.speedSetting,
    };
    this.gameMode = GameMode.ENDLESS;
    this.board.clear();
    for (const c of snapshot.cells) {
      this.board.setCell(c.x, c.y, { type: c.type, color: c.color, pillId: c.pillId });
    }
    this.stats.virusCount = this.board.countViruses();
    this.fallingPills = [];
    this.selectedPill = null;
    this.grabStart = null;
    this.combo = 0;
    this.nextPill = new Pill([snapshot.nextColors[0], snapshot.nextColors[1]]);
    this.difficulty = DIFFICULTY_SETTINGS[snapshot.speedSetting];
    this.currentFallSpeed = this.effectiveFallSpeed();
    this.spawnCooldown = 0;
    this.accumulator = 0;
    this.changeState(GameState.PLAYING);
    this.trySpawnPill();
    this.notifyStatsChange();
    this.notifyBoardChange();
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
