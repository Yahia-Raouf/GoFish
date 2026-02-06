import { useState, useEffect } from 'react';
import { useOfflineGameStore, getRank, sortHand, generateDeck } from '../store/offlineGameStore';
import { usePlayerStore } from '../store/store';

export const useOfflineGameLoop = () => {
  const { room, players, updatePlayer, updateRoom, addLog } = useOfflineGameStore();
  const { playerId } = usePlayerStore();
  
  const [isProcessing, setProcessing] = useState(false);

  // Derived State
  const sortedPlayers = [...players].sort((a, b) => a.seat_index - b.seat_index);
  const effectiveHost = sortedPlayers[0];
  const isMyTurn = players.find(p => p.seat_index === room.turn_index)?.id === playerId;

  // ============================================================
  // 📘 LOGIC: BOOK CHECK
  // ============================================================
  const processBooks = (hand: string[], currentSets: any[]) => {
      const rankCounts: Record<string, number> = {};
      hand.forEach(c => {
          const r = getRank(c);
          rankCounts[r] = (rankCounts[r] || 0) + 1;
      });

      let newHand = [...hand];
      let newSets = [...(currentSets || [])];
      let bookFound = false;

      for (const rank in rankCounts) {
          if (rankCounts[rank] === 4) {
              bookFound = true;
              newHand = newHand.filter(c => getRank(c) !== rank);
              newSets.push({ rank, timestamp: Date.now() });
          }
      }
      return { newHand, newSets, bookFound };
  };

  // ============================================================
  // ⚙️ CORE MOVE EXECUTION
  // ============================================================
  const processMove = async (actorId: string, targetId: string, rank: string) => {
    if (isProcessing) return;
    setProcessing(true);

    const actor = players.find(p => p.id === actorId);
    const target = players.find(p => p.id === targetId);

    if (!actor || !target) { setProcessing(false); return; }

    try {
        const targetHand = target.cards || [];
        const cardsToTransfer = targetHand.filter((c: string) => getRank(c) === rank);

        if (cardsToTransfer.length > 0) {
            // --- CATCH! ---
            console.log(`🎣 CATCH: ${actor.name} took ${cardsToTransfer.length} ${rank}s from ${target.name}`);
            
            // 1. Update Target
            const newTargetHand = targetHand.filter((c: string) => getRank(c) !== rank);
            updatePlayer(targetId, { cards: newTargetHand });

            // 2. Update Actor
            const rawActorHand = [...actor.cards, ...cardsToTransfer];
            const { newHand, newSets } = processBooks(rawActorHand, actor.sets);
            updatePlayer(actorId, { cards: sortHand(newHand), sets: newSets });
            
            // 3. Log (With IDs now!)
            addLog({ 
                type: 'CATCH', 
                actorId: actor.id, 
                actorName: actor.name, 
                targetId: target.id, 
                targetName: target.name, 
                rank, 
                count: cardsToTransfer.length 
            });
        } else {
            // --- GO FISH! ---
            console.log(`🌊 GO FISH: ${actor.name} missed asking ${target.name} for ${rank}`);
            
            addLog({ 
                type: 'FAIL', 
                actorId: actor.id, 
                actorName: actor.name, 
                targetId: target.id, 
                targetName: target.name, 
                rank 
            });
            
            // Delay for UX
            setTimeout(() => executeGoFish(actorId, rank, target.seat_index), 500);
            return; 
        }
    } catch (error) {
        console.error("Move Error:", error);
    } 
    setProcessing(false);
  };

  // ============================================================
  // 🎮 HUMAN UI WRAPPER
  // ============================================================
  const askForCard = (targetId: string, rank: string) => {
    processMove(playerId as string, targetId, rank);
  };

  // ============================================================
  // 🎣 GO FISH LOGIC
  // ============================================================
  const executeGoFish = (actorId: string, rankAsked: string, nextTurnSeat: number) => {
      const actor = players.find(p => p.id === actorId);
      
      if (!room.ocean_cards || room.ocean_cards.length === 0) {
          passTurn(nextTurnSeat);
          setProcessing(false);
          return;
      }

      const currentOcean = [...room.ocean_cards];
      const drawnCard = currentOcean.pop();
      const drawnRank = getRank(drawnCard as string);

      const rawActorHand = [...actor!.cards, drawnCard!];
      const { newHand, newSets } = processBooks(rawActorHand, actor!.sets);

      updateRoom({ ocean_cards: currentOcean });
      updatePlayer(actorId, { cards: sortHand(newHand), sets: newSets });

      if (drawnRank === rankAsked) {
          console.log(`🍀 LUCKY DRAW: ${actor!.name} got the ${rankAsked}!`);
          addLog({ 
              type: 'LUCKY', 
              actorId: actor!.id, 
              actorName: actor!.name, 
              rank: rankAsked 
          });
      } else {
          console.log(`🐟 FISH: ${actor!.name} drew a card. Turn Passes.`);
          addLog({ 
              type: 'FISH', 
              actorId: actor!.id, 
              actorName: actor!.name 
          });
          passTurn(nextTurnSeat);
      }
      setProcessing(false);
  };

  // ============================================================
  // ⏭️ TURN & ROUND MANAGEMENT
  // ============================================================
  const passTurn = (forcedNextSeat: number | null = null) => {
    let candidates = [...sortedPlayers];
    const currentIdx = candidates.findIndex(p => p.seat_index === room.turn_index);
    
    let searchStartIndex = currentIdx + room.direction;
    if (forcedNextSeat !== null) {
        const forcedIdx = candidates.findIndex(p => p.seat_index === forcedNextSeat);
        if (forcedIdx !== -1) searchStartIndex = forcedIdx;
    }

    for (let i = 0; i < candidates.length; i++) {
        let idx = (searchStartIndex + i) % candidates.length;
        if (idx < 0) idx += candidates.length;
        const candidate = candidates[idx];

        if (candidate.cards && candidate.cards.length > 0) {
            updateRoom({ turn_index: candidate.seat_index });
            return;
        }
    }
  };

  useEffect(() => {
    if (room.status !== 'PLAYING' || isProcessing) return;
    const currentPlayer = players.find(p => p.seat_index === room.turn_index);
    if (currentPlayer && currentPlayer.cards.length === 0) {
        const activePlayers = players.filter(p => p.cards.length > 0);
        if (activePlayers.length > 1) {
            passTurn(); 
        }
    }
  }, [room.turn_index, players]);

  useEffect(() => {
      if (room.status !== 'PLAYING' || isProcessing) return;
      const activePlayers = players.filter(p => p.cards.length > 0);
      const isOceanEmpty = room.ocean_cards.length === 0;

      if (isOceanEmpty && activePlayers.length <= 1) {
          startNewRound();
      }
  }, [players, room.ocean_cards]);

  const startNewRound = () => {
    console.log("🎰 Starting New Round...");
    const deck = generateDeck();
    players.forEach(p => {
        updatePlayer(p.id, { cards: sortHand(deck.splice(0, 7)) });
    });
    updateRoom({ ocean_cards: deck, turn_index: Math.floor(Math.random() * players.length), status: 'PLAYING' });
    addLog({ type: 'ROUND_START' });
  };

  return { isMyTurn, askForCard, processMove, isProcessing, effectiveHost, players, room };
};