import React, { memo, useEffect, useMemo } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { theme, responsiveFontSize, responsiveSpacing, platformSelect } from '../utils/theme';
import { SoundManager } from '../utils/SoundManager';

const isWeb = Platform.OS === 'web';

interface MenuScreenProps {
  onStartNewGame: () => void;
  onStartEndless: () => void;
  onResumeEndless: () => void;
  onContinueGame: () => void;
  onOpenSettings: () => void;
  onOpenLevels: () => void;
  onOpenTutorial: () => void;
  onOpenStats: () => void;
  hasSavedGame: boolean;
  savedLevel?: number;
  hasEndlessSave: boolean;
  endlessWave?: number;
  reducedMotion: boolean;
}

const AmbientCapsule = memo(({ index, color }: { index: number; color: readonly [string, string, ...string[]] }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(0.16, { duration: 900 });
    translateY.value = withRepeat(
      withSequence(
        withTiming(-18, { duration: 3600 + index * 420, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3600 + index * 420, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    translateX.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 4400 + index * 360, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 4400 + index * 360, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
  }));

  const positions: Array<{ top: `${number}%`; left?: `${number}%`; right?: `${number}%` }> = [
    { top: '12%', left: '12%' },
    { top: '24%', right: '16%' },
    { top: '66%', left: '8%' },
    { top: '72%', right: '10%' },
  ];

  return (
    <Animated.View style={[styles.ambientCapsule, positions[index % positions.length], animatedStyle]}>
      <LinearGradient colors={color} style={styles.ambientCapsuleFill} />
    </Animated.View>
  );
});

const CapsuleButton = ({
  label,
  sublabel,
  onPress,
  variant = 'primary',
}: {
  label: string;
  sublabel?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'glass';
}) => {
  const colors =
    variant === 'primary'
      ? theme.colors.primary.redGradient
      : variant === 'secondary'
        ? theme.colors.successGradient
        : (['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.09)'] as const);

  const handlePress = () => {
    SoundManager.getInstance().playButton();
    onPress();
  };

  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={handlePress} activeOpacity={0.86} style={styles.buttonShell}>
      <LinearGradient colors={colors} style={[styles.capsuleButton, variant === 'glass' && styles.glassButton]}>
        <Text style={styles.buttonText}>{label}</Text>
        {sublabel && <Text style={styles.buttonSubtext}>{sublabel}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export const MenuScreen: React.FC<MenuScreenProps> = ({
  onStartNewGame,
  onStartEndless,
  onResumeEndless,
  onContinueGame,
  onOpenSettings,
  onOpenLevels,
  onOpenTutorial,
  onOpenStats,
  hasSavedGame,
  savedLevel,
  hasEndlessSave,
  endlessWave,
  reducedMotion,
}) => {
  const titleOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: reducedMotion ? 1 : 780 });
    contentOpacity.value = withTiming(1, { duration: reducedMotion ? 1 : 700 });
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: interpolate(titleOpacity.value, [0, 1], [18, 0]) }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: interpolate(contentOpacity.value, [0, 1], [16, 0]) }],
  }));

  const pillColors = useMemo(
    () => [theme.colors.pill.red, theme.colors.pill.blue, theme.colors.pill.yellow, theme.colors.successGradient],
    []
  );

  const content = (
    <View style={styles.innerContainer}>
      <View style={styles.ambientLayer} pointerEvents="none">
        <View style={styles.bubbleOne} />
        <View style={styles.bubbleTwo} />
        {!reducedMotion && pillColors.map((color, index) => (
          <AmbientCapsule key={index} index={index} color={color} />
        ))}
      </View>

      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open settings" onPress={onOpenSettings} activeOpacity={0.8} style={styles.settingsButton}>
        <Text style={styles.settingsIcon}>...</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
        <View style={styles.logoMark}>
          <LinearGradient colors={theme.colors.primary.redGradient} style={styles.logoCapsule} />
          <View style={styles.logoMicrobe}>
            <View style={styles.logoMicrobeEye} />
            <View style={styles.logoMicrobeEye} />
          </View>
        </View>
        <Text style={styles.title}>Pill</Text>
        <Text style={styles.titleAccent}>Panic</Text>
        <Text style={styles.subtitle}>A bright capsule puzzle lab</Text>
      </Animated.View>

      <Animated.View style={[styles.contentWrapper, contentAnimatedStyle]}>
        {hasSavedGame && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Continue level ${savedLevel}`} onPress={onContinueGame} activeOpacity={0.86} style={styles.continueChip}>
            <Text style={styles.continueText}>Continue level {savedLevel}</Text>
          </TouchableOpacity>
        )}

        {hasEndlessSave && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Resume endless run, wave ${endlessWave}`} onPress={onResumeEndless} activeOpacity={0.86} style={styles.continueChip}>
            <Text style={styles.continueText}>Resume endless · Wave {endlessWave}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.menuButtonsContainer}>
          <CapsuleButton label="Play" onPress={onOpenLevels} />
          <CapsuleButton
            label={hasEndlessSave ? 'New endless run' : 'Endless'}
            sublabel={hasEndlessSave ? 'Start over' : 'Waves keep coming'}
            onPress={onStartEndless}
            variant="glass"
          />
        </View>

        <View style={styles.utilityRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="How to play" onPress={onOpenTutorial} style={styles.utilityButton}><Text style={styles.utilityIcon}>?</Text><Text style={styles.utilityText}>How to play</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open lab notes" onPress={onOpenStats} style={styles.utilityButton}><Text style={styles.utilityIcon}>#</Text><Text style={styles.utilityText}>Lab notes</Text></TouchableOpacity>
        </View>

        <View style={styles.tutorialStrip}>
          <View style={styles.tutorialStep}>
            <View style={[styles.tutorialPill, styles.tutorialPillRed]} />
            <Text style={styles.tutorialText}>Match four</Text>
          </View>
          <View style={styles.tutorialStep}>
            <View style={styles.microbeIcon}>
              <View style={styles.microbeEye} />
              <View style={styles.microbeEye} />
            </View>
            <Text style={styles.tutorialText}>Clear microbes</Text>
          </View>
          <View style={styles.tutorialStep}>
            <View style={[styles.tutorialPill, styles.tutorialPillMint]} />
            <Text style={styles.tutorialText}>{isWeb ? 'Keys to move' : 'Swipe to move'}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentInsetAdjustmentBehavior="never"
        >
          {content}
        </ScrollView>
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
    maxWidth: 680,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: responsiveSpacing(20),
  },
  ambientLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bubbleOne: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: '19%',
    left: '28%',
    backgroundColor: 'rgba(88,214,183,0.18)',
  },
  bubbleTwo: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    top: '33%',
    right: '26%',
    backgroundColor: 'rgba(255,216,90,0.18)',
  },
  ambientCapsule: {
    position: 'absolute',
    width: platformSelect({ web: 84, default: 62 }),
    height: platformSelect({ web: 28, default: 22 }),
    borderRadius: theme.borderRadius.round,
    transform: [{ rotate: '-18deg' }],
  },
  ambientCapsuleFill: {
    flex: 1,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  settingsButton: {
    position: 'absolute',
    top: responsiveSpacing(12),
    right: responsiveSpacing(20),
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    zIndex: 2,
  },
  settingsIcon: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(22),
    fontWeight: '900',
    lineHeight: 22,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: responsiveSpacing(34),
  },
  logoMark: {
    width: 94,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: responsiveSpacing(8),
  },
  logoCapsule: {
    position: 'absolute',
    width: 82,
    height: 30,
    borderRadius: theme.borderRadius.round,
    transform: [{ rotate: '-28deg' }],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  logoMicrobe: {
    position: 'absolute',
    right: 6,
    bottom: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.mint,
    borderWidth: 3,
    borderColor: theme.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  logoMicrobeEye: {
    width: 5,
    height: 7,
    borderRadius: 3,
    backgroundColor: theme.colors.text.dark,
  },
  title: {
    fontSize: responsiveFontSize(platformSelect({ web: 58, default: 64 })),
    fontWeight: '900',
    color: theme.colors.text.primary,
    lineHeight: responsiveFontSize(platformSelect({ web: 58, default: 64 })),
  },
  titleAccent: {
    fontSize: responsiveFontSize(platformSelect({ web: 58, default: 64 })),
    fontWeight: '900',
    color: theme.colors.primary.red,
    lineHeight: responsiveFontSize(platformSelect({ web: 58, default: 64 })),
    marginTop: -responsiveSpacing(4),
  },
  subtitle: {
    fontSize: responsiveFontSize(17),
    color: theme.colors.text.secondary,
    marginTop: responsiveSpacing(12),
    fontWeight: '600',
  },
  contentWrapper: {
    alignItems: 'center',
  },
  continueChip: {
    paddingHorizontal: responsiveSpacing(18),
    paddingVertical: responsiveSpacing(10),
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(88,214,183,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(88,214,183,0.34)',
    marginBottom: responsiveSpacing(14),
  },
  continueText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(15),
    fontWeight: '800',
  },
  menuButtonsContainer: {
    width: '100%',
    maxWidth: 320,
    gap: responsiveSpacing(14),
  },
  buttonShell: {
    width: '100%',
  },
  capsuleButton: {
    minHeight: 58,
    paddingHorizontal: responsiveSpacing(28),
    paddingVertical: responsiveSpacing(15),
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    ...theme.shadows.md,
  },
  glassButton: {
    shadowOpacity: 0.12,
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(19),
    fontWeight: '900',
  },
  buttonSubtext: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
    marginTop: 2,
  },
  tutorialStrip: {
    width: '100%',
    maxWidth: 320,
    marginTop: responsiveSpacing(28),
    padding: responsiveSpacing(14),
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: responsiveSpacing(10),
  },
  utilityRow: {
    width: '100%',
    maxWidth: 320,
    marginTop: responsiveSpacing(14),
    flexDirection: 'row',
    gap: responsiveSpacing(10),
  },
  utilityButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveSpacing(7),
  },
  utilityIcon: {
    color: theme.colors.mint,
    fontSize: responsiveFontSize(15),
    fontWeight: '900',
  },
  utilityText: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(12),
    fontWeight: '800',
  },
  tutorialStep: {
    flex: 1,
    alignItems: 'center',
    gap: responsiveSpacing(8),
  },
  tutorialPill: {
    width: 42,
    height: 18,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  tutorialPillRed: {
    backgroundColor: theme.colors.primary.red,
  },
  tutorialPillMint: {
    backgroundColor: theme.colors.mint,
  },
  microbeIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.tertiary.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  microbeEye: {
    width: 4,
    height: 5,
    borderRadius: 2,
    backgroundColor: theme.colors.text.dark,
  },
  tutorialText: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(12),
    fontWeight: '800',
    textAlign: 'center',
  },
});
