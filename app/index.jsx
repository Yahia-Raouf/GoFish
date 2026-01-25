import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../store/store';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GameTitle } from '../components/GameTitle';

export default function Index() {
  const router = useRouter();
  const playerName = usePlayerStore((state) => state.playerName);

  // 1. Split the state into two independent flags
  const [isFontReady, setIsFontReady] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);

  useEffect(() => {
    // TASK A: Load the Font (Usually fast)
    // We run this independently so the Title can appear ASAP
    Font.loadAsync(MaterialCommunityIcons.font).then(() => {
      setIsFontReady(true);
    });

    // TASK B: Load the Image + Minimum Timer (Usually slower)
    async function loadHeavyAssets() {
      try {
        const imagePromise = Asset.fromModule(require('../assets/bg.png')).downloadAsync();
        // We keep a small delay (1s) to ensure the user actually gets to see the Title
        // before the app flips to the next screen.
        const minWaitPromise = new Promise((resolve) => setTimeout(resolve, 1000));

        await Promise.all([imagePromise, minWaitPromise]);
        setIsImageReady(true);
      } catch (e) {
        console.warn(e);
        // Even if image fails, we should probably proceed or handle error,
        // but for now we set true to unblock the app.
        setIsImageReady(true);
      }
    }

    loadHeavyAssets();
  }, []);

  // TASK C: The Navigation Trigger
  // Only runs when BOTH flags are true
  useEffect(() => {
    if (isFontReady && isImageReady) {
      if (playerName) {
        router.replace('/screens/Home');
      } else {
        router.replace('/screens/Welcome');
      }
    }
  }, [isFontReady, isImageReady, playerName]);

  return (
    <LinearGradient
      colors={['#1e3a8a', '#172554', '#020617']}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {/* LOGIC: 
         - If font is NOT ready: Render nothing here (just spinner below).
         - If font IS ready: Render GameTitle (icons will work now).
      */}
      {isFontReady && (
        <View className="mb-8">
          <GameTitle size="xl" />
          <Text className="mt-4 text-center text-lg font-medium text-blue-100">
            The Classic Card Game
          </Text>
        </View>
      )}

      <ActivityIndicator size="large" color="#93c5fd" />
    </LinearGradient>
  );
}
