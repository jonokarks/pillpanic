import React from 'react';
import { View, ViewProps } from 'react-native';

// Export everything from react-native-web first
export * from 'react-native-web';

// Web fallbacks for react-native-gesture-handler

export const State = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
};

export const GestureHandlerRootView: React.FC<ViewProps> = ({ children, ...props }) => {
  return <View {...props}>{children}</View>;
};

export const TapGestureHandler: React.FC<any> = ({ children, onHandlerStateChange, ...props }) => {
  const handlePress = () => {
    if (onHandlerStateChange) {
      onHandlerStateChange({
        nativeEvent: {
          state: State.ACTIVE,
          x: 0,
          y: 0,
        },
      });
    }
  };

  return (
    <View onTouchEnd={handlePress} {...props}>
      {children}
    </View>
  );
};

export const PanGestureHandler: React.FC<any> = ({ children, onHandlerStateChange, onGestureEvent, ...props }) => {
  const handlePanStart = (event: any) => {
    if (onHandlerStateChange) {
      onHandlerStateChange({
        nativeEvent: {
          state: State.BEGAN,
          translationX: 0,
          translationY: 0,
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
        },
      });
    }
  };

  const handlePanMove = (event: any) => {
    if (onGestureEvent) {
      onGestureEvent({
        nativeEvent: {
          translationX: event.nativeEvent.pageX,
          translationY: event.nativeEvent.pageY,
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
        },
      });
    }
  };

  const handlePanEnd = (event: any) => {
    if (onHandlerStateChange) {
      onHandlerStateChange({
        nativeEvent: {
          state: State.END,
          translationX: event.nativeEvent.pageX,
          translationY: event.nativeEvent.pageY,
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
        },
      });
    }
  };

  return (
    <View
      onTouchStart={handlePanStart}
      onTouchMove={handlePanMove}
      onTouchEnd={handlePanEnd}
      {...props}
    >
      {children}
    </View>
  );
};