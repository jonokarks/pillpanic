import React, { useEffect, useMemo, memo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  SafeAreaView,
  ScrollView,
  Platform 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { theme, responsiveFontSize, responsiveSpacing, platformSelect } from '../utils/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface MenuScreenProps {
  onStartNewGame: () => void;
  onContinueGame: () => void;
  onOpenSettings: () => void;
  hasSavedGame: boolean;
  savedLevel?: number;
}

// Memoized animated pill component for better performance
const AnimatedPill = memo(({ index, color }: { index: number; color: string[] }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Fade in animation
    opacity.value = withTiming(0.15, { duration: 1000 });
    
    // Floating animation with different timing for each pill
    translateY.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 3000 + index * 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000 + index * 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Gentle horizontal movement
    translateX.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 4000 + index * 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(-10, { duration: 4000 + index * 300, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
    opacity: opacity.value,
  }));

  // Fixed positions for pills (no random values)
  const positions = [
    { top: '10%', left: '15%' },
    { top: '25%', right: '20%' },
    { top: '60%', left: '10%' },
  ];

  const position = positions[index % positions.length];

  return (
    <Animated.View style={[styles.floatingPill, position, animatedStyle]}>
      <LinearGradient colors={color} style={styles.pillGradient} />
    </Animated.View>
  );
});


