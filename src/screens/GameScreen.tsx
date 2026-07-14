import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, useWindowDimensions, AppState } from 'react-native';

const isWeb = Platform.OS === 'web';
import { LinearGradient } from 'expo-linear-gradient';
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
import { GameStats, SpeedSetting, GameMode, GameFeedbackEvent, EndlessSnapshot } from '../game/utils/types';
import { GameOverScreen } from './GameOverScreen';
import { theme, responsiveFontSize, responsiveSpacing } from '../utils/theme';

interface GameScreenProps {
  level: number;
  speedSetting: SpeedSetting;
  gameMode: GameMode;
  // When resuming an Endless run, the snapshot to restore (else null = fresh)
  endlessSnapshot?: EndlessSnapshot | null;
  onBackToMenu: () => void;
  onGameComplete: (level: number, totalScore: number) => void;
  onEndlessCheckpoint?: (snapshot: EndlessSnapshot) => void;
  onEndlessEnded?: () => void;
  savedTotalScore: number;
  reducedMotion: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const GameScreen: React.FC<GameScreenProps> = ({
  level,
  speedSetting,
  gameMode,
  endlessSnapshot,
  onBackToMenu,
  onGameComplete,
  onEndlessCheckpoint,
  onEndlessEnded,
  savedTotalScore,
  reducedMotion,
}) => {
  const gameEngineRef = useRef<GameEngine | undefined>(undefined);

  // Initialize GameEngine only once
  if (!gameEngineRef.current) {
    gameEngineRef.current = new GameEngine();
  }
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const { width: windowWidth } = useWindowDimensions();
  const showSidePanels = isWeb && windowWidth > 1200;

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
  const [feedback, setFeedback] = useState<{ title: string; detail: string } | null>(null);
  // Measured px box available for the board, so it fits exactly between the
  // header and the bottom safe area instead of overflowing into them
  const [boardBox, setBoardBox] = useState<{ w: number; h: number } | null>(null);

  const headerOpacity = useSharedValue(0);
  const scoreScale = useSharedValue(1);
  const pauseButtonScale = useSharedValue(1);
  const boardPulse = useSharedValue(1);
  const feedbackProgress = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: reducedMotion ? 1 : 500 });
  }, []);

  // Keep gameStateRef in sync with gameState
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (reducedMotion) return;
    scoreScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
  }, [stats.score, reducedMotion]);

  useEffect(() => {
    pauseButtonScale.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 300 })
    );
  }, [gameState]);

  const handleFeedback = (event: GameFeedbackEvent) => {
    if (!reducedMotion) {
      boardPulse.value = withSequence(
        withSpring(event.type === 'match' ? 1.025 : 0.992, { damping: 16, stiffness: 320 }),
        withSpring(1, { damping: 16, stiffness: 260 })
      );
    }
    if (event.type === 'match') {
      setFeedback({
        title: event.combo > 1 ? `Chain x${event.combo}` : 'Clean match',
        detail: `+${event.cleared * 100 * event.combo}`,
      });
      feedbackProgress.value = 0;
      feedbackProgress.value = withSequence(
        withTiming(1, { duration: reducedMotion ? 1 : 180 }),
        withTiming(1, { duration: reducedMotion ? 350 : 520 }),
        withTiming(0, { duration: reducedMotion ? 1 : 260 })
      );
    } else if (event.type === 'wave') {
      setFeedback({ title: 'Fresh wave', detail: `Tray ${event.level}` });
      feedbackProgress.value = withSequence(withTiming(1, { duration: reducedMotion ? 1 : 180 }), withTiming(0, { duration: reducedMotion ? 500 : 900 }));
      // Checkpoint the Endless run at the start of every new wave
      saveEndlessCheckpoint();
    }
  };

  // The snapshot to resume from is fixed for this mount
  const initialSnapshotRef = useRef(endlessSnapshot);
  // Latest persistence callbacks, read through refs so the engine's captured
  // handlers never call a stale version
  const checkpointRef = useRef(onEndlessCheckpoint);
  const endedRef = useRef(onEndlessEnded);
  useEffect(() => {
    checkpointRef.current = onEndlessCheckpoint;
    endedRef.current = onEndlessEnded;
  });

  // Persist the Endless run if it's still live (never resurrect a dead run)
  const saveEndlessCheckpoint = () => {
    if (gameMode !== GameMode.ENDLESS || !checkpointRef.current) return;
    const engine = gameEngineRef.current!;
    const state = engine.getGameState();
    if (state === GameState.PLAYING || state === GameState.PAUSED) {
      checkpointRef.current(engine.serializeEndless());
    }
  };

  // Save on exit; a no-op for Classic
  const handleExitToMenu = () => {
    saveEndlessCheckpoint();
    onBackToMenu();
  };

  useEffect(() => {
    const engine = gameEngineRef.current!;

    // The board renderer registers its own onBoardChange; this screen only
    // needs the low-frequency state/stats updates
    engine.setCallbacks({
      onStateChange: setGameState,
      onStatsChange: setStats,
      onFeedback: handleFeedback,
    });

    if (gameMode === GameMode.ENDLESS && initialSnapshotRef.current) {
      engine.loadEndless(initialSnapshotRef.current);
    } else {
      engine.startGame(level, speedSetting, savedTotalScore, gameMode);
    }
    
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
  }, [level, speedSetting, gameMode]);

  // A finished Endless run can't be resumed: drop its save on game over
  useEffect(() => {
    if (gameMode === GameMode.ENDLESS && gameState === GameState.GAME_OVER) {
      endedRef.current?.();
    }
  }, [gameState, gameMode]);

  // Checkpoint when the app is sent to the background (task switch, lock)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        saveEndlessCheckpoint();
      }
    });
    return () => sub.remove();
  }, [gameMode]);

  const handlePause = () => {
    const engine = gameEngineRef.current!;
    if (gameState === GameState.PLAYING) {
      engine.pause();
    } else if (gameState === GameState.PAUSED) {
      engine.resume();
    }
  };

  const handleRestart = () => {
    gameEngineRef.current!.startGame(level, speedSetting, savedTotalScore, gameMode);
  };

  const handleNextLevel = () => {
    const currentStats = gameEngineRef.current!.getStats();
    onGameComplete(level, currentStats.score);
    gameEngineRef.current!.startGame(level + 1, speedSetting, currentStats.score);
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

  const boardPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: boardPulse.value }] }));
  const feedbackStyle = useAnimatedStyle(() => ({
    opacity: feedbackProgress.value,
    transform: [{ translateY: interpolate(feedbackProgress.value, [0, 1], [12, 0]) }],
  }));

  if (gameState === GameState.GAME_OVER || gameState === GameState.LEVEL_COMPLETE) {
    return (
      <GameOverScreen
        isWin={gameState === GameState.LEVEL_COMPLETE}
        score={stats.score}
        level={stats.level}
        onRestart={handleRestart}
        onNextLevel={gameState === GameState.LEVEL_COMPLETE && gameMode === GameMode.CLASSIC ? handleNextLevel : undefined}
        onBackToMenu={onBackToMenu}
        reducedMotion={reducedMotion}
      />
    );
  }

  const nextPillColors = gameEngineRef.current!.getNextPill()?.colors ?? [];

  return (
    <GameControls gameEngine={gameEngineRef.current!}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundLight]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.header, headerAnimatedStyle]}>
            <View style={styles.hudBar}>
              <View style={styles.levelChip}>
                <Text style={styles.hudLabel}>{gameMode === GameMode.ENDLESS ? 'Wave' : 'Level'}</Text>
                <Text style={styles.levelValue}>{stats.level}</Text>
              </View>
              
              <Animated.View style={[styles.scoreCapsule, scoreAnimatedStyle]}>
                <Text style={styles.hudLabel}>Score</Text>
                <Text style={styles.scoreValue}>{stats.score}</Text>
              </Animated.View>
              
              <AnimatedTouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={gameState === GameState.PAUSED ? 'Resume game' : 'Pause game'}
                onPress={handlePause}
                activeOpacity={0.82}
                style={[styles.pauseButton, pauseButtonAnimatedStyle]}
              >
                <Text style={styles.pauseButtonText}>{gameState === GameState.PAUSED ? '>' : '||'}</Text>
              </AnimatedTouchableOpacity>
            </View>

            <View style={styles.contextBar}>
              <View style={styles.virusCounter}>
                <View style={styles.microbeDot} />
                <Text style={styles.contextText}>{stats.virusCount} microbes</Text>
              </View>

              <View style={styles.nextWell}>
                <Text style={styles.nextLabel}>Up next</Text>
                <View style={styles.nextCapsule}>
                  {nextPillColors.map((color, index) => (
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
          
          <View
            style={[styles.gameArea, showSidePanels && styles.gameAreaWide]}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setBoardBox(prev =>
                prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1
                  ? prev
                  : { w: width, h: height }
              );
            }}
          >
            {/* Left side panel for desktop */}
            {showSidePanels && (
              <View style={styles.leftPanel}>
                <View style={styles.sideStats}>
                  <Text style={styles.sidePanelTitle}>Game Stats</Text>
                  <View style={styles.sideStatItem}>
                    <Text style={styles.sideStatLabel}>{gameMode === GameMode.ENDLESS ? 'Wave' : 'Level'}</Text>
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
                    <Text style={styles.sideStatLabel}>Mode</Text>
                    <Text style={styles.sideStatValue}>{gameMode === GameMode.ENDLESS ? 'Endless' : 'Classic'}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Main game board */}
            <Animated.View style={[styles.boardContainer, boardPulseStyle]}>
              <GameBoard
                gameEngine={gameEngineRef.current!}
                reducedMotion={reducedMotion}
                availableWidth={boardBox?.w}
                availableHeight={boardBox?.h}
              />

              {feedback && gameState === GameState.PLAYING && (
                <Animated.View pointerEvents="none" style={[styles.feedbackToast, feedbackStyle]} accessibilityLiveRegion="polite">
                  <Text style={styles.feedbackTitle}>{feedback.title}</Text>
                  <Text style={styles.feedbackDetail}>{feedback.detail}</Text>
                </Animated.View>
              )}

              {gameState === GameState.PAUSED && (
                <Animated.View style={styles.pauseOverlay}>
                  <LinearGradient
                    colors={[theme.colors.pauseFrost, 'rgba(20,28,46,0.88)']}
                    style={styles.pauseGradient}
                  >
                    <Text style={styles.pauseText}>Paused</Text>
                    <Text style={styles.pauseSubtext}>Your lab run is waiting.</Text>
                    <View style={styles.pauseActions}>
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Resume game" onPress={handlePause} activeOpacity={0.84} style={styles.pausePrimary}>
                        <Text style={styles.pausePrimaryText}>Resume</Text>
                      </TouchableOpacity>
                      <View style={styles.pauseSecondaryRow}>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Restart game" onPress={handleRestart} activeOpacity={0.84} style={styles.pauseSecondary}>
                          <Text style={styles.pauseSecondaryText}>Restart</Text>
                        </TouchableOpacity>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Return to menu" onPress={handleExitToMenu} activeOpacity={0.84} style={styles.pauseSecondary}>
                          <Text style={styles.pauseSecondaryText}>Menu</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                </Animated.View>
              )}
            </Animated.View>

            {/* Additional desktop controls - only show on web */}
            {showSidePanels && (
              <View style={styles.desktopControls}>
                <Text style={styles.controlsTitle}>Controls</Text>
                <Text style={styles.controlText}>Left / Right Move</Text>
                <Text style={styles.controlText}>Down Fast Drop</Text>
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
    paddingTop: isWeb ? responsiveSpacing(8) : responsiveSpacing(10),
    paddingBottom: responsiveSpacing(10),
  },
  hudBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: responsiveSpacing(10),
  },
  levelChip: {
    minWidth: responsiveSpacing(84),
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceGlass,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: responsiveSpacing(14),
  },
  scoreCapsule: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(88,214,183,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(88,214,183,0.34)',
    paddingHorizontal: responsiveSpacing(18),
    ...theme.shadows.sm,
  },
  hudLabel: {
    fontSize: responsiveFontSize(11),
    color: theme.colors.text.secondary,
    fontWeight: '800',
    marginBottom: 2,
  },
  levelValue: {
    fontSize: responsiveFontSize(22),
    color: theme.colors.text.primary,
    fontWeight: '900',
  },
  scoreValue: {
    fontSize: responsiveFontSize(25),
    color: theme.colors.text.primary,
    fontWeight: '900',
  },
  pauseButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  pauseButtonText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(18),
    fontWeight: '900',
    lineHeight: responsiveFontSize(20),
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: responsiveSpacing(10),
    gap: responsiveSpacing(10),
  },
  virusCounter: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSpacing(8),
    paddingHorizontal: responsiveSpacing(14),
    paddingVertical: responsiveSpacing(8),
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  microbeDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.tertiary.yellow,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  contextText: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(13),
    fontWeight: '800',
  },
  nextWell: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSpacing(9),
    paddingHorizontal: responsiveSpacing(14),
    paddingVertical: responsiveSpacing(8),
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  nextLabel: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(12),
    fontWeight: '800',
  },
  nextCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextCapsuleHalf: {
    width: responsiveSpacing(20),
    height: responsiveSpacing(22),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  nextCapsuleLeft: {
    borderTopLeftRadius: 11,
    borderBottomLeftRadius: 11,
  },
  nextCapsuleRight: {
    borderTopRightRadius: 11,
    borderBottomRightRadius: 11,
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
    ...(isWeb ? ({
      overflow: 'auto', // Allow scrolling if content doesn't fit
      maxHeight: '100%', // Don't exceed parent height
    } as any) : {}),
  },
  // Horizontal layout with side panels on wide desktop windows
  gameAreaWide: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingHorizontal: responsiveSpacing(20),
  },
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(8,12,22,0.28)',
  },
  pauseGradient: {
    width: '82%',
    maxWidth: 320,
    paddingHorizontal: responsiveSpacing(24),
    paddingVertical: responsiveSpacing(24),
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  pauseText: {
    fontSize: responsiveFontSize(34),
    fontWeight: '900',
    color: theme.colors.text.primary,
  },
  pauseSubtext: {
    fontSize: responsiveFontSize(14),
    color: theme.colors.text.secondary,
    fontWeight: '700',
    marginTop: responsiveSpacing(6),
    marginBottom: responsiveSpacing(18),
  },
  pauseActions: {
    width: '100%',
    gap: responsiveSpacing(10),
  },
  pausePrimary: {
    minHeight: 50,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary.red,
  },
  pausePrimaryText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(16),
    fontWeight: '900',
  },
  pauseSecondaryRow: {
    flexDirection: 'row',
    gap: responsiveSpacing(10),
  },
  pauseSecondary: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pauseSecondaryText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(14),
    fontWeight: '900',
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
    alignItems: 'center',
    justifyContent: 'center',
    // Ensure board container doesn't exceed available space
    ...(isWeb ? ({
      maxHeight: '80vh', // Maximum 80% of viewport height
      overflow: 'visible', // Let board be visible even if it overflows slightly
    } as any) : {}),
  },
  feedbackToast: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    minWidth: 150,
    paddingHorizontal: responsiveSpacing(18),
    paddingVertical: responsiveSpacing(11),
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(10,17,31,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(88,214,183,0.48)',
    alignItems: 'center',
    zIndex: 20,
    ...theme.shadows.md,
  },
  feedbackTitle: {
    color: theme.colors.mint,
    fontSize: responsiveFontSize(16),
    fontWeight: '900',
  },
  feedbackDetail: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(13),
    fontWeight: '900',
    marginTop: 2,
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
