# Pill Panic

A Dr. Mario-inspired falling block puzzle game built with React Native and Expo for cross-platform support (iOS, Android, and Web).

## Features

- **Cross-platform**: Works on iOS, Android, and Web browsers
- **Classic gameplay**: Match 4 or more same-colored blocks to clear them
- **Touch controls**: Tap to rotate, swipe to move, swipe down fast to drop
- **Keyboard support**: Arrow keys or WASD for movement, Space to rotate
- **Level progression**: Increasing difficulty with more viruses and faster speeds
- **Scoring system**: Points for matches and combos

## Installation

1. Make sure you have Node.js installed (v14 or higher)
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Game

### Web
```bash
npm run web
```
Opens in your default browser at http://localhost:19006

### iOS (requires Mac with Xcode)
```bash
npm run ios
```

### Android (requires Android Studio or connected device)
```bash
npm run android
```

### Development Server
```bash
npm start
```
Then use the Expo Go app on your phone to scan the QR code.

## Building for Production

### Web Build
```bash
npx expo export:web
```
The built files will be in the `web-build` directory.

### iOS Build
```bash
eas build --platform ios
```

### Android Build
```bash
eas build --platform android
```

Note: For iOS and Android builds, you'll need to set up an Expo account and configure EAS Build.

## Game Controls

### Mobile (Touch)
- **Tap**: Rotate pill
- **Swipe left/right**: Move pill horizontally
- **Swipe down**: Fast drop
- **Swipe down quickly**: Instant drop

### Web (Keyboard)
- **Arrow keys** or **WASD**: Move pill
- **Up arrow** or **W** or **Space**: Rotate pill
- **Down arrow** or **S**: Fast drop (hold)
- **Enter**: Instant drop
- **P**: Pause/Resume

## Game Rules

1. Pills fall from the top in 2-tile blocks
2. Match 4 or more blocks of the same color (horizontally or vertically)
3. Clear all viruses to complete the level
4. Game ends if pills stack up to the top

## Project Structure

```
/src
  /components     - UI components (GameBoard, GameControls)
  /game          - Core game logic
    /entities    - Game objects (Board, Pill)
    /systems     - Game systems (MatchingSystem)
    /utils       - Constants and types
  /screens       - Screen components (Menu, Game, GameOver)
```

## Technologies Used

- React Native with Expo
- TypeScript
- react-native-gesture-handler for touch controls
- react-native-reanimated for animations
- react-native-game-engine for game loop management