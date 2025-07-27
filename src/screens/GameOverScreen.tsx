import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { theme, responsiveFontSize, responsiveSpacing } from '../utils/theme';

interface GameOverScreenProps {
  isWin: boolean;
  score: number;
  level: number;
  onRestart: () => void;
  onNextLevel?: () => void;
  onBackToMenu: () => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  isWin,
  score,
  level,
  onRestart,
  onNextLevel,
  onBackToMenu,
}) => {
  const titleScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0);

  useEffect(() => {
    titleScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 200 }),
      withSpring(1, { damping: 15, stiffness: 150 })
    );
    
    contentOpacity.value = withTiming(1, { duration: 800 });
    
    buttonScale.value = withSequence(
      withTiming(0, { duration: 400 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
    opacity: interpolate(titleScale.value, [0, 1], [0, 1]),
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const ButtonComponent = ({ 
    onPress, 
    colors, 
    text, 
    index 
  }: { 
    onPress: () => void; 
    colors: string[]; 
    text: string; 
    index: number;
  }) => {
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: interpolate(buttonScale.value, [0, 1], [0, 1]) },
        { translateY: interpolate(buttonScale.value, [0, 1], [50, 0]) },
      ],
      opacity: interpolate(buttonScale.value, [0, 1], [0, 1]),
    }));

    return (
      <AnimatedTouchableOpacity
        style={[animatedStyle, { zIndex: -index }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={colors}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{text}</Text>
        </LinearGradient>
      </AnimatedTouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.backgroundLight]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
            <Text style={[
              styles.title,
              isWin ? styles.winTitle : styles.loseTitle
            ]}>
              {isWin ? 'LEVEL' : 'GAME'}
            </Text>
            <Text style={[
              styles.titleAccent,
              isWin ? styles.winTitle : styles.loseTitle
            ]}>
              {isWin ? 'COMPLETE!' : 'OVER'}
            </Text>
          </Animated.View>
          
          <Animated.View style={[styles.statsCard, contentAnimatedStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.statsGradient}
            >
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Level</Text>
                <Text style={styles.statValue}>{level}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Final Score</Text>
                <Text style={styles.statValue}>{score}</Text>
              </View>
              {isWin && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.congratsText}>🎉 Congratulations! 🎉</Text>
                </>
              )}
            </LinearGradient>
          </Animated.View>
          
          <View style={styles.buttonContainer}>
            {isWin && onNextLevel && (
              <ButtonComponent
                onPress={onNextLevel}
                colors={theme.colors.success}
                text="NEXT LEVEL"
                index={0}
              />
            )}
            
            <ButtonComponent
              onPress={onRestart}
              colors={theme.colors.secondary.blueGradient}
              text="RESTART"
              index={1}
            />
            
            <ButtonComponent
              onPress={onBackToMenu}
              colors={['#666', '#444']}
              text="MAIN MENU"
              index={2}
            />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveSpacing(20),
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: responsiveSpacing(40),
  },
  title: {
    fontSize: responsiveFontSize(56),
    fontWeight: '900',
    letterSpacing: 4,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  titleAccent: {
    fontSize: responsiveFontSize(56),
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: -responsiveSpacing(16),
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  winTitle: {
    color: theme.colors.success,
    textShadowColor: 'rgba(78, 205, 196, 0.5)',
  },
  loseTitle: {
    color: theme.colors.error,
    textShadowColor: 'rgba(255, 107, 107, 0.5)',
  },
  statsCard: {
    width: '100%',
    marginBottom: responsiveSpacing(40),
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  statsGradient: {
    padding: responsiveSpacing(24),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.xl,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: responsiveSpacing(12),
  },
  statLabel: {
    fontSize: responsiveFontSize(18),
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  statValue: {
    fontSize: responsiveFontSize(28),
    color: theme.colors.text.primary,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: responsiveSpacing(8),
  },
  congratsText: {
    fontSize: responsiveFontSize(20),
    color: theme.colors.success,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: responsiveSpacing(8),
  },
  buttonContainer: {
    gap: responsiveSpacing(16),
    width: '100%',
    maxWidth: 300,
  },
  button: {
    paddingHorizontal: responsiveSpacing(40),
    paddingVertical: responsiveSpacing(18),
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(18),
    fontWeight: '800',
    letterSpacing: 1,
  },
});