import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Board } from '../game/entities/Board';
import { Controllable } from '../game/utils/types';
import { GameEngine } from '../game/GameEngine';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  COLOR_GRADIENTS,
  VIRUS_GRADIENTS,
  CellType,
  Color,
} from '../game/utils/constants';
import { theme } from '../utils/theme';

const isWeb = Platform.OS === 'web';

// A drag must travel this far before it counts as a move rather than a tap.
// Kept comfortably above the tap radius so a wobbly finger tap rotates
// instead of accidentally sliding the capsule a column.
const DRAG_ACTIVATE_DIST = 14;
const TAP_MAX_DIST = 11;

// Fire-and-forget haptics; a no-op on web and if the device has none
const tick = (style?: Haptics.ImpactFeedbackStyle) => {
  if (isWeb) return;
  (style ? Haptics.impactAsync(style) : Haptics.selectionAsync()).catch(() => {});
};

// Board metrics derived from the live window size, so the game fits phones,
// tablets, and desktop windows, and adapts to rotation/resizes
export interface BoardLayout {
  cellSize: number;
  cellMargin: number;
  cellPitch: number;
  boardPadding: number;
}

// Non-grid space the board renders around the cells: the wrapper's padding,
// background padding, and borders. Subtracted from the available box so the
// whole board (not just the grid) fits inside its container.
const BOARD_CHROME = isWeb ? 40 : 30;

// Size the grid to fit exactly inside a given available box (width x height,
// in px). This is the reliable path: the box is measured from the real
// on-screen container, so the board never overlaps the header or the
// safe-area insets regardless of device.
const computeLayoutForBox = (availW: number, availH: number): BoardLayout => {
  const cellMargin = isWeb ? 1.5 : 1;
  const boardPadding = isWeb ? 6 : 4;

  const usableH = availH - BOARD_CHROME - boardPadding * 2;
  const usableW = availW - BOARD_CHROME - boardPadding * 2;
  const pitch = Math.floor(Math.min(usableH / BOARD_HEIGHT, usableW / BOARD_WIDTH));

  const maxCell = isWeb ? 48 : 44;
  const cellSize = Math.max(12, Math.min(maxCell, pitch - cellMargin * 2));
  return {
    cellSize,
    cellMargin,
    cellPitch: cellSize + cellMargin * 2,
    boardPadding,
  };
};

// Fallback used before the container has been measured (and on web, where the
// board is laid out against the window with fixed reserves for chrome/panels).
const computeLayoutFromWindow = (width: number, height: number): BoardLayout => {
  const reservedVertical = isWeb ? 230 : 260;
  const reservedHorizontal = isWeb ? 90 : 24;
  return computeLayoutForBox(width - reservedHorizontal, height - reservedVertical);
};

interface GameBoardProps {
  gameEngine: GameEngine;
  reducedMotion?: boolean;
  // Measured px box the board must fit within (from the parent's onLayout).
  // When omitted, falls back to a window-derived estimate.
  availableWidth?: number;
  availableHeight?: number;
}

