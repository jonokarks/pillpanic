import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { MenuScreen } from './src/screens/MenuScreen';
import { GameScreen } from './src/screens/GameScreen';

type Screen = 'menu' | 'game';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [selectedLevel, setSelectedLevel] = useState(1);

  const handleStartGame = (level: number) => {
    console.log('App: Starting game with level', level);
    setSelectedLevel(level);
    setCurrentScreen('game');
  };

  const handleBackToMenu = () => {
    setCurrentScreen('menu');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {currentScreen === 'menu' && (
        <MenuScreen onStartGame={handleStartGame} />
      )}
      {currentScreen === 'game' && (
        <GameScreen level={selectedLevel} onBackToMenu={handleBackToMenu} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
