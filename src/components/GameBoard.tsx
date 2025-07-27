import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Board } from '../game/entities/Board';
import { Controllable } from '../game/utils/types';
import { 
  BOARD_WIDTH, 
  BOARD_HEIGHT, 
  CELL_SIZE, 
  COLOR_VALUES, 
  COLOR_GRADIENTS,
  VIRUS_GRADIENTS,
  CellType,
  Color
} from '../game/utils/constants';
import { theme } from '../utils/theme';

interface GameBoardProps {
  board: Board;
  fallingPills: Controllable[];
  activePillIndex: number;
}

interface CellProps {
  x: number;
  y: number;
  backgroundColor: string;
  gradientColors?: string[];
  borderColor: string;
  isVirus: boolean;
  isActive: boolean;
  isEmpty: boolean;
}

const AnimatedCell: React.FC<CellProps> = ({ 
  backgroundColor, 
  gradientColors,
  borderColor, 
  isVirus, 
  isActive,
  isEmpty 
}) => {
  const scale = useSharedValue(isEmpty ? 1 : 0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!isEmpty) {
      scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    } else {
      scale.value = withTiming(1, { duration: 100 });
    }

    if (isActive) {
      glow.value = withSpring(1, { damping: 15, stiffness: 150 });
    } else {
      glow.value = withTiming(0, { duration: 300 });
    }
  }, [isEmpty, isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: interpolate(glow.value, [0, 1], [0, 0.8]),
  }));

  if (isEmpty) {
    return (
      <View style={[styles.cell, styles.emptyCell]} />
    );
  }

  return (
    <Animated.View 
      style={[
        styles.cell,
        animatedStyle,
        isActive && styles.activeCellShadow,
        { borderColor }
      ]}
    >
      {gradientColors ? (
        <LinearGradient
          colors={gradientColors}
          style={[
            styles.cellContent,
            isVirus && styles.virusCell,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      ) : (
        <View 
          style={[
            styles.cellContent,
            { backgroundColor },
            isVirus && styles.virusCell,
          ]}
        />
      )}
    </Animated.View>
  );
};

export const GameBoard: React.FC<GameBoardProps> = ({ board, fallingPills, activePillIndex }) => {
  const boardScale = useSharedValue(0.95);

  useEffect(() => {
    boardScale.value = withSpring(1, { damping: 12, stiffness: 180 });
  }, []);

  const boardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
  }));

  const renderCell = (x: number, y: number) => {
    const cell = board.getCell(x, y);
    let backgroundColor = theme.colors.cellEmpty;
    let gradientColors: string[] | undefined;
    let borderColor = theme.colors.cellBorder;
    let isActivePill = false;
    let isVirus = false;
    let isEmpty = true;
    
    // Check if this position is occupied by any falling pill
    for (let i = 0; i < fallingPills.length; i++) {
      const pill = fallingPills[i];
      if (pill.isActive) {
        const pillPositions = pill.getPositions();
        
        for (let j = 0; j < pillPositions.length; j++) {
          const pos = pillPositions[j];
          if (pos.x === x && pos.y === y) {
            isEmpty = false;
            // Handle different pill types
            if ('colors' in pill) {
              // Regular pill with colors array
              const color = pill.colors[j] as Color;
              backgroundColor = COLOR_VALUES[color];
              gradientColors = COLOR_GRADIENTS[color];
            } else if ('pieces' in pill) {
              // Split group - find the specific piece at this position
              const splitGroup = pill as any;
              const piece = splitGroup.pieces.find((p: any) => p.position.x === x && p.position.y === y);
              if (piece) {
                backgroundColor = COLOR_VALUES[piece.color];
                gradientColors = COLOR_GRADIENTS[piece.color];
              }
            } else {
              // Single pill
              const color = (pill as any).color as Color;
              backgroundColor = COLOR_VALUES[color];
              gradientColors = COLOR_GRADIENTS[color];
            }
            borderColor = i === activePillIndex ? theme.colors.warning : 'rgba(255,255,255,0.3)';
            isActivePill = i === activePillIndex;
            break;
          }
        }
        if (isActivePill) break;
      }
    }
    
    // If not occupied by falling pill, render the cell from the board
    if (!isActivePill && cell && cell.type !== CellType.EMPTY && cell.color) {
      isEmpty = false;
      backgroundColor = COLOR_VALUES[cell.color];
      if (cell.type === CellType.VIRUS) {
        gradientColors = VIRUS_GRADIENTS[cell.color];
        borderColor = 'rgba(0,0,0,0.5)';
        isVirus = true;
      } else {
        gradientColors = COLOR_GRADIENTS[cell.color];
        borderColor = 'rgba(255,255,255,0.3)';
      }
    }
    
    return (
      <AnimatedCell
        key={`${x}-${y}`}
        x={x}
        y={y}
        backgroundColor={backgroundColor}
        gradientColors={gradientColors}
        borderColor={borderColor}
        isVirus={isVirus}
        isActive={isActivePill}
        isEmpty={isEmpty}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.boardWrapper, boardAnimatedStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          style={styles.boardBackground}
        >
          <View style={styles.board}>
            {Array.from({ length: BOARD_HEIGHT }, (_, y) => (
              <View key={y} style={styles.row}>
                {Array.from({ length: BOARD_WIDTH }, (_, x) => renderCell(x, y))}
              </View>
            ))}
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
  },
  boardWrapper: {
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.lg,
  },
  boardBackground: {
    borderRadius: theme.borderRadius.lg,
    padding: 8,
    borderWidth: 2,
    borderColor: theme.colors.boardBorder,
    backgroundColor: theme.colors.boardBackground,
  },
  board: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.borderRadius.md,
    padding: 4,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    margin: 1,
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
  activeCellShadow: {
    shadowColor: theme.colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 8,
  },
});