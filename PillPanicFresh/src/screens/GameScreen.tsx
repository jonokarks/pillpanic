import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Platform } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { GameEngine } from '../game/GameEngine';
import { GameBoard } from '../components/GameBoard';
import { GameControls } from '../components/GameControls';
import { GameState, COLOR_VALUES } from '../game/utils/constants';
import { GameStats, SpeedSetting } from '../game/utils/types';
import { GameOverScreen } from './GameOverScreen';
import { theme, responsiveFontSize, responsiveSpacing } from '../utils/theme';

interface GameScreenProps {
  level: number;
  speedSetting: SpeedSetting;
  onBackToMenu: () => void;
  onGameComplete: (level: number, totalScore: number) => void;
  savedTotalScore: number;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const GameScreen: React.FC<GameScreenProps> = ({ 
  level, 
  speedSetting, 
  onBackToMenu, 
  onGameComplete,
  savedTotalScore 
}) => {
  const gameEngineRef = useRef<GameEngine>();
  
  // Initialize GameEngine only once
  if (!gameEngineRef.current) {
    gameEngineRef.current = new GameEngine();
  }
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>(GameState.PLAYING);
  const gameStateRef = useRef<GameState>(gameState);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    level: level,
    virusCount: 0,
    linesCleared: 0,
    capsulesPlaced: 0,
    currentSpeedLevel: 0,
    speedSetting: speedSetting,
  });

  const headerOpacity = useSharedValue(0);
  const scoreScale = useSharedValue(1);
  const pauseButtonScale = useSharedValue(1);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500 });
  }, []);

  // Keep gameStateRef in sync with gameState
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    scoreScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
  }, [stats.score]);

  useEffect(() => {
    pauseButtonScale.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 300 })
    );
  }, [gameState]);

  useEffect(() => {
    const engine = gameEngineRef.current;

    // The GameBoard registers its own onBoardChange for the 60fps piece
    // updates; the screen only re-renders on state/stats changes
    engine.setCallbacks({
      onStateChange: setGameState,
      onStatsChange: setStats,
    });

    engine.startGame(level, speedSetting, savedTotalScore);
    
    // Game loop
    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      
      // Only update if the game is playing
      if (gameStateRef.current === GameState.PLAYING) {
        engine.update(deltaTime);
      }
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [level, speedSetting]);

  const handlePause = () => {
    const engine = gameEngineRef.current;
    if (gameState === GameState.PLAYING) {
      engine.pause();
    } else if (gameState === GameState.PAUSED) {
      engine.resume();
    }
  };

  const handleRestart = () => {
    gameEngineRef.current.startGame(level, speedSetting, savedTotalScore);
  };

  const handleNextLevel = () => {
    const currentStats = gameEngineRef.current.getStats();
    onGameComplete(level, currentStats.score);
    gameEngineRef.current.startGame(level + 1, speedSetting, currentStats.score);
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const scoreAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const pauseButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pauseButtonScale.value }],
  }));

  if (gameState === GameState.GAME_OVER || gameState === GameState.LEVEL_COMPLETE) {
    return (
      <GameOverScreen
        isWin={gameState === GameState.LEVEL_COMPLETE}
        score={stats.score}
        level={stats.level}
        onRestart={handleRestart}
        onNextLevel={gameState === GameState.LEVEL_COMPLETE ? handleNextLevel : undefined}
        onBackToMenu={onBackToMenu}
      />
    );
  }

  return (
    <GameControls gameEngine={gameEngineRef.current}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundLight]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.header, headerAnimatedStyle]}>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>LEVEL</Text>
                <Text style={styles.statValue}>{stats.level}</Text>
              </View>
              
              <Animated.View style={[styles.statItem, scoreAnimatedStyle]}>
                <Text style={styles.statLabel}>SCORE</Text>
                <Text style={styles.statValue}>{stats.score}</Text>
              </Animated.View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>VIRUSES</Text>
                <Text style={styles.statValue}>{stats.virusCount}</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>NEXT</Text>
                <View style={styles.nextCapsule}>
                  {gameEngineRef.current.getNextPill()?.colors.map((color, index) => (
                    <View
                      key={index}
                      style={[
                        styles.nextCapsuleHalf,
                        { backgroundColor: COLOR_VALUES[color] },
                        index === 0 ? styles.nextCapsuleLeft : styles.nextCapsuleRight,
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>
          
          <View style={styles.gameArea}>
            {/* Left side panel for desktop */}
            {isWeb && screenWidth > 1200 && (
              <View style={styles.leftPanel}>
                <View style={styles.sideStats}>
                  <Text style={styles.sidePanelTitle}>Game Stats</Text>
                  <View style={styles.sideStatItem}>
                    <Text style={styles.sideStatLabel}>Level</Text>
                    <Text style={styles.sideStatValue}>{stats.level}</Text>
                  </View>
                  <View style={styles.sideStatItem}>
                    <Text style={styles.sideStatLabel}>Score</Text>
                    <Text style={styles.sideStatValue}>{stats.score}</Text>
                  </View>
                  <View style={styles.sideStatItem}>
                    <Text style={styles.sideStatLabel}>Viruses Left</Text>
                    <Text style={styles.sideStatValue}>{stats.virusCount}</Text>
                  </View>
                  <View style={styles.sideStatItem}>
                    <Text style={styles.sideStatLabel}>Capsules</Text>
                    <Text style={styles.sideStatValue}>{stats.capsulesPlaced}</Text>
                  </View>
                  <View style={styles.sideStatItem}>
                    <Text style={styles.sideStatLabel}>Speed Level</Text>
                    <Text style={styles.sideStatValue}>{stats.currentSpeedLevel}/49</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Main game board */}
            <View style={styles.boardContainer}>
              <GameBoard gameEngine={gameEngineRef.current} />

              {gameState === GameState.PAUSED && (
                <Animated.View style={styles.pauseOverlay}>
                  <LinearGradient
                    colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']}
                    style={styles.pauseGradient}
                  >
                    <Text style={styles.pauseText}>PAUSED</Text>
                    <Text style={styles.pauseSubtext}>Tap resume to continue</Text>
                  </LinearGradient>
                </Animated.View>
              )}
            </View>

            {/* Additional desktop controls - only show on web */}
            {isWeb && screenWidth > 1200 && (
              <View style={styles.desktopControls}>
                <Text style={styles.controlsTitle}>Controls</Text>
                <Text style={styles.controlText}>← → Move</Text>
                <Text style={styles.controlText}>↓ Fast Drop</Text>
                <Text style={styles.controlText}>Space Rotate</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </GameControls>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: responsiveSpacing(20),
    paddingTop: isWeb ? responsiveSpacing(5) : responsiveSpacing(10), // Less top padding on web
    paddingBottom: isWeb ? responsiveSpacing(10) : responsiveSpacing(20), // Less bottom padding on web
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: isWeb ? responsiveSpacing(8) : responsiveSpacing(16), // Less margin on web
    flexWrap: 'wrap',
    gap: responsiveSpacing(8),
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: isWeb ? responsiveSpacing(8) : responsiveSpacing(16), // Smaller padding for more items
    paddingVertical: isWeb ? responsiveSpacing(6) : responsiveSpacing(10),
    borderRadius: theme.borderRadius.md,
    minWidth: isWeb ? responsiveSpacing(65) : responsiveSpacing(80), // Smaller min width for more items
    flex: isWeb ? 0 : 1, // Allow flex on mobile, fixed on web
  },
  statLabel: {
    fontSize: responsiveFontSize(12),
    color: theme.colors.text.secondary,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: responsiveFontSize(24),
    color: theme.colors.text.primary,
    fontWeight: '800',
  },
  nextCapsule: {
    flexDirection: 'row',
    marginTop: responsiveSpacing(6),
  },
  nextCapsuleHalf: {
    width: responsiveSpacing(18),
    height: responsiveSpacing(18),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  nextCapsuleLeft: {
    borderTopLeftRadius: 9,
    borderBottomLeftRadius: 9,
  },
  nextCapsuleRight: {
    borderTopRightRadius: 9,
    borderBottomRightRadius: 9,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: responsiveSpacing(12),
  },
  controlButton: {
    paddingHorizontal: responsiveSpacing(24),
    paddingVertical: responsiveSpacing(12),
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  controlButtonText: {
    color: theme.colors.text.primary,
    fontWeight: '700',
    fontSize: responsiveFontSize(14),
    letterSpacing: 1,
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Add scroll fallback for constrained spaces
    ...(isWeb ? {
      overflow: 'auto', // Allow scrolling if content doesn't fit
      maxHeight: '100%', // Don't exceed parent height
    } : {}),
    // On desktop, create a horizontal layout if screen is wide enough
    ...(isWeb && screenWidth > 1200 ? {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-start',
      paddingHorizontal: responsiveSpacing(20), // Reduced padding
    } : {}),
  },
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseGradient: {
    paddingHorizontal: responsiveSpacing(60),
    paddingVertical: responsiveSpacing(40),
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
  },
  pauseText: {
    fontSize: responsiveFontSize(48),
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  pauseSubtext: {
    fontSize: responsiveFontSize(16),
    color: theme.colors.text.secondary,
    marginTop: responsiveSpacing(12),
  },
  nextPillContainer: {
    // On wide desktop screens, position relative instead of absolute for better layout
    ...(isWeb && screenWidth > 1200 ? {
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      padding: responsiveSpacing(20),
      borderRadius: theme.borderRadius.md,
      ...theme.shadows.sm,
      marginLeft: responsiveSpacing(20),
      minWidth: responsiveSpacing(120),
    } : {
      position: 'absolute',
      top: responsiveSpacing(100),
      right: responsiveSpacing(20),
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      padding: responsiveSpacing(16),
      borderRadius: theme.borderRadius.md,
      ...theme.shadows.sm,
    }),
  },
  nextPillLabel: {
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
    color: theme.colors.text.primary,
    letterSpacing: 1,
    marginBottom: responsiveSpacing(8),
  },
  nextPillPreview: {
    width: responsiveSpacing(60),
    height: responsiveSpacing(30),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  leftPanel: {
    width: responsiveSpacing(200),
    marginRight: responsiveSpacing(20),
  },
  sideStats: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: responsiveSpacing(20),
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  sidePanelTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: responsiveSpacing(16),
    textAlign: 'center',
  },
  sideStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: responsiveSpacing(12),
  },
  sideStatLabel: {
    fontSize: responsiveFontSize(14),
    color: theme.colors.text.secondary,
  },
  sideStatValue: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  boardContainer: {
    // Fill the remaining space so the board can measure it and size its
    // cells to fit the device
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    ...(isWeb ? {
      maxHeight: '80vh' as any, // Don't exceed the viewport on web
    } : {}),
  },
  desktopControls: {
    marginTop: responsiveSpacing(20),
    paddingTop: responsiveSpacing(16),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  controlsTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: responsiveSpacing(12),
    textAlign: 'center',
  },
  controlText: {
    fontSize: responsiveFontSize(12),
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: responsiveSpacing(4),
  },
  speedLevel: {
    fontSize: responsiveFontSize(10),
    color: theme.colors.warning,
    fontWeight: '600',
    marginTop: 2,
  },
});