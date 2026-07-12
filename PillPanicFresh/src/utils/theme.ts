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
    successGradient: ['#4ECDC4', '#2C9B91'],
    error: '#FF6B6B',
    errorGradient: ['#FF6B6B', '#C44569'],
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
    cellSize: (() => {
      if (isWeb) {
        // OPTIMIZED calculation - balance between size and guaranteed fit
        const headerHeight = 90; // Reduced from 120px
        const padding = 50; // Reduced from 80px
        const margin = 30; // Reduced from 40px
        const browserChrome = 60; // Reduced from 100px
        
        // Use 65% of screen height (increased from 50%)
        const availableScreenHeight = screenHeight * 0.65;
        const availableHeight = availableScreenHeight - browserChrome;
        
        // Smart breakpoints for different screen sizes
        const isVeryLargeScreen = screenWidth >= 1440;
        const isLargeScreen = screenWidth >= 1200 && screenWidth < 1440;
        const isMediumScreen = screenWidth >= 900 && screenWidth < 1200;

        // Calculate for 16 rows with optimized spacing
        const boardPadding = 12;
        const cellMargin = 1.5;
        const totalSpacing = (boardPadding * 2) + (16 * cellMargin * 2);

        const spaceForCells = Math.max(availableHeight - totalSpacing, 400);
        const calculatedCellSize = Math.floor(spaceForCells / 16);

        if (isVeryLargeScreen) {
          return Math.max(Math.min(calculatedCellSize, 50), 35);
        } else if (isLargeScreen) {
          return Math.max(Math.min(calculatedCellSize, 45), 30);
        } else if (isMediumScreen) {
          return Math.max(Math.min(calculatedCellSize, 40), 25);
        } else {
          return Math.max(Math.min(calculatedCellSize, 35), 22);
        }
      }
      
      // Mobile: Calculate based on available screen height for better iPhone fit
      // Account for safe areas, header, and UI elements
      const safeAreaTop = 50; // Status bar + notch
      const safeAreaBottom = 40; // Home indicator
      const headerHeight = 80; // Reduced - removed control buttons and next pill container
      const padding = 20; // Reduced general padding
      
      // Available height for the game board (16 rows)
      const availableHeight = screenHeight - safeAreaTop - safeAreaBottom - headerHeight - padding;
      
      // Calculate cell size to fit 16 rows with some spacing
      const cellSpacing = 2; // Small spacing between cells
      const totalSpacing = 16 * cellSpacing;
      const spaceForCells = availableHeight - totalSpacing;
      const heightBasedCellSize = Math.floor(spaceForCells / 16);
      
      // Also consider width-based size (8 columns with padding)
      const widthPadding = 60; // Side padding
      const spaceForWidth = screenWidth - widthPadding;
      const widthBasedCellSize = Math.floor(spaceForWidth / 8);
      
      // Use the smaller of the two to ensure it fits in both directions
      const calculatedSize = Math.min(heightBasedCellSize, widthBasedCellSize);
      
      // Clamp between reasonable bounds for mobile
      return Math.max(Math.min(calculatedSize, 35), 18);
    })(),
    maxContentWidth: 1400, // Increased for better desktop layout
    boardWidth: 8,
    boardHeight: 16,
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