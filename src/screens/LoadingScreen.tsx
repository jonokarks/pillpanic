import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { theme, responsiveFontSize, responsiveSpacing } from '../utils/theme';

export const LoadingScreen = () => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const beadStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 92 }],
  }));

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <View style={styles.mark} accessibilityLabel="Pill Panic is loading">
        <View style={styles.capsule}>
          <View style={[styles.half, styles.red]} />
          <View style={[styles.half, styles.mint]} />
        </View>
        <View style={styles.microbe}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
      </View>
      <Text style={styles.name}>Pill Panic</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.bead, beadStyle]} />
      </View>
      <Text style={styles.label}>Preparing the lab</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 126, height: 88, alignItems: 'center', justifyContent: 'center' },
  capsule: { flexDirection: 'row', transform: [{ rotate: '-20deg' }] },
  half: { width: 42, height: 38, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  red: { backgroundColor: theme.colors.primary.red, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  mint: { backgroundColor: theme.colors.mint, borderTopRightRadius: 20, borderBottomRightRadius: 20 },
  microbe: { position: 'absolute', right: 9, bottom: 5, width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.tertiary.yellow, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  eye: { width: 5, height: 7, borderRadius: 3, backgroundColor: theme.colors.text.dark },
  name: { color: theme.colors.text.primary, fontSize: responsiveFontSize(34), fontWeight: '900', marginTop: responsiveSpacing(14) },
  track: { width: 116, height: 8, borderRadius: 4, marginTop: responsiveSpacing(28), backgroundColor: 'rgba(255,255,255,0.1)', padding: 1 },
  bead: { width: 22, height: 6, borderRadius: 3, backgroundColor: theme.colors.mint },
  label: { color: theme.colors.text.secondary, fontSize: responsiveFontSize(12), fontWeight: '800', marginTop: responsiveSpacing(12) },
});
