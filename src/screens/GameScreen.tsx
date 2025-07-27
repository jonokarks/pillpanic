import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
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
import { GameState } from '../game/utils/constants';
import { GameStats } from '../game/utils/types';
import { GameOverScreen } from './GameOverScreen';
import { theme, responsiveFontSize, responsiveSpacing } from '../utils/theme';

interface GameScreenProps {
  level: number;
  onBackToMenu: () => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const GameScreen: React.FC<GameScreenProps> = ({ level, onBackToMenu }) => {
  const gameEngineRef = useRef<GameEngine>(new GameEngine());
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>(GameState.PLAYING);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    level: level,
    virusCount: 0,
    linesCleared: 0,
  });
  const [boardUpdate, setBoardUpdate] = useState(0);

  const headerOpacity = useSharedValue(0);
  const scoreScale = useSharedValue(1);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500 });
  }, []);

  useEffect(() => {
    scoreScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
  }, [stats.score]);

  useEffect(() => {
    const engine = gameEngineRef.current;
    
    engine.setCallbacks({
      onStateChange: setGameState,
      onStatsChange: setStats,
      onBoardChange: () => setBoardUpdate(prev => prev + 1),
    });
    
    engine.startGame(level);
    
    // Game loop
    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      
      engine.update(deltaTime);
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [level]);

  const handlePause = () => {
    const engine = gameEngineRef.current;
    if (gameState === GameState.PLAYING) {
      engine.pause();
    } else if (gameState === GameState.PAUSED) {
      engine.resume();
    }
  };

  const handleRestart = () => {
    gameEngineRef.current.startGame(level);
  };

  const handleNextLevel = () => {
    gameEngineRef.current.startGame(level + 1);
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const scoreAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
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
            </View>
            
            <View style={styles.controls}>
              <TouchableOpacity onPress={handlePause} activeOpacity={0.8}>
                <LinearGradient
                  colors={gameState === GameState.PAUSED ? theme.colors.success : theme.colors.secondary.blueGradient}
                  style={styles.controlButton}
                >
                  <Text style={styles.controlButtonText}>
                    {gameState === GameState.PAUSED ? 'RESUME' : 'PAUSE'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={onBackToMenu} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#666', '#444']}
                  style={styles.controlButton}
                >
                  <Text style={styles.controlButtonText}>MENU</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
          
          <View style={styles.gameArea}>
            <GameBoard
              board={gameEngineRef.current.getBoard()}
              fallingPills={gameEngineRef.current.getAllFallingPills()}
              activePillIndex={gameEngineRef.current.getActivePillIndex()}
            />
            
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
          
          <View style={styles.nextPillContainer}>
            <Text style={styles.nextPillLabel}>NEXT</Text>
            <View style={styles.nextPillPreview}>
              {/* Next pill preview will be implemented later */}
            </View>
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
    paddingTop: responsiveSpacing(10),
    paddingBottom: responsiveSpacing(20),
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: responsiveSpacing(16),
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: responsiveSpacing(20),
    paddingVertical: responsiveSpacing(12),
    borderRadius: theme.borderRadius.md,
    minWidth: responsiveSpacing(100),
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
    position: 'absolute',
    top: responsiveSpacing(100),
    right: responsiveSpacing(20),
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: responsiveSpacing(16),
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
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
});