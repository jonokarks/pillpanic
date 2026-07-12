import AsyncStorage from '@react-native-async-storage/async-storage';
import { SpeedSetting, SavedGameState } from '../game/utils/types';

const STORAGE_KEYS = {
  GAME_STATE: '@PillPanic:gameState',
  SETTINGS: '@PillPanic:settings',
  HIGH_SCORES: '@PillPanic:highScores',
};

export const Storage = {
  // Save game progress
  async saveGameProgress(state: SavedGameState): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save game progress:', error);
    }
  },

  // Load game progress
  async loadGameProgress(): Promise<SavedGameState | null> {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEYS.GAME_STATE);
      if (savedData) {
        return JSON.parse(savedData);
      }
      return null;
    } catch (error) {
      console.error('Failed to load game progress:', error);
      return null;
    }
  },

  // Save settings
  async saveSettings(settings: {
    speedSetting: SpeedSetting;
    soundEnabled: boolean;
  }): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  // Load settings
  async loadSettings(): Promise<{
    speedSetting: SpeedSetting;
    soundEnabled: boolean;
  } | null> {
    try {
      const savedSettings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
      return null;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return null;
    }
  },

  // Save high scores
  async saveHighScores(scores: {
    allTime: number;
    byLevel: { [level: number]: number };
  }): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(scores));
    } catch (error) {
      console.error('Failed to save high scores:', error);
    }
  },

  // Load high scores
  async loadHighScores(): Promise<{
    allTime: number;
    byLevel: { [level: number]: number };
  } | null> {
    try {
      const savedScores = await AsyncStorage.getItem(STORAGE_KEYS.HIGH_SCORES);
      if (savedScores) {
        return JSON.parse(savedScores);
      }
      return null;
    } catch (error) {
      console.error('Failed to load high scores:', error);
      return null;
    }
  },

  // Clear all saved data
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.GAME_STATE,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.HIGH_SCORES,
      ]);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  },

  // Clear only game progress (keep settings)
  async clearGameProgress(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.GAME_STATE);
    } catch (error) {
      console.error('Failed to clear game progress:', error);
    }
  },

  // Check if saved game exists
  async hasSavedGame(): Promise<boolean> {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEYS.GAME_STATE);
      return savedData !== null;
    } catch (error) {
      console.error('Failed to check saved game:', error);
      return false;
    }
  },
};