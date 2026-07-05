import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Platform
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { theme, responsiveFontSize, responsiveSpacing } from '../utils/theme';
import { SpeedSetting } from '../game/utils/types';
import { Storage } from '../utils/storage';

const isWeb = Platform.OS === 'web';

interface SettingsScreenProps {
  onBackToMenu: () => void;
  currentSettings: {
    speedSetting: SpeedSetting;
    soundEnabled: boolean;
  };
  onSettingsChange: (settings: {
    speedSetting: SpeedSetting;
    soundEnabled: boolean;
  }) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBackToMenu,
  currentSettings,
  onSettingsChange,
}) => {
  const [speedSetting, setSpeedSetting] = useState(currentSettings.speedSetting);
  const [soundEnabled, setSoundEnabled] = useState(currentSettings.soundEnabled);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 500 });
    checkSavedGame();
  }, []);

  const checkSavedGame = async () => {
    const exists = await Storage.hasSavedGame();
    setHasSavedGame(exists);
  };

  const handleSpeedChange = async (speed: SpeedSetting) => {
    setSpeedSetting(speed);
    const newSettings = { speedSetting: speed, soundEnabled };
    await Storage.saveSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleSoundToggle = async (value: boolean) => {
    setSoundEnabled(value);
    const newSettings = { speedSetting, soundEnabled: value };
    await Storage.saveSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleClearData = () => {
    if (isWeb) {
      if (window.confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
        performClearData();
      }
    } else {
      Alert.alert(
        'Clear All Data',
        'Are you sure you want to clear all saved data? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear', style: 'destructive', onPress: performClearData },
        ]
      );
    }
  };

  const performClearData = async () => {
    await Storage.clearAllData();
    setHasSavedGame(false);
    if (isWeb) {
      window.alert('All saved data has been cleared.');
    } else {
      Alert.alert('Success', 'All saved data has been cleared.');
    }
  };

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.backgroundLight]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentInsetAdjustmentBehavior="never"
        >
          <Animated.View style={[styles.content, contentAnimatedStyle]}>
            <View style={styles.header}>
              <Text style={styles.title}>SETTINGS</Text>
            </View>

            {/* Speed Setting */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Game Speed</Text>
              <View style={styles.speedButtons}>
                {Object.values(SpeedSetting).map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    onPress={() => handleSpeedChange(speed)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={speedSetting === speed 
                        ? theme.colors.primary.redGradient 
                        : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                      }
                      style={[
                        styles.speedButton,
                        speedSetting === speed && styles.selectedSpeedButton
                      ]}
                    >
                      <Text style={[
                        styles.speedButtonText,
                        speedSetting === speed && styles.selectedSpeedButtonText
                      ]}>
                        {speed}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.speedDescription}>
                {speedSetting === SpeedSetting.LOW && 'Slow and steady - perfect for beginners'}
                {speedSetting === SpeedSetting.MEDIUM && 'Balanced pace - classic Dr. Mario feel'}
                {speedSetting === SpeedSetting.HIGH && 'Fast and challenging - for experts'}
              </Text>
            </View>

            {/* Sound Setting */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <Text style={styles.sectionTitle}>Sound Effects</Text>
                <Switch
                  value={soundEnabled}
                  onValueChange={handleSoundToggle}
                  trackColor={{ false: '#767577', true: theme.colors.success }}
                  thumbColor={soundEnabled ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Saved Game Info */}
            {hasSavedGame && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Saved Game</Text>
                <Text style={styles.infoText}>
                  You have a saved game in progress. Continue from the main menu.
                </Text>
              </View>
            )}

            {/* Clear Data */}
            <View style={styles.section}>
              <TouchableOpacity
                onPress={handleClearData}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#8B0000', '#DC143C']}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>CLEAR ALL DATA</Text>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.warningText}>
                This will delete all saved progress and high scores
              </Text>
            </View>

            {/* Back Button */}
            <TouchableOpacity
              onPress={onBackToMenu}
              activeOpacity={0.8}
              style={styles.backButton}
            >
              <LinearGradient
                colors={theme.colors.secondary.blueGradient}
                style={styles.button}
              >
                <Text style={styles.buttonText}>BACK TO MENU</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
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
    paddingVertical: responsiveSpacing(20),
  },
  content: {
    flex: 1,
    paddingHorizontal: responsiveSpacing(20),
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: responsiveSpacing(40),
  },
  title: {
    fontSize: responsiveFontSize(48),
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  section: {
    marginBottom: responsiveSpacing(40),
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: responsiveSpacing(20),
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: responsiveFontSize(24),
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: responsiveSpacing(16),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  speedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: responsiveSpacing(12),
    marginBottom: responsiveSpacing(16),
    flexWrap: 'wrap',
  },
  speedButton: {
    paddingHorizontal: responsiveSpacing(24),
    paddingVertical: responsiveSpacing(14),
    borderRadius: theme.borderRadius.md,
    minWidth: responsiveSpacing(100),
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
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: responsiveFontSize(16),
    color: theme.colors.text.secondary,
    lineHeight: 24,
  },
  clearButton: {
    paddingHorizontal: responsiveSpacing(32),
    paddingVertical: responsiveSpacing(16),
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  clearButtonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: theme.colors.text.primary,
    letterSpacing: 1,
  },
  warningText: {
    fontSize: responsiveFontSize(12),
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: responsiveSpacing(8),
    fontStyle: 'italic',
  },
  backButton: {
    marginTop: responsiveSpacing(20),
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