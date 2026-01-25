import React from 'react';
import { View, StatusBar, ImageBackground, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEFAULT_BG = require('../assets/bg.png');

export const Row = ({ children, gap = 0, style, className, ...props }) => (
  <View
    style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}
    className={className}
    {...props}>
    {children}
  </View>
);

export const Column = ({ children, gap = 0, style, className, ...props }) => (
  <View style={[{ flexDirection: 'column', gap }, style]} className={className} {...props}>
    {children}
  </View>
);

export const Center = ({ children, style, className, ...props }) => (
  <View
    style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, style]}
    className={className}
    {...props}>
    {children}
  </View>
);

export const Screen = ({ children, background, style, className }) => {
  const isColorBackground = background && !background.includes('.');

  // 1. We determine the behavior based on the OS
  // iOS needs "padding" to push content up.
  // Android usually works best with "height" or default behavior.
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

  const content = (
    <SafeAreaView
      style={[{ flex: 1 }, style]}
      className={className}
      edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" />

      {/* 2. WRAP THE CHILDREN IN KEYBOARD AVOIDING VIEW */}
      <KeyboardAvoidingView behavior={keyboardBehavior} style={{ flex: 1 }}>
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (isColorBackground) {
    return <View style={{ flex: 1, backgroundColor: background }}>{content}</View>;
  }

  return (
    <ImageBackground source={DEFAULT_BG} style={{ flex: 1 }} resizeMode="cover">
      {content}
    </ImageBackground>
  );
};

export const Expanded = ({ flex = 1 }) => <View style={{ flex }} />;
