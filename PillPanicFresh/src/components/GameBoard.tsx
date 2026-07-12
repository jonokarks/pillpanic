import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Platform, LayoutChangeEvent } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PanGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';
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

// Fixed chrome around the 8x16 grid. The cell size itself is derived from
// the space measured at runtime, so the board fits any screen, notch, or
// orientation without hard-coded device assumptions.
const CELL_MARGIN = isWeb ? 1.5 : 1;
const BOARD_PADDING = isWeb ? 6 : 4;
const FRAME_PADDING = isWeb ? 12 : 8;
const FRAME_BORDER = isWeb ? 3 : 2;
const CHROME = (BOARD_PADDING + FRAME_PADDING + FRAME_BORDER) * 2;

// Releasing a piece with a downward flick faster than this sends it into
// fast drop
const FLICK_VELOCITY = 700; // px/s

// Comfortable finger target; pieces on small screens get invisible extra
// grab area to make up the difference
const MIN_TOUCH_TARGET = 44;

interface Metrics {
  cellSize: number;
  cellPitch: number;
}

const computeMetrics = (width: number, height: number): Metrics | null => {
  if (width <= 0 || height <= 0) return null;
  const pitchX = (width - CHROME) / BOARD_WIDTH;
  const pitchY = (height - CHROME) / BOARD_HEIGHT;
  const cellSize = Math.max(
    14,
    Math.min(48, Math.floor(Math.min(pitchX, pitchY)) - CELL_MARGIN * 2)
  );
  return { cellSize, cellPitch: cellSize + CELL_MARGIN * 2 };
};

// Cell styles depend on the measured cell size, so they're built per size
// (this only re-runs when the size actually changes, e.g. on rotation)
const makeCellStyles = (cellSize: number) =>
  StyleSheet.create({
    cell: {
      width: cellSize,
      height: cellSize,
      borderWidth: isWeb ? 1.5 : 1,
      margin: CELL_MARGIN,
      borderRadius: Math.max(4, Math.round(cellSize * 0.25)),
      overflow: 'hidden',
    },
    emptyCell: {
      backgroundColor: theme.colors.cellEmpty,
      borderColor: theme.colors.cellBorder,
    },
    virusCell: {
      borderRadius: cellSize / 2,
    },
  });

type CellStyles = ReturnType<typeof makeCellStyles>;

interface GameBoardProps {
  gameEngine: GameEngine;
}

