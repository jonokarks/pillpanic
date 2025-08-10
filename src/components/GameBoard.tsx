import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Board } from '../game/entities/Board';
import { Controllable } from '../game/utils/types';
import { GameEngine } from '../game/GameEngine';
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

const isWeb = Platform.OS === 'web';

interface GameBoardProps {
  board: Board;
  fallingPills: Controllable[];
  gameEngine: GameEngine;
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
  isJoinedPill?: boolean;
  isUserControllable?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

const AnimatedCell: React.FC<CellProps> = ({ 
  backgroundColor, 
  gradientColors,
  borderColor, 
  isVirus, 
  isActive,
  isEmpty,
  isJoinedPill = false,
  isUserControllable = true,
  onPress,
  onLongPress
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

  const cellContent = (
    <Animated.View 
      style={[
        styles.cell,
        animatedStyle,
        isActive && styles.activeCellShadow,
        { borderColor },
        // Different border radius for split pills to make them appear more individual
        !isJoinedPill && !isVirus && { borderRadius: theme.borderRadius.sm * 1.5 }
      ]}
    >
      {gradientColors ? (
        <LinearGradient
          colors={gradientColors}
          style={[
            styles.cellContent,
            isVirus && styles.virusCell,
            // No dimming needed since all pills are now controllable
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
            // No dimming needed since all pills are now controllable
          ]}
        />
      )}
    </Animated.View>
  );

  // Make controllable pills touchable
  if (isUserControllable && (onPress || onLongPress)) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        onLongPress={onLongPress}
        activeOpacity={0.8}
        delayLongPress={500}
      >
        {cellContent}
      </TouchableOpacity>
    );
  }

  return cellContent;
};

export const GameBoard: React.FC<GameBoardProps> = ({ board, fallingPills, gameEngine }) => {
  const boardScale = useSharedValue(0.95);

  useEffect(() => {
    boardScale.value = withSpring(1, { damping: 12, stiffness: 180 });
  }, []);

  const boardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
  }));

  // Tap to rotate pills only - movement handled by GameControls gestures
  const handleCellTap = (x: number, y: number) => {
    gameEngine.tapToRotate(x, y);
  };

  const renderCell = (x: number, y: number) => {
    const cell = board.getCell(x, y);
    let backgroundColor = theme.colors.cellEmpty;
    let gradientColors: string[] | undefined;
    let borderColor = theme.colors.cellBorder;
    let isActivePill = false;
    let isVirus = false;
    let isEmpty = true;
    let isJoinedPill = false;
    let isUserControllable = true;
    
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
            if ('colors' in pill && Array.isArray((pill as any).colors)) {
              // Regular pill with colors array (joined pill)
              const pillColors = (pill as any).colors as Color[];
              const color = pillColors[j];
              backgroundColor = COLOR_VALUES[color];
              gradientColors = COLOR_GRADIENTS[color];
              isJoinedPill = true;
            } else {
              // Single pill (split pill)
              const color = (pill as any).color as Color;
              backgroundColor = COLOR_VALUES[color];
              gradientColors = COLOR_GRADIENTS[color];
              isJoinedPill = false;
            }
            
            // Different border styles for joined vs split pills
            isUserControllable = (pill as any).isUserControllable !== false;
            
            // Different border styles for joined vs split pills
            if (isJoinedPill) {
              borderColor = 'rgba(255,255,255,0.6)'; // Joined pills
            } else {
              borderColor = 'rgba(200,200,255,0.5)'; // Split pills (slightly blue tint to distinguish from joined)
            }
            isActivePill = false; // No selection system anymore
            break;
          }
        }
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
        isJoinedPill={isJoinedPill}
        isUserControllable={isUserControllable}
        onPress={isUserControllable && !isEmpty ? () => {
          // Single tap - immediately rotate the pill
          gameEngine.tapToRotate(x, y);
        } : undefined}
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
    flex: isWeb ? 0 : 1, // Don't take full height on web
  },
  boardWrapper: {
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.lg,
    // Add extra spacing on desktop
    marginHorizontal: isWeb ? 20 : 0,
    marginVertical: isWeb ? 10 : 0,
  },
  boardBackground: {
    borderRadius: theme.borderRadius.lg,
    padding: isWeb ? 12 : 8, // More padding on desktop
    borderWidth: isWeb ? 3 : 2, // Thicker border on desktop
    borderColor: theme.colors.boardBorder,
    backgroundColor: theme.colors.boardBackground,
  },
  board: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.borderRadius.md,
    padding: isWeb ? 6 : 4, // More padding on desktop
    ...(isWeb ? {
      userSelect: 'none',
    } : {}),
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: isWeb ? 1.5 : 1, // Slightly thicker borders on desktop
    margin: isWeb ? 1.5 : 1, // More spacing on desktop
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
    shadowRadius: isWeb ? 12 : 8, // More glow on desktop
    elevation: isWeb ? 12 : 8,
  },
});