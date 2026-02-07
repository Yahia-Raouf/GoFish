import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '../../components/Layout';
import { ActiveGame } from '../../components/ActiveGame';
import { ActionOverlay } from '../../components/ActionOverlay';
import { useOfflineGameStore } from '../../store/offlineGameStore';
import { useOfflineGameLoop } from '../../hooks/useOfflineGameLoop';
import { useBotBrain } from '../../hooks/useBotBrain';
import { usePlayerStore } from '../../store/store';

export default function OfflineGameRoom() {
  const router = useRouter();

  // 1. GRAB SETTERS (To fix the identity crisis)
  const { playerName, playerId, setPlayerId, setPlayerName } = usePlayerStore();
  const { initGame, room, players } = useOfflineGameStore();

  useEffect(() => {
    // 2. RESOLVE IDENTITY
    // If the user has no ID (fresh install), we generate a fallback
    // AND save it to the store so the UI knows who "You" are.
    const effectiveName = playerName || 'Hero';
    const effectiveId = playerId || 'offline-hero';

    // FIX: Sync the store if it was empty
    if (!playerId) setPlayerId(effectiveId);
    if (!playerName) setPlayerName(effectiveName);

    // 3. INIT GAME
    // Now we start the game with the ID we are guaranteed to have
    initGame(effectiveName, effectiveId);
  }, []);

  // 4. Load Engine
  const gameLoop = useOfflineGameLoop();
  const { currentAction, clearAction } = gameLoop;

  // 5. Load Brain
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

      {/* The Animation Layer */}
      <ActionOverlay action={currentAction} onFinished={clearAction} />
    </Screen>
  );
}
