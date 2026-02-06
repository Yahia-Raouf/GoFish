import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '../../components/Layout';
import { ActiveGame } from '../../components/ActiveGame';
import { useOfflineGameStore } from '../../store/offlineGameStore';
import { useOfflineGameLoop } from '../../hooks/useOfflineGameLoop';
import { useBotBrain } from '../../hooks/useBotBrain';
import { usePlayerStore } from '../../store/store';

export default function OfflineGameRoom() {
  const router = useRouter();
  // 1. Get Setters to sync ID if missing
  const { playerName, playerId, setPlayerId, setPlayerName } = usePlayerStore();
  const { initGame, room, players } = useOfflineGameStore();

  // 2. Initialize Game & Sync ID
  useEffect(() => {
    let finalName = playerName;
    let finalId = playerId;

    // If no global ID/Name exists, generate and SAVE them
    if (!finalId) {
      finalId = 'hero-' + Date.now();
      setPlayerId(finalId); // <--- Updates global store so ActiveGame recognizes you
    }
    if (!finalName) {
      finalName = 'Hero';
      setPlayerName(finalName);
    }

    console.log(`🎮 Init Offline Game for: ${finalName} (${finalId})`);
    initGame(finalName, finalId);
  }, []);

  const gameLoop = useOfflineGameLoop();

  // 3. Load Bot Brain
  useBotBrain(gameLoop.processMove, gameLoop.isProcessing);

  const handleExit = () => {
    router.replace('/screens/Home');
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Offline Game', headerShown: false }} />
      <ActiveGame
        room={room}
        players={players}
        actions={{ leaveRoom: handleExit, endRoom: handleExit }}
        gameLoop={gameLoop}
      />
    </Screen>
  );
}
