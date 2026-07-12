import React, { useEffect, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme, responsiveFontSize, responsiveSpacing } from '../utils/theme';

interface TutorialScreenProps {
  onComplete: () => void;
  onBack: () => void;
  reducedMotion: boolean;
}

const STEPS = [
  { kicker: 'Move and turn', title: 'Guide each capsule', body: Platform.OS === 'web' ? 'Use the arrow keys to move, Space to rotate, and Down to drop.' : 'Drag a falling capsule to move it. Tap it to rotate.' },
  { kicker: 'Match four', title: 'Build a colour line', body: 'Connect four or more matching halves in a row or column.' },
  { kicker: 'Clear the tray', title: 'Remove every microbe', body: 'Match beside microbes of the same colour. Chain reactions multiply your score.' },
];

const CapsuleDemo = ({ step }: { step: number }) => (
  <View style={styles.demo} accessibilityElementsHidden>
    <View style={[styles.gridLine, { top: '25%' }]} />
    <View style={[styles.gridLine, { top: '50%' }]} />
    <View style={[styles.gridLine, { top: '75%' }]} />
    {step === 0 && <View style={[styles.demoCapsule, styles.demoCapsuleTilt]}><View style={[styles.demoHalf, styles.coral]} /><View style={[styles.demoHalf, styles.mint]} /></View>}
    {step === 1 && <View style={styles.matchRow}>{[0, 1, 2, 3].map(i => <View key={i} style={[styles.matchPiece, i === 3 && styles.matchGlow]} />)}</View>}
    {step === 2 && <><View style={styles.microbe}><View style={styles.eyes}><View style={styles.eye} /><View style={styles.eye} /></View></View><View style={styles.clearRing} /></>}
  </View>
);

export const TutorialScreen: React.FC<TutorialScreenProps> = ({ onComplete, onBack, reducedMotion }) => {
  const [step, setStep] = useState(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 260 });
  }, [step, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const isLast = step === STEPS.length - 1;

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to menu" onPress={onBack} style={styles.iconButton}><Text style={styles.iconText}>{'<'}</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Quick start</Text>
          <Text style={styles.stepCount}>{step + 1}/{STEPS.length}</Text>
        </View>
        <Animated.View style={[styles.content, animatedStyle]}>
          <CapsuleDemo step={step} />
          <Text style={styles.kicker}>{STEPS[step].kicker}</Text>
          <Text style={styles.title}>{STEPS[step].title}</Text>
          <Text style={styles.body}>{STEPS[step].body}</Text>
        </Animated.View>
        <View style={styles.footer}>
          <View style={styles.dots}>{STEPS.map((_, i) => <View key={i} style={[styles.dot, i === step && styles.dotActive]} />)}</View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={isLast ? 'Start level one' : 'Next tutorial step'} onPress={() => isLast ? onComplete() : setStep(step + 1)} activeOpacity={0.84}>
            <LinearGradient colors={theme.colors.primary.redGradient} style={styles.primaryButton}><Text style={styles.primaryText}>{isLast ? 'Start playing' : 'Next'}</Text></LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: responsiveSpacing(20) },
  iconButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: theme.colors.surfaceGlass, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  iconText: { color: theme.colors.text.primary, fontSize: 25, fontWeight: '900' }, headerTitle: { color: theme.colors.text.primary, fontSize: responsiveFontSize(17), fontWeight: '900' }, stepCount: { width: 46, color: theme.colors.text.secondary, fontSize: responsiveFontSize(13), fontWeight: '800', textAlign: 'right' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: responsiveSpacing(24) },
  demo: { width: '100%', maxWidth: 380, aspectRatio: 1.35, borderRadius: theme.borderRadius.xl, backgroundColor: 'rgba(6,12,24,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: responsiveSpacing(32) },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  demoCapsule: { flexDirection: 'row' }, demoCapsuleTilt: { transform: [{ rotate: '-22deg' }] }, demoHalf: { width: 62, height: 54 }, coral: { backgroundColor: theme.colors.primary.red, borderTopLeftRadius: 28, borderBottomLeftRadius: 28 }, mint: { backgroundColor: theme.colors.mint, borderTopRightRadius: 28, borderBottomRightRadius: 28 },
  matchRow: { flexDirection: 'row', gap: 8 }, matchPiece: { width: 50, height: 50, borderRadius: 15, backgroundColor: theme.colors.secondary.blue, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }, matchGlow: { borderColor: theme.colors.tertiary.yellow, transform: [{ scale: 1.08 }] },
  microbe: { width: 82, height: 82, borderRadius: 41, backgroundColor: theme.colors.tertiary.yellow, alignItems: 'center', justifyContent: 'center' }, eyes: { flexDirection: 'row', gap: 12 }, eye: { width: 9, height: 13, borderRadius: 5, backgroundColor: theme.colors.text.dark }, clearRing: { position: 'absolute', width: 132, height: 132, borderRadius: 66, borderWidth: 5, borderColor: 'rgba(88,214,183,0.55)' },
  kicker: { color: theme.colors.mint, fontSize: responsiveFontSize(13), fontWeight: '900', marginBottom: 8 }, title: { color: theme.colors.text.primary, fontSize: responsiveFontSize(32), fontWeight: '900', textAlign: 'center' }, body: { color: theme.colors.text.secondary, fontSize: responsiveFontSize(16), fontWeight: '700', lineHeight: responsiveFontSize(24), textAlign: 'center', maxWidth: 430, marginTop: 12 },
  footer: { padding: responsiveSpacing(20), width: '100%', maxWidth: 420, alignSelf: 'center' }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: responsiveSpacing(18) }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' }, dotActive: { width: 24, backgroundColor: theme.colors.mint }, primaryButton: { minHeight: 58, borderRadius: theme.borderRadius.round, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' }, primaryText: { color: theme.colors.text.primary, fontSize: responsiveFontSize(18), fontWeight: '900' },
});
