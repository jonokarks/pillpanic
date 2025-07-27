import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Detect if running on web
const isWeb = Platform.OS === 'web';
const isSmallScreen = screenWidth < 768;
const isMediumScreen = screenWidth >= 768 && screenWidth < 1024;
const isLargeScreen = screenWidth >= 1024;

export const theme = {
  colors: {
    // Primary colors with gradients
    primary: {
      red: '#FF5E5B',
      redDark: '#E63946',
      redGradient: ['#FF5E5B', '#E63946'],
    },
    secondary: {
      blue: '#5DADE2',
      blueDark: '#2E86AB',
      blueGradient: ['#5DADE2', '#2E86AB'],
    },
    tertiary: {
      yellow: '#FFE66D',
      yellowDark: '#FFC93C',
      yellowGradient: ['#FFE66D', '#FFC93C'],
    },
    // UI colors
    background: '#1A1A2E',
    backgroundLight: '#16213E',
    surface: '#0F3460',
    surfaceLight: '#E94560',
    text: {
      primary: '#FFFFFF',
      secondary: '#B8B8D4',
      disabled: '#6B6B83',
    },
    success: '#4ECDC4',
    error: '#FF6B6B',
    warning: '#FFE66D',
    // Game specific
    virus: {
      red: ['#FF6B6B', '#C44569'],
      blue: ['#4ECDC4', '#2E86AB'],
      yellow: ['#FFE66D', '#F8B500'],
    },
    pill: {
      red: ['#FF5E5B', '#E63946'],
      blue: ['#5DADE2', '#2E86AB'],
      yellow: ['#FFE66D', '#FFC93C'],
    },
    boardBackground: 'rgba(26, 26, 46, 0.95)',
    boardBorder: '#4ECDC4',
    cellEmpty: 'rgba(255, 255, 255, 0.05)',
    cellBorder: 'rgba(255, 255, 255, 0.1)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    huge: 64,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 6,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 12,
    },
    glow: {
      shadowColor: '#4ECDC4',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 10,
    },
  },
  dimensions: {
    screenWidth,
    screenHeight,
    cellSize: Math.min(screenWidth * 0.9 / 8, 45), // Responsive cell size
    maxContentWidth: 1200, // Max width for content on large screens
  },
};

// Helper function to get responsive font size with better web scaling
export const responsiveFontSize = (size: number) => {
  let baseWidth = 375; // iPhone 8 width as base
  let scaleFactor = 1;
  
  if (isWeb) {
    // Different scaling for web based on screen size
    if (isLargeScreen) {
      baseWidth = 1024;
      scaleFactor = 0.8; // Scale down fonts on large screens
    } else if (isMediumScreen) {
      baseWidth = 768;
      scaleFactor = 0.9;
    }
  }
  
  const scale = (screenWidth / baseWidth) * scaleFactor;
  // Clamp the scale to prevent extremely large or small text
  const clampedScale = Math.max(0.8, Math.min(scale, 1.5));
  
  return Math.round(size * clampedScale);
};

// Helper function to get responsive spacing with web optimization
export const responsiveSpacing = (size: number) => {
  let baseWidth = 375;
  let scaleFactor = 1;
  
  if (isWeb) {
    if (isLargeScreen) {
      baseWidth = 1024;
      scaleFactor = 0.7; // Less aggressive spacing on large screens
    } else if (isMediumScreen) {
      baseWidth = 768;
      scaleFactor = 0.85;
    }
  }
  
  const scale = (screenWidth / baseWidth) * scaleFactor;
  const clampedScale = Math.max(0.8, Math.min(scale, 1.3));
  
  return Math.round(size * clampedScale);
};

// Platform-specific helpers
export const platformSelect = <T,>(options: { web?: T; default: T }): T => {
  return isWeb && options.web !== undefined ? options.web : options.default;
};