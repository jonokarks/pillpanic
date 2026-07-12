import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
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

// Generous touch slop so a fingertip can grab a moving piece without needing
// pixel accuracy (the original used a stylus; fingers need a bigger target)
const TOUCH_SLOP = { top: 24, bottom: 24, left: 24, right: 24 };

// Board metrics derived from the live window size, so the game fits phones,
// tablets, and desktop windows, and adapts to rotation/resizes
export interface BoardLayout {
  cellSize: number;
  cellMargin: number;
  cellPitch: number;
  boardPadding: number;
}

const computeLayout = (width: number, height: number): BoardLayout => {
  const cellMargin = isWeb ? 1.5 : 1;
  const boardPadding = isWeb ? 6 : 4;
  // Vertical space consumed by everything that isn't the grid (header, safe
  // areas, board chrome). Kept generous so the board never overflows.
  const reservedVertical = isWeb ? 230 : 200;
  const reservedHorizontal = isWeb ? 90 : 32;

  const pitchFromHeight =
    (height - reservedVertical - boardPadding * 2) / BOARD_HEIGHT;
  const pitchFromWidth =
    (width - reservedHorizontal - boardPadding * 2) / BOARD_WIDTH;
  const pitch = Math.floor(Math.min(pitchFromHeight, pitchFromWidth));

  const maxCell = isWeb ? 48 : 44;
  const cellSize = Math.max(16, Math.min(maxCell, pitch - cellMargin * 2));
  return {
    cellSize,
    cellMargin,
    cellPitch: cellSize + cellMargin * 2,
    boardPadding,
  };
};

interface GameBoardProps {
  gameEngine: GameEngine;
  reducedMotion?: boolean;
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
// over the grid. Follows the engine's smooth sub-cell position and carries
// the Germ Buster gestures: drag to move, tap to rotate. Positioned with
// transforms (GPU compositing) rather than left/top so per-frame movement
// doesn't trigger native layout passes.
const FallingPiece: React.FC<{
  pill: Controllable;
  board: Board;
  gameEngine: GameEngine;
  isSelected: boolean;
  layout: BoardLayout;
}> = ({ pill, board, gameEngine, isSelected, layout }) => {
  const scale = useSharedValue(1);
  const { cellSize, cellMargin, cellPitch, boardPadding } = layout;

  const positions = pill.getPositions();
  const originX = pill.position.x;
  const originY = pill.position.y;

  // Smooth visual position: grid position + fall progress (or finger lean
  // while held). A grounded piece shows no fall offset - its fallOffset is
  // acting as the lock timer.
  const visualX = originX + pill.dragOffsetX;
  const visualY = pill.held
    ? originY + pill.dragOffsetY
    : originY + (pill.canMove(board, 0, 1) ? Math.min(pill.fallOffset, 0.99) : 0);

  const maxDX = Math.max(...positions.map(p => p.x - originX));
  const maxDY = Math.max(...positions.map(p => p.y - originY));

  const grab = (id: string) => gameEngine.grabPill(id);
  const drag = (tx: number, ty: number) => gameEngine.dragHeldPill(tx, ty);
  const release = () => gameEngine.releaseHeldPill();
  const rotate = (id: string) => gameEngine.rotatePillById(id);

  const handlePan = (event: any) => {
    'worklet';
    const { state, translationX, translationY } = event.nativeEvent;

    if (state === State.BEGAN) {
      scale.value = withSpring(1.08, { damping: 15, stiffness: 300 });
      runOnJS(grab)(pill.id);
    } else if (state === State.ACTIVE) {
      runOnJS(drag)(translationX / cellPitch, translationY / cellPitch);
    } else if (
      state === State.END ||
      state === State.CANCELLED ||
      state === State.FAILED
    ) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      runOnJS(release)();
    }
  };

  const handleTap = (event: any) => {
    'worklet';
    if (event.nativeEvent.state === State.END) {
      runOnJS(rotate)(pill.id);
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
    <TapGestureHandler maxDist={12} hitSlop={TOUCH_SLOP} onHandlerStateChange={handleTap}>
      <Animated.View
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
        <PanGestureHandler
          minDist={4}
          hitSlop={TOUCH_SLOP}
          shouldCancelWhenOutside={false}
          onGestureEvent={handlePan}
          onHandlerStateChange={handlePan}
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
        </PanGestureHandler>
      </Animated.View>
    </TapGestureHandler>
  );
};

export const GameBoard: React.FC<GameBoardProps> = ({ gameEngine, reducedMotion = false }) => {
  const boardScale = useSharedValue(0.95);
  const { width, height } = useWindowDimensions();
  const layout = useMemo(() => computeLayout(width, height), [width, height]);

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
                    gameEngine={gameEngine}
                    isSelected={pill === selectedPill}
                    layout={layout}
                  />
                ))}
            </View>
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
