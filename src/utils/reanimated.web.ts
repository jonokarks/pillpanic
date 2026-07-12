// Web fallbacks for react-native-reanimated functions
export const useSharedValue = (initial: any) => {
  return { value: initial };
};

export const withSpring = (value: any, config?: any) => {
  return value;
};

export const withTiming = (value: any, config?: any) => {
  return value;
};

export const withSequence = (...values: any[]) => {
  return values[values.length - 1];
};

export const withRepeat = (value: any, count?: number) => {
  return value;
};

export const useAnimatedStyle = (callback: () => any) => {
  return callback();
};

export const runOnJS = (callback: () => void) => {
  return callback;
};

export const interpolate = (value: number, inputRange: number[], outputRange: number[]) => {
  if (inputRange.length !== outputRange.length) {
    return outputRange[0];
  }
  
  // Simple linear interpolation fallback
  for (let i = 0; i < inputRange.length - 1; i++) {
    if (value >= inputRange[i] && value <= inputRange[i + 1]) {
      const progress = (value - inputRange[i]) / (inputRange[i + 1] - inputRange[i]);
      return outputRange[i] + progress * (outputRange[i + 1] - outputRange[i]);
    }
  }
  
  return value < inputRange[0] ? outputRange[0] : outputRange[outputRange.length - 1];
};

export const Easing = {
  in: (fn: any) => fn,
  out: (fn: any) => fn,
  inOut: (fn: any) => fn,
  linear: (t: number) => t,
  ease: (t: number) => t,
  quad: (t: number) => t * t,
  cubic: (t: number) => t * t * t,
};

// Default export for Animated components
const Animated = {
  View: require('react-native').View,
  ScrollView: require('react-native').ScrollView,
  Text: require('react-native').Text,
};

export default Animated;