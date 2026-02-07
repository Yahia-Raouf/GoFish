import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '../../components/Layout';
import { ActiveGame } from '../../components/ActiveGame';
import { ActionOverlay } from '../../components/ActionOverlay'; // <--- NEW IMPORT
import { useOfflineGameStore } from '../../store/offlineGameStore';
import { useOfflineGameLoop } from '../../hooks/useOfflineGameLoop';
import { useBotBrain } from '../../hooks/useBotBrain';
import { usePlayerStore } from '../../store/store';

export default function OfflineGameRoom() {
  const router = useRouter();
  const { playerName, playerId } = usePlayerStore();
  const { initGame, room, players } = useOfflineGameStore();

  // 1. Init Game on Mount
  useEffect(() => {
    initGame(playerName || 'Hero', playerId || 'offline-hero');
  }, []);

  // 2. Load Engine
  const gameLoop = useOfflineGameLoop();
  const { currentAction, clearAction } = gameLoop; // <--- Destructure Animation Data

  // 3. Load Brain
  useBotBrain(gameLoop.processMove, gameLoop.isProcessing);

  const handleExit = () => {
    router.replace('/screens/Home');
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Offline Game', headerShown: false }} />

      {/* The Main Game Table */}
      <ActiveGame
        room={room}
        players={players}
        actions={{ leaveRoom: handleExit, endRoom: handleExit }}
        gameLoop={gameLoop}
      />

      {/* The Animation Layer (Z-Index 100) */}
      <ActionOverlay action={currentAction} onFinished={clearAction} />
    </Screen>
  );
}
