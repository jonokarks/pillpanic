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
import { LinearGradient } from 'expo-linear-gradient';
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
  onStartGame: (level: number) => void;
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

// Memoized level button for better performance
const LevelButton = memo(({ 
  level, 
  index, 
  onPress,
  isVisible 
}: { 
  level: number; 
  index: number; 
  onPress: () => void;
  isVisible: boolean;
}) => {
  const scale = useSharedValue(0);
  const pressed = useSharedValue(false);

  useEffect(() => {
    if (isVisible) {
      scale.value = withSequence(
        withTiming(0, { duration: 100 * index }),
        withSpring(1, { damping: 10, stiffness: 150 })
      );
    }
  }, [isVisible, index]);

  const animatedStyle = useAnimatedStyle(() => {
    const pressScale = pressed.value ? 0.9 : 1;
    return {
      transform: [{ scale: scale.value * pressScale }],
      opacity: scale.value,
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPressIn={() => (pressed.value = true)}
        onPressOut={() => (pressed.value = false)}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={theme.colors.secondary.blueGradient}
          style={styles.levelButton}
        >
          <Text style={styles.levelButtonText}>{level}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const MenuScreen: React.FC<MenuScreenProps> = ({ onStartGame }) => {
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
        <View style={styles.levelContainer}>
          <Text style={styles.levelTitle}>Select Level</Text>
          <View style={styles.levelButtons}>
            {[1, 2, 3, 4, 5].map((level, index) => (
              <LevelButton
                key={level}
                level={level}
                index={index}
                onPress={() => {
                  console.log('Level button pressed:', level);
                  onStartGame(level);
                }}
                isVisible={isContentVisible}
              />
            ))}
          </View>
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
  levelContainer: {
    marginBottom: responsiveSpacing(40),
  },
  levelTitle: {
    fontSize: responsiveFontSize(28),
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: responsiveSpacing(24),
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  levelButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: responsiveSpacing(12),
    flexWrap: 'wrap',
  },
  levelButton: {
    width: responsiveSpacing(60),
    height: responsiveSpacing(60),
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  levelButtonText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(24),
    fontWeight: '800',
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
});