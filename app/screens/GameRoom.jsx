import React from 'react';
import { Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen, Center } from '../../components/Layout';
import { useLobby } from '../../hooks/useLobby';
import { useGameRoom } from '../../hooks/useGameRoom';
import { LobbyView } from '../../components/LobbyView';
import { ActiveGame } from '../../components/ActiveGame';
import { useGameLoop } from '../../hooks/useGameLoop';

export default function GameRoom() {
  const { roomCode } = useLocalSearchParams();

  // 1. Logic Hooks
  const { leaveRoom, toggleReady, startGame, endRoom, isLoading } = useLobby();

  // 2. Game State Hooks (Now includes lastAction for animations)
  const { players, room, lastAction, setLastAction } = useGameRoom(roomCode);

  const onlineGameLoop = useGameLoop(room, players);

  // 3. Action Bundle
  const lobbyActions = { leaveRoom, toggleReady, startGame, endRoom };

  // 4. Loading State
  if (!room) {
    return (
      <Screen>
        <Center>
          <Text className="text-white">Connecting...</Text>
        </Center>
      </Screen>
    );
  }

  // 5. View Switcher
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Game Room', headerShown: false }} />

      {room.status === 'PLAYING' ? (
        <ActiveGame
          room={room}
          players={players}
          actions={{ leaveRoom, endRoom }}
          gameLoop={onlineGameLoop}
          onlineAction={lastAction} // <--- Pass Animation Data
          onClearOnlineAction={() => setLastAction(null)} // <--- Pass Clear Handler
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
