import { GameEngine } from '../src/game/GameEngine';
import { GameState, CellType, Color, Orientation, BOARD_WIDTH, BOARD_HEIGHT } from '../src/game/utils/constants';
import { SpeedSetting } from '../src/game/utils/types';
import { Pill } from '../src/game/entities/Pill';

// Advance the engine by ms of game time (update caps each call at 100ms)
const tick = (engine: GameEngine, ms: number) => {
  let remaining = ms;
  while (remaining > 0) {
    engine.update(Math.min(remaining, 100));
    remaining -= 100;
  }
};

const freshEngine = () => {
  const engine = new GameEngine();
  engine.startGame(1, SpeedSetting.MEDIUM);
  return engine;
};

describe('Germ Buster engine', () => {
  it('starts with one capsule falling and viruses on the board', () => {
    const engine = freshEngine();
    expect(engine.getGameState()).toBe(GameState.PLAYING);
    expect(engine.getAllFallingPills().length).toBe(1);
    expect(engine.getStats().virusCount).toBeGreaterThan(0);
    expect(engine.getNextPill()).toBeTruthy();
  });

  it('capsules fall smoothly over time', () => {
    const engine = freshEngine();
    const pill = engine.getAllFallingPills()[0];
    const y0 = pill.position.y;
    tick(engine, 1700); // MEDIUM base speed = 800ms per row
    expect(pill.position.y).toBeGreaterThan(y0);
  });

  it('grabbing a capsule suspends its fall', () => {
    const engine = freshEngine();
    const pill = engine.getAllFallingPills()[0];
    expect(engine.grabPill(pill.id)).toBe(true);
    const y = pill.position.y;
    tick(engine, 3000);
    expect(pill.position.y).toBe(y);
  });

  it('dragging moves the capsule sideways and down, never up', () => {
    const engine = freshEngine();
    const pill = engine.getAllFallingPills()[0];
    engine.grabPill(pill.id);
    const startX = pill.position.x;
    const startY = pill.position.y;

    engine.dragHeldPill(pill.id, 2.4, 0);
    expect(pill.position.x).toBe(startX + 2);

    engine.dragHeldPill(pill.id, 2.4, 3.4);
    expect(pill.position.y).toBeGreaterThanOrEqual(startY + 2);

    const yAfterDown = pill.position.y;
    engine.dragHeldPill(pill.id, 2.4, -5); // try to drag back up
    expect(pill.position.y).toBe(yAfterDown);
  });

  it('a released capsule resumes falling', () => {
    const engine = freshEngine();
    const pill = engine.getAllFallingPills()[0];
    engine.grabPill(pill.id);
    tick(engine, 1000);
    const y = pill.position.y;
    engine.releaseHeldPill(pill.id);
    tick(engine, 1700);
    expect(pill.position.y).toBeGreaterThan(y);
  });

  it('a downward flick on release sends the piece into fast drop', () => {
    const engine = freshEngine();
    const pill = engine.getAllFallingPills()[0];
    engine.grabPill(pill.id);
    engine.releaseHeldPill(pill.id, true);
    expect(pill.fastDrop).toBe(true);
    const y = pill.position.y;
    tick(engine, 300); // fast drop = 50ms per row
    expect(pill.isActive === false || pill.position.y > y + 3).toBe(true);
  });

  it('holding two pieces at once never strands one in the held state', () => {
    const engine = freshEngine();
    const pillA = engine.getAllFallingPills()[0];
    engine.grabPill(pillA.id);

    const board = engine.getBoard();
    board.setCell(6, 5, { type: CellType.PILL, color: Color.YELLOW, pillId: 'float-x' });
    (engine as any).releaseFloatingPieces();
    const pillB = engine.getAllFallingPills().find(p => p.id.startsWith('single-'))!;

    engine.grabPill(pillB.id);
    expect(pillA.held && pillB.held).toBe(true);

    engine.releaseHeldPill(pillB.id);
    expect(pillB.held).toBe(false);
    expect(pillA.held).toBe(true);

    // The still-held piece keeps responding to its own finger
    engine.dragHeldPill(pillA.id, -10, 0);
    expect(pillA.position.x).toBe(0);
    engine.releaseHeldPill(pillA.id);
    expect(pillA.held).toBe(false);
  });

  it('tapping rotates the capsule', () => {
    const engine = freshEngine();
    const pill = engine.getAllFallingPills()[0] as Pill;
    expect(pill.orientation).toBe(Orientation.HORIZONTAL);
    expect(engine.rotatePillById(pill.id)).toBe(true);
    expect(pill.orientation).toBe(Orientation.VERTICAL);
  });

  it('releases unsupported pieces as controllable falling entities', () => {
    const engine = freshEngine();
    const board = engine.getBoard();

    // A capsule floating in mid-air (nothing beneath it)
    board.setCell(0, 5, { type: CellType.PILL, color: Color.RED, pillId: 'float-1' });
    board.setCell(1, 5, { type: CellType.PILL, color: Color.BLUE, pillId: 'float-1' });
    // A lone half capsule floating
    board.setCell(6, 5, { type: CellType.PILL, color: Color.YELLOW, pillId: 'float-2' });

    (engine as any).releaseFloatingPieces();

    expect(board.getCell(0, 5)!.type).toBe(CellType.EMPTY);
    expect(board.getCell(1, 5)!.type).toBe(CellType.EMPTY);
    expect(board.getCell(6, 5)!.type).toBe(CellType.EMPTY);

    const released = engine.getAllFallingPills().filter(p =>
      p.id === 'float-1' || p.id.startsWith('single-')
    );
    expect(released.length).toBe(2);
    released.forEach(p => expect(p.isUserControllable).toBe(true));
  });

  it('keeps supported pieces on the board', () => {
    const engine = freshEngine();
    const board = engine.getBoard();
    const bottom = BOARD_HEIGHT - 1;

    board.setCell(0, bottom, { type: CellType.PILL, color: Color.RED, pillId: 'ground-1' });
    board.setCell(1, bottom, { type: CellType.PILL, color: Color.BLUE, pillId: 'ground-1' });

    (engine as any).releaseFloatingPieces();

    expect(board.getCell(0, bottom)!.type).toBe(CellType.PILL);
    expect(board.getCell(1, bottom)!.type).toBe(CellType.PILL);
  });

  it('survives a long unattended run and keeps spawning capsules', () => {
    const engine = freshEngine();
    // 5 minutes of game time: capsules spawn, fall, land, matches process
    for (let i = 0; i < 3000 && engine.getGameState() === GameState.PLAYING; i++) {
      engine.update(100);
    }
    const stats = engine.getStats();
    expect(stats.capsulesPlaced).toBeGreaterThan(3);
    // Board must stay within bounds and never contain undefined cells
    const board = engine.getBoard();
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        expect(board.getCell(x, y)).toBeTruthy();
      }
    }
  });
});
