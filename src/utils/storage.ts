import AsyncStorage from '@react-native-async-storage/async-storage';
import { SpeedSetting, SavedGameState } from '../game/utils/types';

const STORAGE_KEYS = {
  GAME_STATE: '@PillPanic:gameState',
  SETTINGS: '@PillPanic:settings',
  HIGH_SCORES: '@PillPanic:highScores',
  TUTORIAL_SEEN: '@PillPanic:tutorialSeen',
};

export interface GameSettings {
  speedSetting: SpeedSetting;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
}

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
  async saveSettings(settings: GameSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  // Load settings
  async loadSettings(): Promise<GameSettings | null> {
    try {
      const savedSettings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        return {
          ...parsed,
          hapticsEnabled: parsed.hapticsEnabled ?? true,
          reducedMotion: parsed.reducedMotion ?? false,
        };
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
        STORAGE_KEYS.TUTORIAL_SEEN,
      ]);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  },

  async hasSeenTutorial(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN)) === 'true';
    } catch (error) {
      console.error('Failed to load tutorial state:', error);
      return false;
    }
  },

  async markTutorialSeen(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true');
    } catch (error) {
      console.error('Failed to save tutorial state:', error);
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