export const MenuScreen: React.FC<MenuScreenProps> = ({ 
  onStartNewGame, 
  onContinueGame, 
  onOpenSettings, 
  hasSavedGame,
  savedLevel 
}) => {
  const titleOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const [isContentVisible, setIsContentVisible] = React.useState(false);

  useEffect(() => {
    // Smooth fade in for title
    titleOpacity.value = withTiming(1, { duration: 800 });
    
    // Delay content appearance
    setTimeout(() => {
      setIsContentVisible(true);
      contentOpacity.value = withTiming(1, { duration: 600 });
    }, 400);
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: interpolate(titleOpacity.value, [0, 1], [20, 0]) }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Memoize pill colors to prevent recreation
  const pillColors = useMemo(() => [
    theme.colors.pill.red,
    theme.colors.pill.blue,
    theme.colors.pill.yellow,
  ], []);

  const content = (
    <View style={styles.innerContainer}>
      {/* Optimized floating pills - only 3 for better performance */}
      <View style={styles.floatingPillsContainer} pointerEvents="none">
        {pillColors.map((color, index) => (
          <AnimatedPill key={index} index={index} color={color} />
        ))}
      </View>

      <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
        <Text style={styles.title}>PILL</Text>
        <Text style={styles.titleAccent}>PANIC</Text>
        <Text style={styles.subtitle}>A Dr. Mario inspired puzzle game</Text>
      </Animated.View>

      <Animated.View style={[styles.contentWrapper, contentAnimatedStyle]}>
        <View style={styles.menuButtonsContainer}>
          {hasSavedGame && (
            <TouchableOpacity
              onPress={onContinueGame}
              activeOpacity={0.8}
              style={styles.menuButton}
            >
              <LinearGradient
                colors={theme.colors.successGradient}
                style={styles.continueButton}
              >
                <Text style={styles.continueButtonText}>CONTINUE</Text>
                <Text style={styles.continueSubtext}>Level {savedLevel}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={onStartNewGame}
            activeOpacity={0.8}
            style={styles.menuButton}
          >
            <LinearGradient
              colors={theme.colors.secondary.blueGradient}
              style={styles.button}
            >
              <Text style={styles.buttonText}>NEW GAME</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={onOpenSettings}
            activeOpacity={0.8}
            style={styles.menuButton}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>SETTINGS</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.instructionsCard}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.instructionsGradient}
          >
            <Text style={styles.instructionTitle}>How to Play</Text>
            <View style={styles.instructionsList}>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot} />
                <Text style={styles.instructionText}>Match 4 or more same-colored blocks</Text>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot} />
                <Text style={styles.instructionText}>Clear all viruses to win</Text>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot} />
                <Text style={styles.instructionText}>
                  {isWeb ? 'Click to rotate, arrow keys to move' : 'Tap to rotate, swipe to move'}
                </Text>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot} />
                <Text style={styles.instructionText}>
                  {isWeb ? 'Press down arrow to drop' : 'Swipe down fast to drop'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    </View>
  );

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.backgroundLight]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {isWeb && screenWidth > 768 ? (
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentInsetAdjustmentBehavior="never"
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: responsiveSpacing(20),
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    maxWidth: theme.dimensions.maxContentWidth,
    alignSelf: 'center',
  },
  floatingPillsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingPill: {
    position: 'absolute',
    width: platformSelect({ web: 80, default: 60 }),
    height: platformSelect({ web: 25, default: 20 }),
    borderRadius: platformSelect({ web: 12, default: 10 }),
  },
  pillGradient: {
    flex: 1,
    borderRadius: platformSelect({ web: 12, default: 10 }),
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: responsiveSpacing(platformSelect({ web: 40, default: 60 })),
    marginBottom: responsiveSpacing(40),
  },
  title: {
    fontSize: responsiveFontSize(platformSelect({ web: 56, default: 64 })),
    fontWeight: '900',
    color: theme.colors.primary.red,
    letterSpacing: 4,
    textShadowColor: theme.colors.primary.redDark,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  titleAccent: {
    fontSize: responsiveFontSize(platformSelect({ web: 56, default: 64 })),
    fontWeight: '900',
    color: theme.colors.secondary.blue,
    letterSpacing: 4,
    marginTop: -responsiveSpacing(20),
    textShadowColor: theme.colors.secondary.blueDark,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: responsiveFontSize(18),
    color: theme.colors.text.secondary,
    marginTop: responsiveSpacing(16),
    fontWeight: '500',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: responsiveSpacing(20),
  },
  menuButtonsContainer: {
    marginBottom: responsiveSpacing(40),
    alignItems: 'center',
    gap: responsiveSpacing(16),
  },
  menuButton: {
    width: '100%',
    maxWidth: 300,
  },
  instructionsCard: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
    maxWidth: platformSelect({ web: 600, default: '100%' }),
    alignSelf: 'center',
    width: '100%',
  },
  instructionsGradient: {
    padding: responsiveSpacing(24),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.xl,
  },
  instructionTitle: {
    fontSize: responsiveFontSize(24),
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: responsiveSpacing(20),
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  instructionsList: {
    gap: responsiveSpacing(12),
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSpacing(12),
  },
  instructionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  instructionText: {
    fontSize: responsiveFontSize(16),
    color: theme.colors.text.secondary,
    flex: 1,
  },
  speedContainer: {
    marginBottom: responsiveSpacing(30),
    alignItems: 'center',
  },
  speedTitle: {
    fontSize: responsiveFontSize(24),
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: responsiveSpacing(16),
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  speedButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: responsiveSpacing(12),
    marginBottom: responsiveSpacing(12),
  },
  speedButton: {
    paddingHorizontal: responsiveSpacing(20),
    paddingVertical: responsiveSpacing(12),
    borderRadius: theme.borderRadius.md,
    minWidth: responsiveSpacing(80),
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  selectedSpeedButton: {
    ...theme.shadows.md,
  },
  speedButtonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textTransform: 'capitalize',
  },
  selectedSpeedButtonText: {
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  speedDescription: {
    fontSize: responsiveFontSize(14),
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
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
    fontSize: responsiveFontSize(20),
    fontWeight: '800',
    letterSpacing: 1,
  },
  continueButton: {
    paddingHorizontal: responsiveSpacing(40),
    paddingVertical: responsiveSpacing(18),
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  continueButtonText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(20),
    fontWeight: '800',
    letterSpacing: 1,
  },
  continueSubtext: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.9,
  },
});