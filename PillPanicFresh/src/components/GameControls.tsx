import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameEngine } from '../game/GameEngine';
import { Direction } from '../game/utils/constants';

interface GameControlsProps {
  gameEngine: GameEngine;
  children: React.ReactNode;
}

const INPUT_COOLDOWN = 100; // milliseconds

export const GameControls: React.FC<GameControlsProps> = ({ gameEngine, children }) => {
  // Keyboard controls for web - work alongside touch controls
  useEffect(() => {
    if (Platform.OS === 'web') {
      const lastInputTime: { [key: string]: number } = {};

      const canInput = (action: string): boolean => {
        const now = Date.now();
        const lastTime = lastInputTime[action] || 0;
        if (now - lastTime > INPUT_COOLDOWN) {
          lastInputTime[action] = now;
          return true;
        }
        return false;
      };

      const handleKeyPress = (event: KeyboardEvent) => {
        switch (event.key) {
          case 'ArrowLeft':
          case 'a':
          case 'A':
            if (canInput('left')) {
              gameEngine.movePill(Direction.LEFT);
            }
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            if (canInput('right')) {
              gameEngine.movePill(Direction.RIGHT);
            }
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            gameEngine.setFastDrop(true);
            break;
          case 'ArrowUp':
          case 'w':
          case 'W':
          case ' ':
            if (canInput('rotate')) {
              gameEngine.rotatePill();
            }
            break;
          case 'Enter':
            if (canInput('drop')) {
              gameEngine.dropPill();
            }
            break;
          case 'Tab':
            event.preventDefault(); // Prevent default tab behavior
            if (canInput('switch')) {
              gameEngine.switchToNextPill();
            }
            break;
          case 'p':
          case 'P':
            gameEngine.pause();
            break;
        }
      };

      const handleKeyUp = (event: KeyboardEvent) => {
        if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
          gameEngine.setFastDrop(false);
        }
      };

      window.addEventListener('keydown', handleKeyPress);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyPress);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [gameEngine]);


  // Global pan gestures removed - individual pills now handle their own drag gestures

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {children}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});