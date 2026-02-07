import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut, BounceIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CardVisual } from './CardVisual';

export const ActionOverlay = ({ action, onFinished }) => {
  useEffect(() => {
    if (action) {
      const duration = action.duration || 2000;
      const timer = setTimeout(() => {
        onFinished();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [action]);

  if (!action) return null;

  const renderContent = () => {
    switch (action.type) {
      case 'ASK':
        return (
          <View className="items-center">
            <Animated.View entering={ZoomIn.duration(300)} className="mb-4">
              <CardVisual
                card={String(action.rank) + 'S'}
                size="xl"
                className="border-4 border-blue-400 opacity-90"
              />
              <View className="absolute -right-3 -top-3 rounded-full border-2 border-white bg-blue-500 p-2 shadow-lg">
                <MaterialCommunityIcons name="help" size={30} color="white" />
              </View>
            </Animated.View>

            <View className="flex-row flex-wrap justify-center gap-1">
              <Text className="text-xl font-black uppercase text-white shadow-black">
                {action.actorName}
              </Text>
              <Text className="text-xl font-bold text-blue-200">is asking</Text>
              <Text className="text-xl font-black uppercase text-white shadow-black">
                {action.targetName}
              </Text>
            </View>

            {/* --- FIX APPLIED HERE --- */}
            <Text className="mt-2 text-center text-3xl font-black italic text-white shadow-black">
              DO YOU HAVE A
            </Text>
            <Text className="text-center text-3xl font-black italic text-yellow-400 shadow-black">
              {action.rank}?
            </Text>
            {/* ------------------------ */}
          </View>
        );

      case 'CATCH':
        return (
          <View className="items-center">
            <Animated.View entering={BounceIn.delay(200)} className="mb-4">
              <CardVisual
                card={String(action.rank) + 'S'}
                size="xl"
                className="border-4 border-green-400"
              />
              <View className="absolute -bottom-3 -right-3 rounded-full bg-green-500 p-2 shadow-lg">
                <MaterialCommunityIcons name="check-bold" size={24} color="white" />
              </View>
            </Animated.View>
            <Text className="text-center text-2xl font-black italic text-white shadow-black">
              CATCH!
            </Text>
            <Text className="text-center text-blue-200">
              {action.actorName} took{' '}
              <Text className="font-bold text-yellow-400">{action.count}</Text> cards from{' '}
              {action.targetName}
            </Text>
          </View>
        );

      case 'FAIL':
        return (
          <View className="items-center">
            <Animated.View entering={ZoomIn.duration(500)} className="mb-4">
              <View className="h-32 w-24 items-center justify-center rounded-xl border-4 border-blue-400 bg-blue-900 shadow-xl">
                <MaterialCommunityIcons name="fish" size={48} color="#60a5fa" />
              </View>
            </Animated.View>
            <Text className="text-center text-3xl font-black uppercase tracking-widest text-blue-400 shadow-black">
              GO FISH!
            </Text>

            <View className="mt-1 items-center">
              <Text className="text-center text-blue-200">{action.targetName} doesn't have a</Text>
              {/* Applied safety split here too, just in case */}
              <Text className="text-center font-bold text-white">{String(action.rank)}</Text>
            </View>
          </View>
        );

      case 'FISH':
        return (
          <View className="items-center">
            <Animated.View entering={ZoomIn.duration(500)} className="mb-4">
              <View className="h-32 w-24 items-center justify-center rounded-xl border-4 border-blue-300 bg-blue-600 shadow-xl">
                <MaterialCommunityIcons name="cards-playing-outline" size={48} color="#93c5fd" />
              </View>
            </Animated.View>
            <Text className="text-center text-2xl font-black italic text-blue-300 shadow-black">
              DRAWING...
            </Text>
            <Text className="text-center text-blue-200">{action.actorName} picked a card.</Text>
          </View>
        );

      case 'LUCKY':
        return (
          <View className="items-center">
            <Animated.View entering={ZoomIn.rotate('15deg')} className="mb-4">
              <CardVisual
                card={String(action.rank) + 'D'}
                size="xl"
                className="border-4 border-yellow-400"
              />
              <View className="absolute -right-4 -top-4">
                <MaterialCommunityIcons name="star-four-points" size={40} color="#facc15" />
              </View>
            </Animated.View>
            <Text className="text-center text-2xl font-black italic text-yellow-400 shadow-black">
              LUCKY DRAW!
            </Text>
            <Text className="text-center text-blue-100">{action.actorName} goes again!</Text>
          </View>
        );

      case 'BOOK':
        return (
          <View className="items-center">
            <Animated.View entering={BounceIn} className="mb-4 flex-row gap-[-10px]">
              <CardVisual card={String(action.rank) + 'S'} size="md" className="rotate-[-10deg]" />
              <CardVisual
                card={String(action.rank) + 'D'}
                size="md"
                className="-ml-6 rotate-[5deg]"
              />
            </Animated.View>
            <Text className="text-center text-2xl font-black italic text-green-400 shadow-black">
              SET COMPLETED!
            </Text>
            <Text className="text-center text-blue-100">
              {action.actorName} collected all {String(action.rank)}s
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 100, alignItems: 'center', justifyContent: 'center' },
      ]}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <Animated.View
        entering={ZoomIn.springify()}
        exiting={ZoomOut.duration(200)}
        className="w-[80%] rounded-3xl border border-white/20 bg-slate-900/90 p-8 shadow-2xl shadow-black">
        {renderContent()}
      </Animated.View>
    </Animated.View>
  );
};
