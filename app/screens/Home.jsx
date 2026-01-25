import React, { useState } from 'react';
import {
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Components
import { Screen, Center, Column } from '../../components/Layout';
import { Button } from '../../components/Button';
import { GameTitle } from '../../components/GameTitle';

// Logic & Data
import { usePlayerStore } from '../../store/store';
import { useLobby } from '../../hooks/useLobby';

export default function Home() {
  const router = useRouter();

  // 1. Data from Store
  const { playerName, logout } = usePlayerStore();

  // 2. Logic from Hook (Handles DB, IDs, Loading, Navigation)
  const { createRoom, joinRoom, isLoading } = useLobby();

  // 3. UI State
  const [modalVisible, setModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // --- UI Handlers ---

  const handleLogout = () => {
    logout(); // Clears Name & ID from Store
    router.replace('/screens/Welcome');
  };

  const handleJoinSubmit = () => {
    // Pass the code to the hook.
    // The hook handles validation, loading state, and navigation.
    joinRoom(joinCode);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Home', headerShown: false }} />

      {/* --- LOGOUT BUTTON (Top Right) --- */}
      <TouchableOpacity
        onPress={handleLogout}
        disabled={isLoading}
        className="absolute right-8 top-14 z-10 flex-row items-center rounded-full border border-white/10 bg-black/20 px-3 py-2">
        <Text className="mr-2 text-xs font-bold uppercase text-blue-200">Logout</Text>
        <MaterialCommunityIcons name="logout" size={16} color="#bfdbfe" />
      </TouchableOpacity>

      <Center>
        <Column gap={50} className="w-full px-10">
          {/* --- HEADER SECTION --- */}
          <View className="items-center">
            {/* Game Logo */}
            <View className="mb-8">
              <GameTitle size="xl" />
            </View>

            {/* Welcome Message */}
            <View className="flex-row flex-wrap items-baseline justify-center gap-2">
              <Text className="text-lg font-bold uppercase tracking-widest text-blue-200 opacity-80">
                Welcome,
              </Text>
              <Text className="text-3xl font-black text-white shadow-lg">{playerName}</Text>
            </View>
          </View>

          {/* --- ACTION BUTTONS --- */}
          <Column gap={25} className="w-full">
            {/* Create Room */}
            <Button
              title={isLoading ? 'Creating...' : 'Create Room'}
              onPress={createRoom} // <-- Hook does the heavy lifting
              variant="primary"
              disabled={isLoading}
            />

            {/* Join Room */}
            <Button
              title="Join Room"
              onPress={() => setModalVisible(true)}
              variant="secondary"
              disabled={isLoading}
            />
          </Column>
        </Column>
      </Center>

      {/* --- JOIN ROOM MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 items-center justify-center bg-black/80">
          {/* Modal Content */}
          <View className="w-4/5 items-center rounded-3xl border-2 border-blue-500/30 bg-slate-900 p-6 shadow-2xl shadow-blue-900/40">
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-1">
              <MaterialCommunityIcons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <Text className="mb-2 text-xl font-black uppercase tracking-wider text-white">
              Enter Room Code
            </Text>
            <Text className="mb-6 text-sm font-medium text-blue-200/60">
              Ask your friend for the code
            </Text>

            {/* Code Input */}
            <TextInput
              className="mb-8 w-full rounded-2xl border-2 border-slate-700 bg-slate-800 py-5 text-center text-3xl font-black uppercase tracking-[8px] text-white"
              placeholder="A B C D"
              placeholderTextColor="#475569"
              maxLength={4}
              autoCapitalize="characters"
              value={joinCode}
              onChangeText={setJoinCode}
              selectionColor="#3b82f6"
            />

            {/* Submit Button */}
            <View className="w-full">
              <Button
                title={isLoading ? 'Joining...' : 'Enter Game'}
                onPress={handleJoinSubmit} // <-- Triggers Hook Logic
                variant="secondary"
                disabled={isLoading}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
