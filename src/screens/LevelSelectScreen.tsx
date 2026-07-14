import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, responsiveFontSize, responsiveSpacing } from '../utils/theme';

interface LevelSelectScreenProps { unlockedLevel: number; onSelectLevel: (level: number) => void; onBack: () => void; }

export const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({ unlockedLevel, onSelectLevel, onBack }) => (
  <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to menu" onPress={onBack} style={styles.back}><Text style={styles.backText}>{'<'}</Text></TouchableOpacity>
        <View><Text style={styles.kicker}>Classic mode</Text><Text style={styles.title}>Lab trays</Text></View>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {Array.from({ length: 20 }, (_, i) => i + 1).map(level => {
          const unlocked = level <= Math.max(1, unlockedLevel);
          const current = level === Math.max(1, unlockedLevel);
          return <TouchableOpacity key={level} accessibilityRole="button" accessibilityLabel={unlocked ? `Play level ${level}` : `Level ${level} locked`} accessibilityState={{ disabled: !unlocked }} disabled={!unlocked} onPress={() => onSelectLevel(level)} activeOpacity={0.82} style={[styles.level, current && styles.current, !unlocked && styles.locked]}>
            <Text style={styles.levelLabel}>{unlocked ? 'TRAY' : 'LOCKED'}</Text><Text style={[styles.levelNumber, !unlocked && styles.lockedText]}>{level}</Text>
            <View style={[styles.seal, unlocked && styles.sealOpen]} />
          </TouchableOpacity>;
        })}
      </ScrollView>
    </SafeAreaView>
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: { flex: 1 }, safeArea: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', padding: responsiveSpacing(20), gap: responsiveSpacing(16), maxWidth: 720, width: '100%', alignSelf: 'center' },
  back: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceGlass, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }, backText: { color: theme.colors.text.primary, fontSize: 25, fontWeight: '900' }, spacer: { flex: 1 }, kicker: { color: theme.colors.mint, fontSize: responsiveFontSize(12), fontWeight: '900' }, title: { color: theme.colors.text.primary, fontSize: responsiveFontSize(28), fontWeight: '900' },
  grid: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: responsiveSpacing(20), paddingBottom: responsiveSpacing(28), flexDirection: 'row', flexWrap: 'wrap', gap: responsiveSpacing(12) },
  level: { width: '22%', minWidth: 84, aspectRatio: 1, borderRadius: theme.borderRadius.lg, padding: responsiveSpacing(14), backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'space-between' }, current: { backgroundColor: 'rgba(88,214,183,0.15)', borderColor: 'rgba(88,214,183,0.5)' }, locked: { opacity: 0.38 }, levelLabel: { color: theme.colors.text.secondary, fontSize: responsiveFontSize(10), fontWeight: '900' }, levelNumber: { color: theme.colors.text.primary, fontSize: responsiveFontSize(28), fontWeight: '900' }, lockedText: { color: theme.colors.text.secondary }, seal: { width: 18, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', alignSelf: 'flex-end' }, sealOpen: { backgroundColor: theme.colors.mint },
});
