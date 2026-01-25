import React, { useState } from 'react';
import { Text, TextInput, Alert, View } from 'react-native';
import { Screen, Center, Column } from '../../components/Layout';
import { Button } from '../../components/Button';
import { usePlayerStore } from '../../store/store';
import { useRouter, Stack } from 'expo-router';
import { GameTitle } from '../../components/GameTitle';

export default function Welcome() {
  const [name, setName] = useState('');
  const setPlayerName = usePlayerStore((state) => state.setPlayerName);
  const router = useRouter();

  const handleSave = () => {
    try {
      if (name.trim().length < 3) {
        Alert.alert('Too Short', 'Please enter at least 3 characters.');
        return;
      }
      setPlayerName(name.trim());
      router.replace('/screens/Home');
    } catch (error) {
      Alert.alert('Crash Prevented', error.message);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Welcome', headerShown: false }} />
      <Center>
        <Column gap={20} className="w-full px-10">
          <View className="mb-10 mt-4 items-center">
            <GameTitle size="xl" />
            <Text className="mt-4 text-center text-lg font-medium text-blue-100">
              The Classic Card Game
            </Text>
          </View>

          {/* INPUT SECTION */}
          <View className="w-full">
            {/* NEW LABEL ADDED HERE */}
            <Text className="mb-2 ml-1 text-sm font-bold uppercase tracking-wider text-blue-200">
              Enter your Gamertag
            </Text>

            <TextInput
              className="w-full rounded-xl border border-white/20 bg-white/10 p-4 text-lg text-white placeholder:text-blue-200/50"
              placeholder="e.g. AceHunter"
              placeholderTextColor="#bfdbfe" // Light blue (Tailwind blue-200)
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Button title="Let's Play" variant="primary" onPress={handleSave} />
        </Column>
      </Center>
    </Screen>
  );
}
