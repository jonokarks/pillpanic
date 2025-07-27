import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';
import { GameEngine } from '../game/GameEngine';
import { Direction } from '../game/utils/constants';

interface GameControlsProps {
  gameEngine: GameEngine;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 50; // Increased from 30
const INPUT_COOLDOWN = 100; // milliseconds

export const GameControls: React.FC<GameControlsProps> = ({ gameEngine, children }) => {
  const lastInputTime = useRef<{ [key: string]: number }>({
    left: 0,
    right: 0,
    down: 0,
    rotate: 0,
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
  // Keyboard controls for web
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

  const handleTap = () => {
    if (canInput('rotate')) {
      gameEngine.rotatePill();
    }
  };

  const lastTranslation = useRef({ x: 0, y: 0 });
  
  const handlePan = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.BEGAN) {
      lastTranslation.current = { x: 0, y: 0 };
    } else if (nativeEvent.state === State.ACTIVE) {
      const { translationX, translationY, velocityY } = nativeEvent;
      
      if (Math.abs(translationX) > Math.abs(translationY)) {
        // Horizontal swipe
        const deltaX = translationX - lastTranslation.current.x;
        
        if (deltaX > SWIPE_THRESHOLD && canInput('right')) {
          gameEngine.movePill(Direction.RIGHT);
          lastTranslation.current.x = translationX;
        } else if (deltaX < -SWIPE_THRESHOLD && canInput('left')) {
          gameEngine.movePill(Direction.LEFT);
          lastTranslation.current.x = translationX;
        }
      } else if (translationY > SWIPE_THRESHOLD) {
        // Downward swipe
        if (velocityY > 1500) {
          if (canInput('drop')) {
            gameEngine.dropPill();
          }
        } else {
          gameEngine.setFastDrop(true);
        }
      }
    } else if (nativeEvent.state === State.END) {
      gameEngine.setFastDrop(false);
      lastTranslation.current = { x: 0, y: 0 };
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <TapGestureHandler onHandlerStateChange={({ nativeEvent }) => {
        if (nativeEvent.state === State.END) {
          handleTap();
        }
      }}>
        <View style={styles.container}>
          <PanGestureHandler onGestureEvent={handlePan} onHandlerStateChange={handlePan}>
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
          </PanGestureHandler>
        </View>
      </TapGestureHandler>
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