const TokenContent = ({
  color,
  isVirus,
  cellSize,
}: {
  color: Color;
  isVirus: boolean;
  cellSize: number;
}) => {
  const gradientColors = isVirus ? VIRUS_GRADIENTS[color] : COLOR_GRADIENTS[color];
  const markStyle =
    color === Color.RED
      ? styles.markStripe
      : color === Color.BLUE
        ? styles.markDot
        : styles.markSlash;

  return (
    <LinearGradient
      colors={gradientColors}
      style={[
        styles.cellContent,
        isVirus ? { borderRadius: cellSize / 2 } : styles.pillFace,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.tokenHighlight} />
      {isVirus ? (
        <>
          <View style={styles.virusEyes}>
            <View style={styles.virusEye} />
            <View style={styles.virusEye} />
          </View>
          <View style={styles.virusMouth} />
        </>
      ) : (
        <View style={markStyle} />
      )}
    </LinearGradient>
  );
};

// The settled board: viruses and placed pill halves. Memoized on the board
// version so the 60fps falling-piece updates don't re-render the grid.
const StaticGrid = React.memo<{ board: Board; version: number; layout: BoardLayout }>(
  ({ board, layout }) => {
    const cellDims = {
      width: layout.cellSize,
      height: layout.cellSize,
      margin: layout.cellMargin,
    };
    return (
      <View>
        {Array.from({ length: BOARD_HEIGHT }, (_, y) => (
          <View key={y} style={styles.row}>
            {Array.from({ length: BOARD_WIDTH }, (_, x) => {
              const cell = board.getCell(x, y);
              if (!cell || cell.type === CellType.EMPTY || !cell.color) {
                return <View key={x} style={[styles.cell, styles.emptyCell, cellDims]} />;
              }

              const isVirus = cell.type === CellType.VIRUS;

              return (
                <View
                  key={x}
                  style={[
                    styles.cell,
                    cellDims,
                    isVirus ? styles.virusCell : styles.settledPillCell,
                  ]}
                >
                  <TokenContent color={cell.color} isVirus={isVirus} cellSize={layout.cellSize} />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  },
  (prev, next) =>
    prev.version === next.version && prev.layout.cellSize === next.layout.cellSize
);

// One falling piece (whole capsule or single half), absolutely positioned
// over the grid. Purely visual: grabbing, dragging and rotating are handled
// by a single board-level gesture layer (see GameBoard) so a fingertip does
// not have to land precisely on a moving capsule. Positioned with transforms
// (GPU compositing) rather than left/top so per-frame movement doesn't
// trigger native layout passes.
const FallingPiece: React.FC<{
  pill: Controllable;
  board: Board;
  isSelected: boolean;
  layout: BoardLayout;
  reducedMotion: boolean;
  // Increments each time this piece is rotated, to trigger the settle anim
  rotatePulse: number;
}> = ({ pill, board, isSelected, layout, reducedMotion, rotatePulse }) => {
  const scale = useSharedValue(1);
  // Radians of leftover rotation that springs back to 0 so a rotate reads as
  // the capsule turning into place rather than snapping
  const settle = useSharedValue(0);
  const { cellSize, cellMargin, cellPitch, boardPadding } = layout;

  const positions = pill.getPositions();
  const originX = pill.position.x;
  const originY = pill.position.y;

  // Smooth visual position: grid position + fall progress (or finger lean
  // while held). A grounded piece shows no fall offset - its fallOffset is
  // acting as the lock timer.
  const visualX = originX + pill.dragOffsetX;
  // Vertical position is always gravity-driven, held or not, so a gripped
  // capsule visibly keeps descending while the finger steers it sideways
  const visualY = originY + (pill.canMove(board, 0, 1) ? Math.min(pill.fallOffset, 0.99) : 0);

  const maxDX = Math.max(...positions.map(p => p.x - originX));
  const maxDY = Math.max(...positions.map(p => p.y - originY));

  // Lift the piece slightly while it's held by the finger
  useEffect(() => {
    scale.value = reducedMotion
      ? (pill.held ? 1.06 : 1)
      : withSpring(pill.held ? 1.08 : 1, { damping: 15, stiffness: 300 });
  }, [pill.held, reducedMotion]);

  // Play the rotate settle whenever this piece is rotated
  useEffect(() => {
    if (rotatePulse === 0 || reducedMotion) return;
    settle.value = -0.34;
    settle.value = withSpring(0, { damping: 12, stiffness: 240 });
    scale.value = withSequence(
      withSpring(1.12, { damping: 12, stiffness: 340 }),
      withSpring(pill.held ? 1.08 : 1, { damping: 14, stiffness: 300 })
    );
  }, [rotatePulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${settle.value}rad` }, { scale: scale.value }],
  }));

  const colors: Color[] =
    'colors' in pill && Array.isArray((pill as any).colors)
      ? ((pill as any).colors as Color[])
      : [(pill as any).color as Color];

  const isCapsule = colors.length === 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.piece,
        {
          width: (maxDX + 1) * cellPitch,
          height: (maxDY + 1) * cellPitch,
          zIndex: pill.held ? 10 : 2,
          transform: [
            { translateX: boardPadding + visualX * cellPitch },
            { translateY: boardPadding + visualY * cellPitch },
          ],
        },
      ]}
    >
      <Animated.View style={[styles.pieceInner, animatedStyle]}>
        {positions.map((pos, index) => (
          <View
            key={index}
            style={[
              styles.cell,
              styles.pieceCell,
              {
                width: cellSize,
                height: cellSize,
                left: (pos.x - originX) * cellPitch + cellMargin,
                top: (pos.y - originY) * cellPitch + cellMargin,
                borderColor: isSelected
                  ? theme.colors.warning
                  : isCapsule
                    ? 'rgba(255,255,255,0.52)'
                    : 'rgba(255,255,255,0.34)',
                borderRadius: isCapsule
                  ? theme.borderRadius.md
                  : theme.borderRadius.round,
              },
              isSelected && styles.activeCellShadow,
            ]}
          >
            <TokenContent color={colors[index] ?? colors[0]} isVirus={false} cellSize={cellSize} />
          </View>
        ))}
      </Animated.View>
    </Animated.View>
  );
};

export const GameBoard: React.FC<GameBoardProps> = ({
  gameEngine,
  reducedMotion = false,
  availableWidth,
  availableHeight,
}) => {
  const boardScale = useSharedValue(0.95);
  const { width, height } = useWindowDimensions();
  const layout = useMemo(() => {
    // Prefer the measured container box on native; fall back to the window
    // estimate on web or before the first measurement lands
    if (!isWeb && availableWidth && availableHeight) {
      return computeLayoutForBox(availableWidth, availableHeight);
    }
    return computeLayoutFromWindow(width, height);
  }, [width, height, availableWidth, availableHeight]);

  // The board subscribes to engine ticks itself, so 60fps falling-piece
  // updates re-render only this subtree - not the header/stats above it
  const [, setTick] = useState(0);
  useEffect(() => {
    gameEngine.setCallbacks({ onBoardChange: () => setTick(t => t + 1) });
  }, [gameEngine]);

  useEffect(() => {
    boardScale.value = reducedMotion ? 1 : withSpring(1, { damping: 12, stiffness: 180 });
  }, [reducedMotion]);

  const boardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
  }));

  // --- Board-level touch control (forgiving grab of the nearest piece) ---
  const { cellPitch, boardPadding } = layout;
  // Which piece the current drag grabbed, and its last column, for haptics
  const grabbedIdRef = useRef<string | null>(null);
  const lastColRef = useRef(0);
  // Bumped per rotation so the matching piece plays its settle animation
  const [rotated, setRotated] = useState<{ id: string; n: number } | null>(null);
  const rotateNonce = useRef(0);

  const pointToCellX = (x: number) => (x - boardPadding) / cellPitch;
  const pointToCellY = (y: number) => (y - boardPadding) / cellPitch;

  const onGrab = (x: number, y: number) => {
    const id = gameEngine.grabNearestPill(pointToCellX(x), pointToCellY(y));
    grabbedIdRef.current = id;
    if (id) {
      const p = gameEngine.getAllFallingPills().find(pp => pp.id === id);
      lastColRef.current = p ? p.position.x : 0;
      tick();
    }
  };
  const onDrag = (tx: number, ty: number) => {
    if (!grabbedIdRef.current) return;
    gameEngine.dragHeldPill(tx / cellPitch, ty / cellPitch);
    const p = gameEngine.getAllFallingPills().find(pp => pp.id === grabbedIdRef.current);
    if (p && p.position.x !== lastColRef.current) {
      lastColRef.current = p.position.x;
      tick();
    }
  };
  const onRelease = () => {
    gameEngine.releaseHeldPill();
    grabbedIdRef.current = null;
  };
  const onRotate = (x: number, y: number) => {
    const id = gameEngine.rotateNearestPill(pointToCellX(x), pointToCellY(y));
    if (!id) return;
    tick(Haptics.ImpactFeedbackStyle.Light);
    rotateNonce.current += 1;
    setRotated({ id, n: rotateNonce.current });
  };

  const handlePan = (event: any) => {
    'worklet';
    const { state, x, y, translationX, translationY } = event.nativeEvent;
    if (state === State.BEGAN) {
      runOnJS(onGrab)(x, y);
    } else if (state === State.ACTIVE) {
      runOnJS(onDrag)(translationX, translationY);
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      runOnJS(onRelease)();
    }
  };

  const handleTap = (event: any) => {
    'worklet';
    const { state, x, y } = event.nativeEvent;
    if (state === State.END) {
      runOnJS(onRotate)(x, y);
    }
  };

  const board = gameEngine.getBoard();
  const fallingPills = gameEngine.getAllFallingPills();
  const selectedPill = gameEngine.getSelectedPill();

  return (
    <View style={styles.container} accessible accessibilityRole="summary" accessibilityLabel="Pill Panic game board. Match four colours to clear every microbe.">
      <Animated.View style={[styles.boardWrapper, boardAnimatedStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          style={styles.boardBackground}
        >
          <View style={[styles.board, { padding: layout.boardPadding }]}>
            <StaticGrid board={board} version={board.version} layout={layout} />
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {fallingPills
                .filter(pill => pill.isActive)
                .map(pill => (
                  <FallingPiece
                    key={pill.id}
                    pill={pill}
                    board={board}
                    isSelected={pill === selectedPill}
                    layout={layout}
                    reducedMotion={reducedMotion}
                    rotatePulse={rotated?.id === pill.id ? rotated.n : 0}
                  />
                ))}
            </View>
            {/* Single gesture surface over the whole grid: tap rotates and
                drag moves the nearest capsule, so aim need not be precise */}
            <TapGestureHandler maxDist={TAP_MAX_DIST} maxDurationMs={320} onHandlerStateChange={handleTap}>
              <Animated.View style={StyleSheet.absoluteFill}>
                <PanGestureHandler
                  minDist={DRAG_ACTIVATE_DIST}
                  shouldCancelWhenOutside={false}
                  onGestureEvent={handlePan}
                  onHandlerStateChange={handlePan}
                >
                  <Animated.View style={StyleSheet.absoluteFill} />
                </PanGestureHandler>
              </Animated.View>
            </TapGestureHandler>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: isWeb ? 0 : 1,
  },
  boardWrapper: {
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.lg,
    marginHorizontal: isWeb ? 20 : 0,
    marginVertical: isWeb ? 10 : 0,
  },
  boardBackground: {
    borderRadius: theme.borderRadius.xl,
    padding: isWeb ? 14 : 10,
    borderWidth: 2,
    borderColor: theme.colors.boardBorder,
    backgroundColor: theme.colors.boardBackground,
  },
  board: {
    backgroundColor: theme.colors.boardWell,
    borderRadius: theme.borderRadius.lg,
    padding: isWeb ? 2 : 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...(isWeb ? { userSelect: 'none' } : {}),
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    margin: 1,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  cellContent: {
    flex: 1,
    overflow: 'hidden',
  },
  emptyCell: {
    backgroundColor: theme.colors.cellEmpty,
    borderColor: theme.colors.cellBorder,
  },
  settledPillCell: {
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  virusCell: {
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: theme.borderRadius.round,
  },
  pillFace: {
    borderRadius: theme.borderRadius.md,
  },
  tokenHighlight: {
    position: 'absolute',
    left: '12%',
    right: '24%',
    top: '12%',
    height: '22%',
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  markStripe: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '45%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.64)',
  },
  markDot: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: '22%',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  markSlash: {
    position: 'absolute',
    alignSelf: 'center',
    top: '22%',
    width: 4,
    height: '58%',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.64)',
    transform: [{ rotate: '36deg' }],
  },
  virusEyes: {
    position: 'absolute',
    left: '24%',
    right: '24%',
    top: '31%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  virusEye: {
    width: 4,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(36,48,74,0.86)',
  },
  virusMouth: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: '25%',
    width: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(36,48,74,0.48)',
  },
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  pieceInner: {
    flex: 1,
  },
  pieceCell: {
    position: 'absolute',
    margin: 0,
  },
  activeCellShadow: {
    shadowColor: theme.colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: isWeb ? 12 : 8,
    elevation: isWeb ? 12 : 8,
  },
});
