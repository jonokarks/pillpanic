import { AppRegistry } from 'react-native';
import App from './App';

// Register the app
AppRegistry.registerComponent('PillPanic', () => App);

// Start the app
AppRegistry.runApplication('PillPanic', {
  rootTag: document.getElementById('root')
});