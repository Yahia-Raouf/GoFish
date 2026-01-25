import '../global.css';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient'; // 1. Import Gradient

export default function Layout() {
  return (
    // 2. Wrap the whole app in the Gradient
    // This acts as the "Canvas" behind your screens.
    <LinearGradient
      colors={['#1e3a8a', '#172554', '#020617']}
      style={{ flex: 1 }}
    >
      <StatusBar style="light" />
      
      <Stack
        screenOptions={{
          headerShown: false,
          // 3. Keep screens transparent so the gradient shows through during the fade
          contentStyle: { backgroundColor: 'transparent' }, 
          animation: 'fade', 
        }}
      />
    </LinearGradient>
  );
}