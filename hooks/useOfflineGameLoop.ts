import { useState, useEffect } from 'react';
import { useOfflineGameStore, getRank, sortHand, generateDeck } from '../store/offlineGameStore';
import { usePlayerStore } from '../store/store';

// ⏱️ CONTROL ANIMATION TIMES HERE
const TIMING = {
  ASK: 3000,    // Time to read "Player A asks Player B"
  CATCH: 2000,  // Celebration time for success
  FAIL: 1500,   // "Go Fish" message time
  FISH: 1500,   // Standard draw (keep it snappy)
  LUCKY: 3000,  // "Lucky Draw" celebration
  BOOK: 2000    // "Set Completed" (needs more time to read)
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useOfflineGameLoop = () => {
  const { room, players, updatePlayer, updateRoom, addLog } = useOfflineGameStore();
  const { playerId } = usePlayerStore();
  
  const [isProcessing, setProcessing] = useState(false);
  const [currentAction, setCurrentAction] = useState<any>(null);

  const sortedPlayers = [...players].sort((a, b) => a.seat_index - b.seat_index);
  const effectiveHost = sortedPlayers[0];
  const isMyTurn = players.find(p => p.seat_index === room.turn_index)?.id === playerId;

  const triggerAction = (action: any) => {
    setCurrentAction(null);
    setTimeout(() => setCurrentAction(action), 10);
  };
  
  const clearAction = () => setCurrentAction(null);

  const processBooks = (hand: string[], currentSets: any[]) => {
      const rankCounts: Record<string, number> = {};
      hand.forEach(c => {
          const r = getRank(c);
          rankCounts[r] = (rankCounts[r] || 0) + 1;
      });

      let newHand = [...hand];
      let newSets = [...(currentSets || [])];
      let bookFound = false;
      let newBookRank = null;

      for (const rank in rankCounts) {
          if (rankCounts[rank] === 4) {
              bookFound = true;
              newBookRank = rank;
              newHand = newHand.filter(c => getRank(c) !== rank);
              newSets.push({ rank, timestamp: Date.now() });
          }
      }
      return { newHand, newSets, bookFound, newBookRank };
  };

  const processMove = async (actorId: string, targetId: string, rank: string) => {
    if (isProcessing) return;
    setProcessing(true);

    const actor = players.find(p => p.id === actorId);
    const target = players.find(p => p.id === targetId);

    if (!actor || !target) { setProcessing(false); return; }

    // 1. ASK ANIMATION
    triggerAction({
        type: 'ASK',
        actorName: actor.name,
        targetName: target.name,
        rank: rank,
        duration: TIMING.ASK // <--- Passing duration
    });

    await delay(TIMING.ASK); // <--- Sync logic with animation

    try {
        const targetHand = target.cards || [];
        const cardsToTransfer = targetHand.filter((c: string) => getRank(c) === rank);

        if (cardsToTransfer.length > 0) {
            // --- CATCH ---
            console.log(`🎣 CATCH: ${actor.name} took ${cardsToTransfer.length} ${rank}s from ${target.name}`);
            
            const newTargetHand = targetHand.filter((c: string) => getRank(c) !== rank);
            updatePlayer(targetId, { cards: newTargetHand });

            const rawActorHand = [...actor.cards, ...cardsToTransfer];
            const { newHand, newSets, newBookRank } = processBooks(rawActorHand, actor.sets);
            updatePlayer(actorId, { cards: sortHand(newHand), sets: newSets });
            
            addLog({ type: 'CATCH', actorId: actor.id, actorName: actor.name, targetId: target.id, targetName: target.name, rank, count: cardsToTransfer.length });

            // 2. CATCH ANIMATION
            triggerAction({
                type: 'CATCH',
                actorName: actor.name,
                targetName: target.name,
                rank,
                count: cardsToTransfer.length,
                duration: TIMING.CATCH // <--- Passing duration
            });

            if (newBookRank) {
                // Wait for CATCH to finish before showing BOOK
                setTimeout(() => {
                    triggerAction({
                        type: 'BOOK',
                        actorName: actor.name,
                        rank: newBookRank,
                        duration: TIMING.BOOK
                    });
                }, TIMING.CATCH + 800); 
            }

        } else {
            // --- FAIL / GO FISH ---
            console.log(`🌊 GO FISH: ${actor.name} missed asking ${target.name} for ${rank}`);
            addLog({ type: 'FAIL', actorId: actor.id, actorName: actor.name, targetId: target.id, targetName: target.name, rank });
            
            triggerAction({
                type: 'FAIL',
                actorName: actor.name,
                targetName: target.name,
                rank,
                duration: TIMING.FAIL // <--- Passing duration
            });
            
            // Wait for FAIL animation before drawing
            setTimeout(() => executeGoFish(actorId, rank, target.seat_index), TIMING.FAIL);
            return; 
        }
    } catch (error) {
        console.error("Move Error:", error);
    } 
    setProcessing(false);
  };

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
      const { newHand, newSets, newBookRank } = processBooks(rawActorHand, actor!.sets);

      updateRoom({ ocean_cards: currentOcean });
      updatePlayer(actorId, { cards: sortHand(newHand), sets: newSets });

      if (drawnRank === rankAsked) {
          // --- LUCKY ---
          console.log(`🍀 LUCKY DRAW: ${actor!.name} got the ${rankAsked}!`);
          addLog({ type: 'LUCKY', actorId: actor!.id, actorName: actor!.name, rank: rankAsked });
          
          triggerAction({
              type: 'LUCKY',
              actorName: actor!.name,
              rank: rankAsked,
              duration: TIMING.LUCKY
          });
      } else {
          // --- STANDARD FISH ---
          console.log(`🐟 FISH: ${actor!.name} drew a card. Turn Passes.`);
          addLog({ type: 'FISH', actorId: actor!.id, actorName: actor!.name });
          
          triggerAction({
            type: 'FISH',
            actorName: actor!.name,
            duration: TIMING.FISH
          });

          passTurn(nextTurnSeat);
      }

      if (newBookRank) {
          const previousActionTime = drawnRank === rankAsked ? TIMING.LUCKY : TIMING.FISH;
          setTimeout(() => {
               triggerAction({
                   type: 'BOOK',
                   actorName: actor!.name,
                   rank: newBookRank,
                   duration: TIMING.BOOK
               });
          }, previousActionTime + 800);
     }

      setProcessing(false);
  };

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

  const askForCard = (targetId: string, rank: string) => {
    processMove(playerId as string, targetId, rank);
  };

  return {
    isMyTurn,
    askForCard,
    processMove,
    isProcessing,
    effectiveHost,
    players, 
    room,
    currentAction,
    clearAction
  };
};