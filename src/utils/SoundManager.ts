import { Audio } from 'expo-av';

export class SoundManager {
  private static instance: SoundManager;
  private sounds: { [key: string]: Audio.Sound } = {};
  private enabled: boolean = true;

  private constructor() {}

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
    }
  }

  async playSound(soundName: string) {
    if (!this.enabled) return;

    try {
      // For now, we'll use system sounds or skip if no audio files
      // In a real implementation, you would load actual sound files
      console.log(`Playing sound: ${soundName}`);
    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Sound effect methods
  async playMove() {
    await this.playSound('move');
  }

  async playRotate() {
    await this.playSound('rotate');
  }

  async playDrop() {
    await this.playSound('drop');
  }

  async playMatch() {
    await this.playSound('match');
  }

  async playLevelComplete() {
    await this.playSound('levelComplete');
  }

  async playGameOver() {
    await this.playSound('gameOver');
  }
}