import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Detect if running on web
const isWeb = Platform.OS === 'web';
const isSmallScreen = screenWidth < 768;
const isMediumScreen = screenWidth >= 768 && screenWidth < 1024;
const isLargeScreen = screenWidth >= 1024;

export const theme = {
  colors: {
    // Premium capsule-lab palette
    primary: {
      red: '#F76F6A',
      redDark: '#D94F4B',
      redGradient: ['#FF8A7E', '#F76F6A', '#D94F4B'] as const,
    },
    secondary: {
      blue: '#67B8F7',
      blueDark: '#397DBE',
      blueGradient: ['#8FD0FF', '#67B8F7', '#397DBE'] as const,
    },
    tertiary: {
      yellow: '#FFD85A',
      yellowDark: '#F8B84E',
      yellowGradient: ['#FFE98A', '#FFD85A', '#F8B84E'] as const,
    },
    mint: '#58D6B7',
    mintDark: '#21A889',
    lavender: '#9B8CFF',
    // UI colors
    background: '#101729',
    backgroundLight: '#18233A',
    labMist: '#EAF7F3',
    boardWell: '#182033',
    surface: '#222C45',
    surfaceLight: '#F7FBF8',
    surfaceGlass: 'rgba(255,255,255,0.12)',
    surfaceGlassStrong: 'rgba(255,255,255,0.18)',
    text: {
      primary: '#FFFFFF',
      secondary: '#B9C5D9',
      disabled: 'rgba(255,255,255,0.36)',
      dark: '#24304A',
      muted: '#69748A',
    },
    success: '#42C99A',
    successGradient: ['#6CE3BE', '#42C99A', '#21A889'] as const,
    error: '#E95B5B',
    errorGradient: ['#FF8A7E', '#E95B5B', '#B74646'] as const,
    warning: '#F8B84E',
    // Game specific
    virus: {
      red: ['#FF8A7E', '#E95B5B', '#B74646'] as const,
      blue: ['#8FD0FF', '#67B8F7', '#397DBE'] as const,
      yellow: ['#FFE98A', '#FFD85A', '#F8B84E'] as const,
    },
    pill: {
      red: ['#FFD3CE', '#F76F6A', '#D94F4B'] as const,
      blue: ['#D5F0FF', '#67B8F7', '#397DBE'] as const,
      yellow: ['#FFF4B8', '#FFD85A', '#F8B84E'] as const,
    },
    boardBackground: '#F7FBF8',
    boardBorder: 'rgba(88, 214, 183, 0.38)',
    cellEmpty: 'rgba(255, 255, 255, 0.055)',
    cellBorder: 'rgba(255, 255, 255, 0.08)',
    modalScrim: 'rgba(8,12,22,0.62)',
    pauseFrost: 'rgba(20,28,46,0.72)',
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
      shadowColor: '#58D6B7',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.42,
      shadowRadius: 18,
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
