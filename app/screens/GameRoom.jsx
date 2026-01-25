import React from 'react';
import { Text, View, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Center, Column } from '../../components/Layout';
import { Button } from '../../components/Button';
import { useLobby } from '../../hooks/useLobby';
import { useGameRoom } from '../../hooks/useGameRoom'; // <--- Import New Hook
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function GameRoom() {
  const { roomCode } = useLocalSearchParams();
  const { leaveRoom } = useLobby();

  // Get Realtime Players
  const { players } = useGameRoom(roomCode);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Game Room', headerShown: false }} />

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

          {/* --- PLAYERS LIST (Placeholder UI) --- */}
          <View className="w-full">
            <Text className="mb-4 ml-2 text-sm font-bold uppercase tracking-wider text-white/60">
              Players ({players.length}/4)
            </Text>

            <View className="gap-3">
              {players.map((player) => (
                <View
                  key={player.id}
                  className="flex-row items-center rounded-xl border border-blue-500/30 bg-slate-900/80 p-4">
                  {/* Avatar Icon */}
                  <View className="mr-4 h-10 w-10 items-center justify-center rounded-full border border-blue-400 bg-blue-600">
                    <Text className="text-xl">{player.avatar || '🙂'}</Text>
                  </View>

                  {/* Name & Role */}
                  <View>
                    <Text className="text-lg font-bold text-white">{player.name}</Text>
                    {player.seat_index === 0 && (
                      <Text className="text-xs font-bold uppercase tracking-wide text-yellow-400">
                        Host
                      </Text>
                    )}
                  </View>

                  {/* Ready Status (Right side) */}
                  <View className="ml-auto">
                    {player.is_ready ? (
                      <MaterialCommunityIcons name="check-circle" size={24} color="#4ade80" />
                    ) : (
                      <MaterialCommunityIcons name="dots-horizontal" size={24} color="#64748b" />
                    )}
                  </View>
                </View>
              ))}

              {/* Empty Slots Placeholders */}
              {[...Array(4 - players.length)].map((_, i) => (
                <View
                  key={`empty-${i}`}
                  className="flex-row items-center rounded-xl border border-dashed border-white/10 bg-black/20 p-4 opacity-50">
                  <View className="mr-4 h-10 w-10 rounded-full bg-white/5" />
                  <Text className="font-bold italic text-white/30">Waiting for player...</Text>
                </View>
              ))}
            </View>
          </View>

          {/* --- ACTION BUTTON --- */}
          <Button title="Leave Room" variant="danger" className="mt-4" onPress={leaveRoom} />
        </Column>
      </Center>
    </Screen>
  );
}
