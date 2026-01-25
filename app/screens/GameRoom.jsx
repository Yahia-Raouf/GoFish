import React from 'react';
import { Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen, Center } from '../../components/Layout';
import { useLobby } from '../../hooks/useLobby';
import { useGameRoom } from '../../hooks/useGameRoom';
import { LobbyView } from '../../components/LobbyView'; // <--- Imported
import { ActiveGame } from '../../components/ActiveGame'; // <--- Imported

export default function GameRoom() {
  const { roomCode } = useLocalSearchParams();

  // 1. Logic Hooks
  const { leaveRoom, toggleReady, startGame, endRoom, isLoading } = useLobby();
  const { players, room } = useGameRoom(roomCode);

  // 2. Action Bundle (Pass this down to keep props clean)
  const lobbyActions = { leaveRoom, toggleReady, startGame, endRoom };

  // 3. Loading State
  if (!room) {
    return (
      <Screen>
        <Center>
          <Text className="text-white">Connecting...</Text>
        </Center>
      </Screen>
    );
  }

  // 4. View Switcher
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Game Room', headerShown: false }} />

      {room.status === 'PLAYING' ? (
        <ActiveGame
          room={room}
          players={players}
          actions={{ leaveRoom, endRoom }} // ActiveGame might need different actions later
        />
      ) : (
        <LobbyView
          roomCode={roomCode}
          players={players}
          isLoading={isLoading}
          actions={lobbyActions}
        />
      )}
    </Screen>
  );
}
