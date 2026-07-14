import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { theme, responsiveFontSize, responsiveSpacing } from '../utils/theme';

interface GameOverScreenProps {
  isWin: boolean;
  score: number;
  level: number;
  onRestart: () => void;
  onNextLevel?: () => void;
  onBackToMenu: () => void;
  reducedMotion?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  isWin,
  score,
  level,
  onRestart,
  onNextLevel,
  onBackToMenu,
  reducedMotion = false,
}) => {
  const titleScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      titleScale.value = 1;
      contentOpacity.value = 1;
      buttonScale.value = 1;
      return;
    }
    titleScale.value = withSequence(
      withSpring(1.04, { damping: 12, stiffness: 180 }),
      withSpring(1, { damping: 16, stiffness: 150 })
    );
    contentOpacity.value = withTiming(1, { duration: 700 });
    buttonScale.value = withSequence(
      withTiming(0, { duration: 260 }),
      withSpring(1, { damping: 12, stiffness: 160 })
    );
  }, [reducedMotion]);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
    opacity: interpolate(titleScale.value, [0, 1], [0, 1]),
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: interpolate(contentOpacity.value, [0, 1], [14, 0]) }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(buttonScale.value, [0, 1], [0.96, 1]) },
      { translateY: interpolate(buttonScale.value, [0, 1], [20, 0]) },
    ],
    opacity: interpolate(buttonScale.value, [0, 1], [0, 1]),
  }));

  const primaryAction = isWin && onNextLevel ? onNextLevel : onRestart;
  const primaryLabel = isWin && onNextLevel ? 'Continue' : 'Retry';

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
            <View style={[styles.resultSeal, isWin ? styles.winSeal : styles.loseSeal]}>
              <View style={styles.resultSealInner} />
            </View>
            <Text style={styles.kicker}>{isWin ? 'Level complete' : 'Run ended'}</Text>
            <Text style={[styles.title, isWin ? styles.winTitle : styles.loseTitle]}>
              {isWin ? 'Lab Cleared' : 'Lab Overflow'}
            </Text>
            <Text style={styles.subtitle}>
              {isWin ? 'The tray is clean and ready for the next mix.' : 'So close. Reset the tray and try another run.'}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.statsCard, contentAnimatedStyle]}>
            <View style={styles.scoreMeter}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={styles.scoreValue}>{score}</Text>
            </View>
            <View style={styles.statGrid}>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Level</Text>
                <Text style={styles.statValue}>{level}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Seal</Text>
                <Text style={styles.statValue}>{isWin ? 'Clean' : 'Ready'}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
            <AnimatedTouchableOpacity accessibilityRole="button" accessibilityLabel={primaryLabel} onPress={primaryAction} activeOpacity={0.84}>
              <LinearGradient colors={isWin ? theme.colors.successGradient : theme.colors.primary.redGradient} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>

            <View style={styles.secondaryRow}>
              {isWin && (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Replay level" onPress={onRestart} activeOpacity={0.84} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Replay</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Return to menu" onPress={onBackToMenu} activeOpacity={0.84} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Menu</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
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
  resultSeal: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.26)',
    marginBottom: responsiveSpacing(18),
    ...theme.shadows.md,
  },
  winSeal: {
    backgroundColor: theme.colors.success,
  },
  loseSeal: {
    backgroundColor: theme.colors.primary.red,
  },
  resultSealInner: {
    width: 42,
    height: 18,
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.72)',
    transform: [{ rotate: '-24deg' }],
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: responsiveSpacing(24),
    maxWidth: 420,
  },
  kicker: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(13),
    fontWeight: '900',
    marginBottom: responsiveSpacing(8),
  },
  title: {
    fontSize: responsiveFontSize(42),
    fontWeight: '900',
    textAlign: 'center',
  },
  winTitle: {
    color: theme.colors.success,
  },
  loseTitle: {
    color: theme.colors.primary.red,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(15),
    fontWeight: '700',
    lineHeight: responsiveFontSize(21),
    textAlign: 'center',
    marginTop: responsiveSpacing(10),
  },
  statsCard: {
    width: '100%',
    maxWidth: 380,
    marginBottom: responsiveSpacing(24),
    borderRadius: theme.borderRadius.xl,
    padding: responsiveSpacing(18),
    backgroundColor: theme.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...theme.shadows.md,
  },
  scoreMeter: {
    minHeight: 88,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(88,214,183,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(88,214,183,0.30)',
    marginBottom: responsiveSpacing(12),
  },
  scoreLabel: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(13),
    fontWeight: '900',
  },
  scoreValue: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(34),
    fontWeight: '900',
    marginTop: 2,
  },
  statGrid: {
    flexDirection: 'row',
    gap: responsiveSpacing(10),
  },
  statTile: {
    flex: 1,
    padding: responsiveSpacing(13),
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  statLabel: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(12),
    fontWeight: '800',
    marginBottom: 4,
  },
  statValue: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(18),
    fontWeight: '900',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
    gap: responsiveSpacing(12),
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    ...theme.shadows.md,
  },
  primaryButtonText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(18),
    fontWeight: '900',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: responsiveSpacing(10),
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryButtonText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(15),
    fontWeight: '900',
  },
});
