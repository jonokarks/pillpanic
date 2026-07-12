import React from 'react';
import { View, ViewStyle } from 'react-native';

interface LinearGradientProps {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: number[];
  style?: ViewStyle;
  children?: React.ReactNode;
}

const LinearGradient: React.FC<LinearGradientProps> = ({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 0, y: 1 },
  locations,
  style,
  children,
}) => {
  // Convert React Native gradient props to CSS gradient
  const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI) + 90;
  
  let gradient = `linear-gradient(${angle}deg`;
  
  if (locations && locations.length === colors.length) {
    colors.forEach((color, index) => {
      gradient += `, ${color} ${locations[index] * 100}%`;
    });
  } else {
    colors.forEach((color, index) => {
      if (index === 0) {
        gradient += `, ${color}`;
      } else {
        gradient += `, ${color}`;
      }
    });
  }
  
  gradient += ')';

  const gradientStyle: ViewStyle = {
    ...style,
    // @ts-ignore - CSS property for web
    background: gradient,
  };

  return <View style={gradientStyle}>{children}</View>;
};

export default LinearGradient;