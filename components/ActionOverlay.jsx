import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  BounceIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CardVisual } from './CardVisual';

// 🐟 Wobble Effect
const WobbleView = ({ children }) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSequence(
      withTiming(-10, { duration: 100 }),
      withRepeat(withTiming(10, { duration: 100 }), 6, true),
      withTiming(0, { duration: 100 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
};

// ⭐ Spin Effect
const SpinView = ({ children }) => {
  const rotate = useSharedValue(0);

  useEffect(() => {
    // 3 full rotations for shuffling feeling
    rotate.value = withTiming(360 * 3, { duration: 2500 });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
};

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
            <Animated.View entering={FadeInDown.duration(500)} className="mb-4">
              <CardVisual
                card={String(action.rank) + 'S'}
                size="xl"
                className="border-4 border-blue-400 opacity-90"
              />
              <Animated.View
                entering={ZoomIn.delay(300).duration(300)}
                className="absolute -right-4 -top-4 rounded-full border-4 border-slate-900 bg-blue-500 p-2 shadow-lg">
                <MaterialCommunityIcons name="help" size={32} color="white" />
              </Animated.View>
            </Animated.View>

            <View className="flex-row flex-wrap justify-center gap-1">
              <Animated.Text
                entering={FadeInUp.delay(100)}
                className="text-xl font-black uppercase text-white shadow-black">
                {action.actorName}
              </Animated.Text>
              <Animated.Text
                entering={FadeInUp.delay(200)}
                className="text-xl font-bold text-blue-200">
                is asking
              </Animated.Text>
              <Animated.Text
                entering={FadeInUp.delay(300)}
                className="text-xl font-black uppercase text-white shadow-black">
                {action.targetName}
              </Animated.Text>
            </View>

            <Animated.Text
              entering={FadeInUp.delay(400).duration(500)}
              className="mt-2 text-center text-3xl font-black italic text-white shadow-black">
              DO YOU HAVE A
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(500).duration(500)}
              className="text-center text-5xl font-black italic text-yellow-400 shadow-black">
              {action.rank}?
            </Animated.Text>
          </View>
        );

      case 'CATCH':
        return (
          <View className="items-center">
            {/* BounceIn with standard duration instead of spring stiffness */}
            <Animated.View entering={BounceIn.duration(600)} className="mb-4">
              <CardVisual
                card={String(action.rank) + 'S'}
                size="xl"
                className="border-4 border-green-400"
              />
              <Animated.View
                entering={ZoomIn.delay(200)}
                className="absolute -right-4 -top-4 rounded-full border-4 border-slate-900 bg-green-500 p-2 shadow-lg">
                <MaterialCommunityIcons name="check-bold" size={28} color="white" />
              </Animated.View>
            </Animated.View>

            <Animated.Text
              entering={ZoomIn.delay(100).duration(300)}
              className="text-center text-4xl font-black italic text-white shadow-black">
              CATCH!
            </Animated.Text>
            <Animated.Text entering={FadeInUp.delay(300)} className="text-center text-blue-200">
              {action.actorName} took{' '}
              <Text className="font-bold text-yellow-400">{action.count}</Text> cards from{' '}
              {action.targetName}
            </Animated.Text>
          </View>
        );

      case 'FAIL':
        return (
          <View className="items-center">
            <Animated.View entering={ZoomIn.duration(400)} className="mb-4">
              <WobbleView>
                <View className="h-32 w-24 items-center justify-center rounded-xl border-4 border-blue-400 bg-blue-900 shadow-xl">
                  <MaterialCommunityIcons name="fish" size={56} color="#60a5fa" />
                </View>
              </WobbleView>
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.duration(500)}
              className="text-center text-4xl font-black uppercase tracking-widest text-blue-400 shadow-black">
              GO FISH!
            </Animated.Text>

            <Animated.View entering={FadeInUp.delay(200)} className="mt-1 items-center">
              <Text className="text-center text-blue-200">{action.targetName} doesn't have a</Text>
              <Text className="text-center text-2xl font-black text-white">
                {String(action.rank)}
              </Text>
            </Animated.View>
          </View>
        );

      case 'FISH':
        return (
          <View className="items-center">
            <Animated.View entering={FadeInDown.duration(500)} className="mb-4">
              <View className="h-32 w-24 items-center justify-center rounded-xl border-4 border-blue-300 bg-blue-600 shadow-xl">
                <MaterialCommunityIcons name="cards-playing-outline" size={48} color="#93c5fd" />
              </View>
            </Animated.View>
            <Animated.Text
              entering={ZoomIn.delay(100)}
              className="text-center text-2xl font-black italic text-blue-300 shadow-black">
              DRAWING...
            </Animated.Text>
            <Animated.Text entering={FadeInUp.delay(200)} className="text-center text-blue-200">
              {action.actorName} picked a card.
            </Animated.Text>
          </View>
        );

      case 'LUCKY':
        return (
          <View className="items-center">
            <Animated.View entering={ZoomIn.duration(400)} className="mb-4">
              <SpinView>
                <CardVisual
                  card={String(action.rank) + 'D'}
                  size="xl"
                  className="border-4 border-yellow-400 shadow-yellow-500/50"
                />
              </SpinView>
              <Animated.View
                entering={ZoomIn.delay(400).duration(300)}
                className="absolute -right-6 -top-6">
                <MaterialCommunityIcons name="star-four-points" size={50} color="#facc15" />
              </Animated.View>
            </Animated.View>

            <Animated.Text
              entering={ZoomIn.duration(500)}
              className="text-center text-3xl font-black italic text-yellow-400 shadow-black">
              LUCKY DRAW!
            </Animated.Text>
            <Animated.Text entering={FadeInUp.delay(300)} className="text-center text-blue-100">
              {action.actorName} goes again!
            </Animated.Text>
          </View>
        );

      case 'BOOK':
        return (
          <View className="items-center">
            <View className="mb-4 flex-row">
              <Animated.View entering={FadeInDown.delay(0).duration(400)}>
                <CardVisual
                  card={String(action.rank) + 'S'}
                  size="md"
                  className="rotate-[-10deg]"
                />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <CardVisual
                  card={String(action.rank) + 'D'}
                  size="md"
                  className="-ml-8 rotate-[5deg]"
                />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <CardVisual
                  card={String(action.rank) + 'C'}
                  size="md"
                  className="-ml-8 rotate-[20deg]"
                />
              </Animated.View>
            </View>

            <Animated.Text
              entering={BounceIn.duration(600)}
              className="text-center text-3xl font-black italic text-green-400 shadow-black">
              SET COMPLETED!
            </Animated.Text>
            <Animated.Text entering={FadeInUp.delay(300)} className="text-center text-blue-100">
              {action.actorName} collected all {String(action.rank)}s
            </Animated.Text>
          </View>
        );

      case 'ROUND':
        return (
          <View className="items-center">
            {/* Spinning Deck Icon */}
            <Animated.View entering={ZoomIn.duration(500)} className="mb-6">
              <SpinView>
                <View className="h-28 w-20 items-center justify-center rounded-xl border-4 border-white/30 bg-blue-600 shadow-xl">
                  <MaterialCommunityIcons name="cards" size={48} color="white" />
                </View>
              </SpinView>
            </Animated.View>

            <Animated.Text
              entering={FadeInUp.delay(200).duration(500)}
              className="text-center text-3xl font-black italic text-blue-200 shadow-black">
              OCEAN EMPTY
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(400).duration(500)}
              className="mt-2 text-center text-4xl font-black text-white">
              SHUFFLING...
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(600).duration(500)}
              className="mt-4 text-center text-blue-300">
              Dealing new hands to all players
            </Animated.Text>
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
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

      <Animated.View
        entering={ZoomIn.duration(300)}
        exiting={ZoomOut.duration(200)}
        className="w-[85%] rounded-[32px] border-2 border-white/20 bg-slate-900/95 p-8 shadow-2xl shadow-black">
        {renderContent()}
      </Animated.View>
    </Animated.View>
  );
};
