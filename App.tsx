import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { MenuScreen } from './src/screens/MenuScreen';
import { GameScreen } from './src/screens/GameScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TutorialScreen } from './src/screens/TutorialScreen';
import { LevelSelectScreen } from './src/screens/LevelSelectScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { GameSettings, Storage } from './src/utils/storage';
import { SoundManager } from './src/utils/SoundManager';
import { SpeedSetting, GameMode, SavedGameState } from './src/game/utils/types';

type Screen = 'menu' | 'game' | 'settings' | 'tutorial' | 'levels' | 'stats';

const DEFAULT_SETTINGS: GameSettings = {
  speedSetting: SpeedSetting.MEDIUM,
  soundEnabled: true,
  hapticsEnabled: true,
  reducedMotion: false,
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [isReady, setIsReady] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [savedGame, setSavedGame] = useState<SavedGameState | null>(null);
  const [startLevel, setStartLevel] = useState(1);
  const [startScore, setStartScore] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.CLASSIC);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    (async () => {
      const [loadedSettings, loadedGame, hasSeenTutorial] = await Promise.all([
        Storage.loadSettings(),
        Storage.loadGameProgress(),
        Storage.hasSeenTutorial(),
      ]);
      if (loadedSettings) {
        setSettings(loadedSettings);
        SoundManager.getInstance().setEnabled(loadedSettings.soundEnabled);
        SoundManager.getInstance().setHapticsEnabled(loadedSettings.hapticsEnabled);
      }
      setSavedGame(loadedGame);
      setTutorialSeen(hasSeenTutorial);
      setIsReady(true);
    })();
  }, []);

  useEffect(() => {
    screenOpacity.value = settings.reducedMotion ? 1 : 0;
    screenOpacity.value = withTiming(1, { duration: settings.reducedMotion ? 1 : 320 });
  }, [currentScreen, settings.reducedMotion]);

  const screenAnimatedStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  const handleStartNewGame = async () => {
    await Storage.clearGameProgress();
    setSavedGame(null);
    setStartLevel(1);
    setStartScore(0);
    setGameMode(GameMode.CLASSIC);
    setCurrentScreen('game');
  };

  const handlePlay = () => {
    setCurrentScreen(tutorialSeen ? 'levels' : 'tutorial');
  };

  const handleSelectLevel = async (level: number) => {
    await Storage.clearGameProgress();
    setStartLevel(level);
    setStartScore(0);
    setGameMode(GameMode.CLASSIC);
    setCurrentScreen('game');
  };

  const handleTutorialComplete = async () => {
    await Storage.markTutorialSeen();
    setTutorialSeen(true);
    await handleStartNewGame();
  };

  // Virus Buster style continuous play: one run, waves keep coming
  const handleStartEndless = () => {
    setStartLevel(1);
    setStartScore(0);
    setGameMode(GameMode.ENDLESS);
    setCurrentScreen('game');
  };

  const handleContinueGame = () => {
    if (savedGame) {
      setStartLevel(savedGame.currentLevel);
      setStartScore(savedGame.totalScore);
    } else {
      setStartLevel(1);
      setStartScore(0);
    }
    setGameMode(GameMode.CLASSIC);
    setCurrentScreen('game');
  };

  const handleGameComplete = async (level: number, totalScore: number) => {
    const progress: SavedGameState = {
      currentLevel: level + 1,
      totalScore,
      speedSetting: settings.speedSetting,
      lastPlayed: new Date().toISOString(),
    };
    setSavedGame(progress);
    await Storage.saveGameProgress(progress);

    const highScores = (await Storage.loadHighScores()) ?? { allTime: 0, byLevel: {} };
    highScores.allTime = Math.max(highScores.allTime, totalScore);
    highScores.byLevel[level] = Math.max(highScores.byLevel[level] ?? 0, totalScore);
    await Storage.saveHighScores(highScores);
  };

  const handleSettingsChange = async (newSettings: GameSettings) => {
    setSettings(newSettings);
    await Storage.saveSettings(newSettings);
  };

  const handleBackToMenu = () => {
    setCurrentScreen('menu');
  };

  if (!isReady) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View style={[styles.container, screenAnimatedStyle]}>
      {currentScreen === 'menu' && (
        <MenuScreen
          onStartNewGame={handleStartNewGame}
          onStartEndless={handleStartEndless}
          onContinueGame={handleContinueGame}
          onOpenSettings={() => setCurrentScreen('settings')}
          onOpenLevels={handlePlay}
          onOpenTutorial={() => setCurrentScreen('tutorial')}
          onOpenStats={() => setCurrentScreen('stats')}
          hasSavedGame={savedGame !== null}
          savedLevel={savedGame?.currentLevel}
          reducedMotion={settings.reducedMotion}
        />
      )}
      {currentScreen === 'levels' && <LevelSelectScreen unlockedLevel={savedGame?.currentLevel ?? 1} onSelectLevel={handleSelectLevel} onBack={handleBackToMenu} />}
      {currentScreen === 'tutorial' && <TutorialScreen onComplete={handleTutorialComplete} onBack={handleBackToMenu} reducedMotion={settings.reducedMotion} />}
      {currentScreen === 'stats' && <StatsScreen onBack={handleBackToMenu} />}
      {currentScreen === 'game' && (
        <GameScreen
          level={startLevel}
          speedSetting={settings.speedSetting}
          gameMode={gameMode}
          onBackToMenu={handleBackToMenu}
          onGameComplete={handleGameComplete}
          savedTotalScore={startScore}
          reducedMotion={settings.reducedMotion}
        />
      )}
      {currentScreen === 'settings' && (
        <SettingsScreen
          onBackToMenu={handleBackToMenu}
          currentSettings={settings}
          onSettingsChange={handleSettingsChange}
        />
      )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
