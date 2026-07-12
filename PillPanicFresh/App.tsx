import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { MenuScreen } from './src/screens/MenuScreen';
import { GameScreen } from './src/screens/GameScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SpeedSetting, SavedGameState } from './src/game/utils/types';
import { Storage } from './src/utils/storage';

type Screen = 'menu' | 'game' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [savedGameState, setSavedGameState] = useState<SavedGameState | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [settings, setSettings] = useState({
    speedSetting: SpeedSetting.MEDIUM,
    soundEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      // Load saved game state
      const savedGame = await Storage.loadGameProgress();
      if (savedGame) {
        setSavedGameState(savedGame);
        setCurrentLevel(savedGame.currentLevel);
      }

      // Load settings
      const savedSettings = await Storage.loadSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewGame = () => {
    setCurrentLevel(1);
    setSavedGameState(null);
    setCurrentScreen('game');
  };

  const handleContinueGame = () => {
    if (savedGameState) {
      setCurrentLevel(savedGameState.currentLevel);
      setCurrentScreen('game');
    }
  };

  const handleBackToMenu = () => {
    setCurrentScreen('menu');
  };

  const handleOpenSettings = () => {
    setCurrentScreen('settings');
  };

  const handleGameComplete = async (level: number, totalScore: number) => {
    const newLevel = level + 1;
    setCurrentLevel(newLevel);
    
    // Save game progress
    const newSavedState: SavedGameState = {
      currentLevel: newLevel,
      totalScore,
      speedSetting: settings.speedSetting,
      lastPlayed: new Date().toISOString(),
    };
    setSavedGameState(newSavedState);
    await Storage.saveGameProgress(newSavedState);
  };

  const handleSettingsChange = (newSettings: typeof settings) => {
    setSettings(newSettings);
  };

  if (isLoading) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {currentScreen === 'menu' && (
        <MenuScreen 
          onStartNewGame={handleStartNewGame}
          onContinueGame={handleContinueGame}
          onOpenSettings={handleOpenSettings}
          hasSavedGame={savedGameState !== null}
          savedLevel={savedGameState?.currentLevel}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen 
          level={currentLevel} 
          speedSetting={settings.speedSetting} 
          onBackToMenu={handleBackToMenu}
          onGameComplete={handleGameComplete}
          savedTotalScore={savedGameState?.totalScore || 0}
        />
      )}
      {currentScreen === 'settings' && (
        <SettingsScreen
          onBackToMenu={handleBackToMenu}
          currentSettings={settings}
          onSettingsChange={handleSettingsChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
