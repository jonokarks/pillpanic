import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
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

// Dr. Kawashima-style drag constants
const DRAG_THRESHOLD = 15; // Minimum drag distance to trigger movement
const DRAG_SENSITIVITY = 0.5; // How responsive the dragging feels

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

interface DraggableCellProps extends CellProps {
  gameEngine: GameEngine;
  pill: Controllable;
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

// Dr. Kawashima-style draggable pill cell with smooth real-time movement
const DraggablePillCell: React.FC<DraggableCellProps> = ({ 
  x, y, backgroundColor, gradientColors, borderColor, isVirus, isActive, isEmpty, 
  isJoinedPill = false, isUserControllable = true, gameEngine, pill 
}) => {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);

  const selectPill = () => {
    'worklet';
    runOnJS(gameEngine.selectPillAt.bind(gameEngine))(x, y);
  };

  const movePillToPosition = (newX: number, newY: number) => {
    'worklet';
    // Convert screen coordinates to board movements
    const deltaX = Math.round(newX / CELL_SIZE);
    const deltaY = Math.round(newY / CELL_SIZE);
    
    if (Math.abs(deltaX) >= 1) {
      if (deltaX > 0) {
        runOnJS(gameEngine.movePill.bind(gameEngine))(Direction.RIGHT);
      } else {
        runOnJS(gameEngine.movePill.bind(gameEngine))(Direction.LEFT);
      }
    }
    
    if (deltaY >= 1) {
      runOnJS(gameEngine.setFastDrop.bind(gameEngine))(true);
    }
  };

  const handleGesture = (event: any) => {
    'worklet';
    const { state, translationX, translationY } = event.nativeEvent;

    if (state === State.BEGAN) {
      selectPill();
      isDragging.value = true;
      scale.value = withSpring(1.1); // Slight scale up when grabbed
    } else if (state === State.ACTIVE) {
      // Smooth real-time following
      dragX.value = translationX * DRAG_SENSITIVITY;
      dragY.value = translationY * DRAG_SENSITIVITY;
      
      // Trigger movements when dragging far enough
      if (Math.abs(translationX) > DRAG_THRESHOLD || Math.abs(translationY) > DRAG_THRESHOLD) {
        movePillToPosition(translationX, translationY);
      }
    } else if (state === State.END) {
      isDragging.value = false;
      scale.value = withSpring(1); // Return to normal size
      // Smooth return to grid position
      dragX.value = withSpring(0);
      dragY.value = withSpring(0);
      runOnJS(gameEngine.setFastDrop.bind(gameEngine))(false);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: scale.value }
    ],
    zIndex: isDragging.value ? 10 : 1, // Bring dragged pills to front
  }));

  // Create the pill content (same as AnimatedCell but with drag animation)
  const pillContent = (
    <Animated.View 
      style={[
        styles.cell,
        animatedStyle,
        isActive && styles.activeCellShadow,
        { borderColor },
        !isJoinedPill && !isVirus && { borderRadius: theme.borderRadius.sm * 1.5 }
      ]}
    >
      {gradientColors ? (
        <LinearGradient
          colors={gradientColors}
          style={[styles.cellContent, isVirus && styles.virusCell]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      ) : (
        <View style={[styles.cellContent, { backgroundColor }, isVirus && styles.virusCell]} />
      )}
    </Animated.View>
  );

  return (
    <PanGestureHandler onGestureEvent={handleGesture} onHandlerStateChange={handleGesture}>
      <Animated.View>
        {pillContent}
      </Animated.View>
    </PanGestureHandler>
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
    let currentPill: Controllable | null = null;
    for (let i = 0; i < fallingPills.length; i++) {
      const pill = fallingPills[i];
      if (pill.isActive) {
        const pillPositions = pill.getPositions();
        
        for (let j = 0; j < pillPositions.length; j++) {
          const pos = pillPositions[j];
          if (pos.x === x && pos.y === y) {
            isEmpty = false;
            currentPill = pill;
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
            
            // Check if this pill is currently selected
            const selectedPill = gameEngine.getSelectedPill();
            const isSelectedPill = selectedPill === pill;
            
            if (isSelectedPill && isUserControllable) {
              borderColor = theme.colors.warning; // Selected controllable pill (bright highlight)
              isActivePill = true;
            } else if (isJoinedPill) {
              borderColor = 'rgba(255,255,255,0.6)'; // Joined pills
            } else {
              borderColor = 'rgba(200,200,255,0.5)'; // Split pills (slightly blue tint)
            }
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
    
    // Use DraggablePillCell for controllable pills, regular AnimatedCell for others
    if (isUserControllable && !isEmpty && currentPill) {
      return (
        <DraggablePillCell
          key={`${x}-${y}-drag`}
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
          gameEngine={gameEngine}
          pill={currentPill}
        />
      );
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
        onPress={!isEmpty ? () => {
          // Tap on non-controllable cell - deselect any selected pill
          gameEngine.deselectPill();
        } : () => {
          // Tap on empty cell - deselect any selected pill
          gameEngine.deselectPill();
        }}
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