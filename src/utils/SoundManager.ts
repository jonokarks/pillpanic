import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

type FeedbackName = 'move' | 'rotate' | 'drop' | 'match' | 'combo' | 'levelComplete' | 'gameOver' | 'button';

const WEB_TONES: Record<FeedbackName, { frequency: number; duration: number; type: OscillatorType }> = {
  move: { frequency: 320, duration: 0.025, type: 'sine' },
  rotate: { frequency: 470, duration: 0.045, type: 'triangle' },
  drop: { frequency: 180, duration: 0.07, type: 'sine' },
  match: { frequency: 660, duration: 0.12, type: 'sine' },
  combo: { frequency: 880, duration: 0.16, type: 'triangle' },
  levelComplete: { frequency: 740, duration: 0.32, type: 'sine' },
  gameOver: { frequency: 150, duration: 0.3, type: 'triangle' },
  button: { frequency: 420, duration: 0.035, type: 'sine' },
};

const NATIVE_SOUND_ASSETS: Record<FeedbackName, number> = {
  move: require('../../assets/audio/move.wav'),
  rotate: require('../../assets/audio/rotate.wav'),
  drop: require('../../assets/audio/drop.wav'),
  match: require('../../assets/audio/match.wav'),
  combo: require('../../assets/audio/combo.wav'),
  levelComplete: require('../../assets/audio/level-complete.wav'),
  gameOver: require('../../assets/audio/game-over.wav'),
  button: require('../../assets/audio/button.wav'),
};

export class SoundManager {
  private static instance: SoundManager;
  private enabled: boolean = true;
  private hapticsEnabled: boolean = true;
  private audioContext: AudioContext | null = null;
  private sounds: Partial<Record<FeedbackName, any>> = {};
  private initializing: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  async initialize() {
    if (Platform.OS === 'web') {
      if (this.audioContext) return;
      const AudioContextClass = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if (AudioContextClass) this.audioContext = new AudioContextClass();
      return;
    }

    if (Object.keys(this.sounds).length > 0) return;
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      const { Audio } = require('expo-av');
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const entries = await Promise.all(
        (Object.keys(NATIVE_SOUND_ASSETS) as FeedbackName[]).map(async name => {
          const { sound } = await Audio.Sound.createAsync(NATIVE_SOUND_ASSETS[name], { volume: 0.55 });
          return [name, sound] as const;
        })
      );
      entries.forEach(([name, sound]) => { this.sounds[name] = sound; });
      this.initializing = null;
    })();
    return this.initializing;
  }

  async playSound(soundName: FeedbackName) {
    try {
      if (this.enabled && Platform.OS === 'web') {
        await this.initialize();
        const context = this.audioContext;
        if (context) {
          if (context.state === 'suspended') await context.resume();
          const tone = WEB_TONES[soundName];
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = tone.type;
          oscillator.frequency.value = tone.frequency;
          gain.gain.setValueAtTime(0.0001, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + tone.duration);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + tone.duration + 0.01);
        }
      } else if (this.enabled) {
        await this.initialize();
        await this.sounds[soundName]?.replayAsync();
      }

      if (this.hapticsEnabled && Platform.OS !== 'web') {
        if (soundName === 'match' || soundName === 'combo') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (soundName === 'gameOver') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (soundName === 'drop') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (soundName === 'levelComplete') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          await Haptics.selectionAsync();
        }
      }
    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
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

  async playCombo() {
    await this.playSound('combo');
  }

  async playButton() {
    await this.playSound('button');
  }

  async playLevelComplete() {
    await this.playSound('levelComplete');
  }

  async playGameOver() {
    await this.playSound('gameOver');
  }
}
