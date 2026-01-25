import React from 'react';
import { View, Text } from 'react-native';
import { Center, Column } from './Layout';
import { Button } from './Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/store';

export const LobbyView = ({ roomCode, players, isLoading, actions }) => {
  const { playerId } = usePlayerStore();
  const myPlayer = players.find((p) => p.id === playerId);

  // ============================================================
  // 👑 HOST LOGIC (Implicit Migration)
  // The "Host" is the player with the lowest seat_index.
  // ============================================================
  const sortedPlayers = [...players].sort((a, b) => a.seat_index - b.seat_index);
  const effectiveHost = sortedPlayers[0];

  // Am I the effective host?
  const isHost = myPlayer?.id === effectiveHost?.id;

  // Are all OTHER players ready? (Must have at least 2 players to start)
  const everyoneReady = players.length > 1 && players.every((p) => p.is_ready);

  // ============================================================
  // 🔘 BUTTON STATE LOGIC
  // ============================================================
  let mainButton = { title: 'Loading...', onPress: () => {}, variant: 'secondary', disabled: true };

  if (isHost) {
    // --- HOST CONTROLS ---
    if (everyoneReady) {
      mainButton = {
        title: 'Start Game',
        onPress: () => actions.startGame(roomCode),
        variant: 'primary', // Gold/Yellow
        disabled: false,
      };
    } else {
      mainButton = {
        title: players.length < 2 ? 'Need Players' : 'Waiting...',
        onPress: () => {},
        variant: 'secondary',
        disabled: true, // Grayed out until ready
      };
    }
  } else {
    // --- GUEST CONTROLS ---
    if (myPlayer?.is_ready) {
      mainButton = {
        title: 'Not Ready',
        onPress: () => actions.toggleReady(true), // Pass current=true to flip to false
        variant: 'secondary', // Blue
        disabled: false,
      };
    } else {
      mainButton = {
        title: 'Ready Up!',
        onPress: () => actions.toggleReady(false), // Pass current=false to flip to true
        variant: 'primary',
        disabled: false,
      };
    }
  }

  return (
    <Center>
      <Column gap={24} className="w-full px-6 pt-10">
        {/* --- ROOM CODE HEADER --- */}
        <View className="items-center">
          <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-200">
            Room Code
          </Text>
          <View className="rounded-2xl border-2 border-white/20 bg-white/10 px-8 py-4 shadow-sm">
            <Text className="text-5xl font-black tracking-[8px] text-yellow-400">{roomCode}</Text>
          </View>
        </View>

        {/* --- PLAYERS LIST --- */}
        <View className="w-full">
          <Text className="mb-4 ml-2 text-sm font-bold uppercase tracking-wider text-white/60">
            Players ({players.length}/4)
          </Text>

          <View className="gap-3">
            {/* 1. RENDER ACTUAL PLAYERS */}
            {players.map((player) => {
              const isThisPlayerHost = player.id === effectiveHost?.id;

              return (
                <View
                  key={player.id}
                  className="flex-row items-center rounded-xl border border-blue-500/30 bg-slate-900/80 p-4">
                  {/* Avatar */}
                  <View className="mr-4 h-10 w-10 items-center justify-center rounded-full border border-blue-400 bg-blue-600">
                    <Text className="text-xl">{player.avatar || '🙂'}</Text>
                  </View>

                  {/* Name & Host Badge */}
                  <View>
                    <Text className="text-lg font-bold text-white">{player.name}</Text>
                    {isThisPlayerHost && (
                      <Text className="text-xs font-bold uppercase tracking-wide text-yellow-400">
                        Host
                      </Text>
                    )}
                  </View>

                  {/* Ready Status Icon */}
                  <View className="ml-auto">
                    {player.is_ready ? (
                      <MaterialCommunityIcons name="check-circle" size={24} color="#4ade80" />
                    ) : (
                      <MaterialCommunityIcons name="dots-horizontal" size={24} color="#64748b" />
                    )}
                  </View>
                </View>
              );
            })}

            {/* 2. RENDER EMPTY SLOTS */}
            {[...Array(4 - players.length)].map((_, i) => (
              <View
                key={`empty-${i}`}
                className="flex-row items-center rounded-xl border border-dashed border-white/10 bg-black/20 p-4 opacity-50">
                <View className="mr-4 h-10 w-10 rounded-full bg-white/5" />
                <Text className="font-bold italic text-white/30">Waiting...</Text>
              </View>
            ))}
          </View>
        </View>

        {/* --- ACTIONS --- */}
        <View className="mt-auto w-full gap-4 pb-8">
          {/* Main Button (Start/Ready) */}
          <Button
            title={mainButton.title}
            onPress={mainButton.onPress}
            variant={mainButton.variant}
            disabled={mainButton.disabled || isLoading}
          />

          {/* SECONDARY BUTTONS */}
          {isHost ? (
            // HOST SEES: END ROOM
            <Button title="End Room" variant="danger" onPress={() => actions.endRoom(roomCode)} />
          ) : (
            // GUEST SEES: LEAVE ROOM
            <Button title="Leave Room" variant="danger" onPress={actions.leaveRoom} />
          )}
        </View>
      </Column>
    </Center>
  );
};
