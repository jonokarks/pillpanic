import React, { useEffect, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { theme, responsiveFontSize, responsiveSpacing } from '../utils/theme';
import { SpeedSetting } from '../game/utils/types';
import { Storage } from '../utils/storage';
import { SoundManager } from '../utils/SoundManager';

interface SettingsScreenProps {
  onBackToMenu: () => void;
  currentSettings: {
    speedSetting: SpeedSetting;
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    reducedMotion: boolean;
  };
  onSettingsChange: (settings: {
    speedSetting: SpeedSetting;
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    reducedMotion: boolean;
  }) => void;
}

const speedLabels: Record<SpeedSetting, { label: string; detail: string; icon: string }> = {
  [SpeedSetting.LOW]: {
    label: 'Chill',
    detail: 'Relaxed fall rhythm',
    icon: 'I',
  },
  [SpeedSetting.MEDIUM]: {
    label: 'Classic',
    detail: 'Balanced capsule flow',
    icon: 'II',
  },
  [SpeedSetting.HIGH]: {
    label: 'Rush',
    detail: 'More capsules in play',
    icon: 'III',
  },
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBackToMenu,
  currentSettings,
  onSettingsChange,
}) => {
  const [speedSetting, setSpeedSetting] = useState(currentSettings.speedSetting);
  const [soundEnabled, setSoundEnabled] = useState(currentSettings.soundEnabled);
  const [hapticsEnabled, setHapticsEnabled] = useState(currentSettings.hapticsEnabled);
  const [reducedMotion, setReducedMotion] = useState(currentSettings.reducedMotion);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [dataCleared, setDataCleared] = useState(false);

  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 460 });
    checkSavedGame();
  }, []);

  const checkSavedGame = async () => {
    const exists = await Storage.hasSavedGame();
    setHasSavedGame(exists);
  };

  const handleSpeedChange = async (speed: SpeedSetting) => {
    setSpeedSetting(speed);
    const newSettings = { speedSetting: speed, soundEnabled, hapticsEnabled, reducedMotion };
    await Storage.saveSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleSoundToggle = async (value: boolean) => {
    setSoundEnabled(value);
    SoundManager.getInstance().setEnabled(value);
    const newSettings = { speedSetting, soundEnabled: value, hapticsEnabled, reducedMotion };
    await Storage.saveSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleHapticsToggle = async (value: boolean) => {
    setHapticsEnabled(value);
    SoundManager.getInstance().setHapticsEnabled(value);
    const newSettings = { speedSetting, soundEnabled, hapticsEnabled: value, reducedMotion };
    await Storage.saveSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleReducedMotionToggle = async (value: boolean) => {
    setReducedMotion(value);
    const newSettings = { speedSetting, soundEnabled, hapticsEnabled, reducedMotion: value };
    await Storage.saveSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const performClearData = async () => {
    await Storage.clearAllData();
    setHasSavedGame(false);
    setDataCleared(true);
    setShowClearDialog(false);
  };

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: interpolate(contentOpacity.value, [0, 1], [14, 0]) }],
  }));

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentInsetAdjustmentBehavior="never"
        >
          <Animated.View style={[styles.content, contentAnimatedStyle]}>
            <View style={styles.header}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to menu" onPress={onBackToMenu} activeOpacity={0.82} style={styles.backIconButton}>
                <Text style={styles.backIcon}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Settings</Text>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Play</Text>
              <View style={styles.segmentedControl}>
                {Object.values(SpeedSetting).map((speed) => {
                  const selected = speedSetting === speed;
                  const meta = speedLabels[speed];
                  return (
                    <TouchableOpacity
                      key={speed}
                      onPress={() => handleSpeedChange(speed)}
                      activeOpacity={0.84}
                      style={[styles.speedSegment, selected && styles.speedSegmentSelected]}
                      accessibilityRole="button"
                      accessibilityLabel={`${meta.label} game speed`}
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.speedIcon, selected && styles.speedIconSelected]}>{meta.icon}</Text>
                      <Text style={[styles.speedLabel, selected && styles.speedLabelSelected]}>{meta.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.helperText}>{speedLabels[speedSetting].detail}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Audio</Text>
              <View style={styles.settingRow}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Sound effects</Text>
                  <Text style={styles.rowDetail}>Soft ticks, pops, and menu feedback</Text>
                </View>
                <Switch
                  accessibilityLabel="Sound effects"
                  value={soundEnabled}
                  onValueChange={handleSoundToggle}
                  trackColor={{ false: 'rgba(255,255,255,0.18)', true: theme.colors.success }}
                  thumbColor={soundEnabled ? theme.colors.surfaceLight : 'rgba(255,255,255,0.72)'}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accessibility</Text>
              <View style={styles.settingRow}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Haptic feedback</Text>
                  <Text style={styles.rowDetail}>Gentle taps for drops, matches, and results</Text>
                </View>
                <Switch accessibilityLabel="Haptic feedback" value={hapticsEnabled} onValueChange={handleHapticsToggle} trackColor={{ false: 'rgba(255,255,255,0.18)', true: theme.colors.success }} thumbColor={hapticsEnabled ? theme.colors.surfaceLight : 'rgba(255,255,255,0.72)'} />
              </View>
              <View style={[styles.settingRow, styles.settingRowDivider]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Reduce motion</Text>
                  <Text style={styles.rowDetail}>Shortens celebrations and removes ambient drift</Text>
                </View>
                <Switch accessibilityLabel="Reduce motion" value={reducedMotion} onValueChange={handleReducedMotionToggle} trackColor={{ false: 'rgba(255,255,255,0.18)', true: theme.colors.success }} thumbColor={reducedMotion ? theme.colors.surfaceLight : 'rgba(255,255,255,0.72)'} />
              </View>
              <View style={styles.settingRow}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Piece markings</Text>
                  <Text style={styles.rowDetail}>Color pieces now include simple shape cues</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>On</Text>
                </View>
              </View>
            </View>

            {hasSavedGame && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Saved game</Text>
                <Text style={styles.helperText}>A lab run is waiting on the main menu.</Text>
              </View>
            )}

            <View style={styles.dangerSection}>
              <Text style={styles.sectionTitle}>Data</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear saved data" onPress={() => setShowClearDialog(true)} activeOpacity={0.82} style={styles.clearRow}>
                <Text style={styles.clearText}>Clear saved data</Text>
                <Text style={styles.clearChevron}>{'>'}</Text>
              </TouchableOpacity>
              <Text style={styles.warningText}>
                This removes progress, settings, and high scores.
              </Text>
              {dataCleared && <Text style={styles.successText}>Saved data cleared.</Text>}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showClearDialog} transparent animationType="fade" onRequestClose={() => setShowClearDialog(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Text style={styles.dialogIconText}>!</Text>
            </View>
            <Text style={styles.dialogTitle}>Clear saved data?</Text>
            <Text style={styles.dialogBody}>
              This will remove your saved run, high scores, and settings. This cannot be undone.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel clearing data" onPress={() => setShowClearDialog(false)} activeOpacity={0.84} style={styles.dialogSecondary}>
                <Text style={styles.dialogSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Confirm clearing data" onPress={performClearData} activeOpacity={0.84} style={styles.dialogDanger}>
                <Text style={styles.dialogDangerText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: responsiveSpacing(18),
  },
  content: {
    flex: 1,
    paddingHorizontal: responsiveSpacing(20),
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: responsiveSpacing(26),
  },
  backIconButton: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  backIcon: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(36),
    fontWeight: '700',
    lineHeight: responsiveFontSize(36),
  },
  title: {
    fontSize: responsiveFontSize(36),
    fontWeight: '900',
    color: theme.colors.text.primary,
  },
  headerSpacer: {
    width: 46,
  },
  section: {
    marginBottom: responsiveSpacing(18),
    backgroundColor: theme.colors.surfaceGlass,
    padding: responsiveSpacing(18),
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  dangerSection: {
    marginTop: responsiveSpacing(8),
    marginBottom: responsiveSpacing(24),
    padding: responsiveSpacing(18),
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(233,91,91,0.28)',
    backgroundColor: 'rgba(233,91,91,0.08)',
  },
  sectionTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '900',
    color: theme.colors.text.primary,
    marginBottom: responsiveSpacing(14),
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: responsiveSpacing(8),
    padding: responsiveSpacing(4),
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(8,12,22,0.25)',
  },
  speedSegment: {
    flex: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  speedSegmentSelected: {
    backgroundColor: theme.colors.surfaceLight,
    ...theme.shadows.sm,
  },
  speedIcon: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(13),
    fontWeight: '900',
  },
  speedIconSelected: {
    color: theme.colors.primary.red,
  },
  speedLabel: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(13),
    fontWeight: '900',
  },
  speedLabelSelected: {
    color: theme.colors.text.dark,
  },
  helperText: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    lineHeight: responsiveFontSize(20),
    marginTop: responsiveSpacing(12),
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: responsiveSpacing(16),
  },
  settingRowDivider: {
    marginVertical: responsiveSpacing(12),
    paddingVertical: responsiveSpacing(12),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(16),
    fontWeight: '800',
    marginBottom: 4,
  },
  rowDetail: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
    lineHeight: responsiveFontSize(18),
  },
  statusPill: {
    paddingHorizontal: responsiveSpacing(12),
    paddingVertical: responsiveSpacing(7),
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(88,214,183,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(88,214,183,0.34)',
  },
  statusPillText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(12),
    fontWeight: '900',
  },
  clearRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearText: {
    color: theme.colors.error,
    fontSize: responsiveFontSize(16),
    fontWeight: '900',
  },
  clearChevron: {
    color: theme.colors.error,
    fontSize: responsiveFontSize(28),
    fontWeight: '800',
  },
  warningText: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    lineHeight: responsiveFontSize(17),
  },
  successText: {
    color: theme.colors.success,
    fontSize: responsiveFontSize(13),
    fontWeight: '800',
    marginTop: responsiveSpacing(10),
  },
  modalScrim: {
    flex: 1,
    backgroundColor: theme.colors.modalScrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: responsiveSpacing(24),
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    padding: responsiveSpacing(24),
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  dialogIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(233,91,91,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(233,91,91,0.34)',
    marginBottom: responsiveSpacing(14),
  },
  dialogIconText: {
    color: theme.colors.error,
    fontSize: responsiveFontSize(24),
    fontWeight: '900',
  },
  dialogTitle: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(22),
    fontWeight: '900',
    marginBottom: responsiveSpacing(8),
  },
  dialogBody: {
    color: theme.colors.text.secondary,
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    lineHeight: responsiveFontSize(20),
    textAlign: 'center',
    marginBottom: responsiveSpacing(20),
  },
  dialogActions: {
    flexDirection: 'row',
    width: '100%',
    gap: responsiveSpacing(10),
  },
  dialogSecondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  dialogSecondaryText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(15),
    fontWeight: '900',
  },
  dialogDanger: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
  },
  dialogDangerText: {
    color: theme.colors.text.primary,
    fontSize: responsiveFontSize(15),
    fontWeight: '900',
  },
});
