import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
  CELL_SIZE,
  COLOR_GRADIENTS,
  VIRUS_GRADIENTS,
  CellType,
  Color,
} from '../game/utils/constants';
import { theme } from '../utils/theme';

const isWeb = Platform.OS === 'web';

// Layout metrics shared by the static grid and the floating piece overlay
const CELL_MARGIN = isWeb ? 1.5 : 1;
const CELL_PITCH = CELL_SIZE + CELL_MARGIN * 2;
const BOARD_PADDING = isWeb ? 6 : 4;

interface GameBoardProps {
  board: Board;
  fallingPills: Controllable[];
  gameEngine: GameEngine;
}

// The settled board: viruses and placed pill halves. Memoized on the board
// version so the 60fps falling-piece updates don't re-render the grid.
const StaticGrid = React.memo<{ board: Board; version: number }>(
  ({ board }) => {
    return (
      <View>
        {Array.from({ length: BOARD_HEIGHT }, (_, y) => (
          <View key={y} style={styles.row}>
            {Array.from({ length: BOARD_WIDTH }, (_, x) => {
              const cell = board.getCell(x, y);
              if (!cell || cell.type === CellType.EMPTY || !cell.color) {
                return <View key={x} style={[styles.cell, styles.emptyCell]} />;
              }

              const isVirus = cell.type === CellType.VIRUS;
              const gradientColors = isVirus
                ? VIRUS_GRADIENTS[cell.color]
                : COLOR_GRADIENTS[cell.color];

              return (
                <View
                  key={x}
                  style={[
                    styles.cell,
                    { borderColor: isVirus ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)' },
                  ]}
                >
                  <LinearGradient
                    colors={gradientColors}
                    style={[styles.cellContent, isVirus && styles.virusCell]}
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
  (prev, next) => prev.version === next.version
);

// One falling piece (whole capsule or single half), absolutely positioned
// over the grid. Follows the engine's smooth sub-cell position and carries
// the Germ Buster gestures: drag to move, tap to rotate.
const FallingPiece: React.FC<{
  pill: Controllable;
  board: Board;
  gameEngine: GameEngine;
  isSelected: boolean;
}> = ({ pill, board, gameEngine, isSelected }) => {
  const scale = useSharedValue(1);

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
      runOnJS(drag)(translationX / CELL_PITCH, translationY / CELL_PITCH);
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
    <TapGestureHandler maxDist={10} onHandlerStateChange={handleTap}>
      <Animated.View
        style={[
          styles.piece,
          {
            left: BOARD_PADDING + visualX * CELL_PITCH,
            top: BOARD_PADDING + visualY * CELL_PITCH,
            width: (maxDX + 1) * CELL_PITCH,
            height: (maxDY + 1) * CELL_PITCH,
            zIndex: pill.held ? 10 : 2,
          },
        ]}
      >
        <PanGestureHandler
          minDist={5}
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
                    left: (pos.x - originX) * CELL_PITCH + CELL_MARGIN,
                    top: (pos.y - originY) * CELL_PITCH + CELL_MARGIN,
                    borderColor: isSelected
                      ? theme.colors.warning
                      : isCapsule
                        ? 'rgba(255,255,255,0.6)'
                        : 'rgba(200,200,255,0.5)',
                    borderRadius: isCapsule
                      ? theme.borderRadius.sm
                      : theme.borderRadius.sm * 1.5,
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

export const GameBoard: React.FC<GameBoardProps> = ({ board, fallingPills, gameEngine }) => {
  const boardScale = useSharedValue(0.95);

  useEffect(() => {
    boardScale.value = withSpring(1, { damping: 12, stiffness: 180 });
  }, []);

  const boardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
  }));

  const selectedPill = gameEngine.getSelectedPill();

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.boardWrapper, boardAnimatedStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          style={styles.boardBackground}
        >
          <View style={styles.board}>
            <StaticGrid board={board} version={board.version} />
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
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.lg,
    marginHorizontal: isWeb ? 20 : 0,
    marginVertical: isWeb ? 10 : 0,
  },
  boardBackground: {
    borderRadius: theme.borderRadius.lg,
    padding: isWeb ? 12 : 8,
    borderWidth: isWeb ? 3 : 2,
    borderColor: theme.colors.boardBorder,
    backgroundColor: theme.colors.boardBackground,
  },
  board: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.borderRadius.md,
    padding: BOARD_PADDING,
    ...(isWeb ? { userSelect: 'none' } : {}),
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: isWeb ? 1.5 : 1,
    margin: CELL_MARGIN,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  cellContent: {
    flex: 1,
  },
  emptyCell: {
    backgroundColor: theme.colors.cellEmpty,
    borderColor: theme.colors.cellBorder,
  },
  virusCell: {
    borderRadius: CELL_SIZE / 2,
  },
  piece: {
    position: 'absolute',
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