// The settled board: viruses and placed pill halves. Memoized on the board
// version so the 60fps falling-piece updates don't re-render the grid.
const StaticGrid = React.memo<{ board: Board; version: number; cellStyles: CellStyles }>(
  ({ board, cellStyles }) => {
    return (
      <View>
        {Array.from({ length: BOARD_HEIGHT }, (_, y) => (
          <View key={y} style={styles.row}>
            {Array.from({ length: BOARD_WIDTH }, (_, x) => {
              const cell = board.getCell(x, y);
              if (!cell || cell.type === CellType.EMPTY || !cell.color) {
                return <View key={x} style={[cellStyles.cell, cellStyles.emptyCell]} />;
              }

              const isVirus = cell.type === CellType.VIRUS;
              const gradientColors = isVirus
                ? VIRUS_GRADIENTS[cell.color]
                : COLOR_GRADIENTS[cell.color];

              return (
                <View
                  key={x}
                  style={[
                    cellStyles.cell,
                    { borderColor: isVirus ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)' },
                  ]}
                >
                  <LinearGradient
                    colors={gradientColors}
                    style={[styles.cellContent, isVirus && cellStyles.virusCell]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  },
  (prev, next) => prev.version === next.version && prev.cellStyles === next.cellStyles
);

// One falling piece (whole capsule or single half), positioned over the grid
// with transforms (no layout pass per frame). Carries the Germ Buster
// gestures: drag to move, tap to rotate, flick down to slam.
const FallingPiece: React.FC<{
  pill: Controllable;
  board: Board;
  gameEngine: GameEngine;
  isSelected: boolean;
  metrics: Metrics;
  cellStyles: CellStyles;
}> = ({ pill, board, gameEngine, isSelected, metrics, cellStyles }) => {
  const scale = useSharedValue(1);
  const { cellSize, cellPitch } = metrics;

  const positions = pill.getPositions();
  const originX = pill.position.x;
  const originY = pill.position.y;

  // Smooth visual position: grid position + fall progress (or finger lean
  // while held). A grounded piece shows no fall offset — its fallOffset is
  // acting as the lock timer.
  const visualX = originX + pill.dragOffsetX;
  const visualY = pill.held
    ? originY + pill.dragOffsetY
    : originY + (pill.canMove(board, 0, 1) ? Math.min(pill.fallOffset, 0.99) : 0);

  const maxDX = Math.max(...positions.map(p => p.x - originX));
  const maxDY = Math.max(...positions.map(p => p.y - originY));

  // Extra invisible grab area so small cells still make a full-size target
  const grabSlop = Math.max(0, Math.round((MIN_TOUCH_TARGET - cellSize) / 2));

  const handlePan = (event: any) => {
    const { state, translationX, translationY, velocityY } = event.nativeEvent;

    if (state === State.BEGAN) {
      scale.value = withSpring(1.08, { damping: 15, stiffness: 300 });
      gameEngine.grabPill(pill.id);
    } else if (state === State.ACTIVE) {
      gameEngine.dragHeldPill(pill.id, translationX / cellPitch, translationY / cellPitch);
    } else if (
      state === State.END ||
      state === State.CANCELLED ||
      state === State.FAILED
    ) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      const flick = state === State.END && (velocityY ?? 0) > FLICK_VELOCITY;
      gameEngine.releaseHeldPill(pill.id, flick);
    }
  };

  const handleTap = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      gameEngine.rotatePillById(pill.id);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const colors: Color[] =
    'colors' in pill && Array.isArray((pill as any).colors)
      ? ((pill as any).colors as Color[])
      : [(pill as any).color as Color];

  const isCapsule = colors.length === 2;

  return (
    <TapGestureHandler maxDist={10} hitSlop={grabSlop} onHandlerStateChange={handleTap}>
      <Animated.View
        style={[
          styles.piece,
          {
            width: (maxDX + 1) * cellPitch,
            height: (maxDY + 1) * cellPitch,
            zIndex: pill.held ? 10 : 2,
            transform: [
              { translateX: BOARD_PADDING + visualX * cellPitch },
              { translateY: BOARD_PADDING + visualY * cellPitch },
            ],
          },
        ]}
      >
        <PanGestureHandler
          minDist={4}
          hitSlop={grabSlop}
          onGestureEvent={handlePan}
          onHandlerStateChange={handlePan}
        >
          <Animated.View style={[styles.pieceInner, animatedStyle]}>
            {positions.map((pos, index) => (
              <View
                key={index}
                style={[
                  cellStyles.cell,
                  styles.pieceCell,
                  {
                    left: (pos.x - originX) * cellPitch + CELL_MARGIN,
                    top: (pos.y - originY) * cellPitch + CELL_MARGIN,
                    borderColor: isSelected
                      ? theme.colors.warning
                      : isCapsule
                        ? 'rgba(255,255,255,0.6)'
                        : 'rgba(200,200,255,0.5)',
                  },
                  isSelected && styles.activeCellShadow,
                ]}
              >
                <LinearGradient
                  colors={COLOR_GRADIENTS[colors[index] ?? colors[0]]}
                  style={styles.cellContent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </View>
            ))}
          </Animated.View>
        </PanGestureHandler>
      </Animated.View>
    </TapGestureHandler>
  );
};

// Subscribes to the engine's board changes itself, so the 60fps fall
// animation only re-renders this subtree — never the screen around it.
export const GameBoard: React.FC<GameBoardProps> = React.memo(({ gameEngine }) => {
  const [, setTick] = useState(0);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const boardScale = useSharedValue(0.95);

  useEffect(() => {
    gameEngine.setCallbacks({
      onBoardChange: () => setTick(t => (t + 1) % 1000000),
    });
  }, [gameEngine]);

  useEffect(() => {
    boardScale.value = withSpring(1, { damping: 12, stiffness: 180 });
  }, []);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const next = computeMetrics(width, height);
    setMetrics(prev =>
      prev && next && prev.cellSize === next.cellSize ? prev : next
    );
  };

  const cellStyles = useMemo(
    () => (metrics ? makeCellStyles(metrics.cellSize) : null),
    [metrics]
  );

  const boardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
  }));

  const board = gameEngine.getBoard();
  const fallingPills = gameEngine.getAllFallingPills();
  const selectedPill = gameEngine.getSelectedPill();

  return (
    <View style={styles.container} onLayout={onLayout}>
      {metrics && cellStyles && (
        <Animated.View style={[styles.boardWrapper, boardAnimatedStyle]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.boardBackground}
          >
            <View style={styles.board}>
              <StaticGrid board={board} version={board.version} cellStyles={cellStyles} />
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {fallingPills
                  .filter(pill => pill.isActive)
                  .map(pill => (
                    <FallingPiece
                      key={pill.id}
                      pill={pill}
                      board={board}
                      gameEngine={gameEngine}
                      isSelected={pill === selectedPill}
                      metrics={metrics}
                      cellStyles={cellStyles}
                    />
                  ))}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardWrapper: {
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.lg,
  },
  boardBackground: {
    borderRadius: theme.borderRadius.lg,
    padding: FRAME_PADDING,
    borderWidth: FRAME_BORDER,
    borderColor: theme.colors.boardBorder,
    backgroundColor: theme.colors.boardBackground,
  },
  board: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.borderRadius.md,
    padding: BOARD_PADDING,
    ...(isWeb ? { userSelect: 'none' as any } : {}),
  },
  row: {
    flexDirection: 'row',
  },
  cellContent: {
    flex: 1,
  },
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
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
