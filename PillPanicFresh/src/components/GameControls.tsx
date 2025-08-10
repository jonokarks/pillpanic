import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameEngine } from '../game/GameEngine';
import { Direction } from '../game/utils/constants';

interface GameControlsProps {
  gameEngine: GameEngine;
  children: React.ReactNode;
}

const INPUT_COOLDOWN = 100; // milliseconds

export const GameControls: React.FC<GameControlsProps> = ({ gameEngine, children }) => {
  const lastInputTime = useRef<{ [key: string]: number }>({
    left: 0,
    right: 0,
    down: 0,
    rotate: 0,
    switch: 0,
    drop: 0,
  });

  const canInput = (action: string): boolean => {
    const now = Date.now();
    const lastTime = lastInputTime.current[action] || 0;
    if (now - lastTime > INPUT_COOLDOWN) {
      lastInputTime.current[action] = now;
      return true;
    }
    return false;
  };
  // Keyboard controls for web - work alongside touch controls
  useEffect(() => {
    if (Platform.OS === 'web') {
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
  }, [gameEngine, canInput]);


  // Global pan gestures removed - individual pills now handle their own drag gestures

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {children}
          
          {/* Mobile control buttons */}
          {Platform.OS !== 'web' && (
            <View style={styles.mobileControls}>
              <View style={styles.controlRow}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => gameEngine.movePill(Direction.LEFT)}
                >
                  <Text style={styles.controlText}>←</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => gameEngine.rotatePill()}
                >
                  <Text style={styles.controlText}>↻</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => gameEngine.movePill(Direction.RIGHT)}
                >
                  <Text style={styles.controlText}>→</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.controlRow}>
                <TouchableOpacity
                  style={[styles.controlButton, styles.dropButton]}
                  onPress={() => gameEngine.dropPill()}
                >
                  <Text style={styles.controlText}>DROP</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mobileControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4444FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  dropButton: {
    width: 120,
    backgroundColor: '#FF4444',
  },
  controlText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});