import { useState, useEffect, useRef } from 'react';
import { useOfflineGameStore, getRank, sortHand, generateDeck } from '../store/offlineGameStore';
import { usePlayerStore } from '../store/store';

// ⏱️ CONTROL ANIMATION TIMES HERE
const TIMING = {
  ASK: 3000,
  CATCH: 2000,
  FAIL: 1500,
  FISH: 1500,
  LUCKY: 3000,
  BOOK: 2500,
  ROUND: 3000
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useOfflineGameLoop = () => {
  const { room, players, updatePlayer, updateRoom, addLog } = useOfflineGameStore();
  const { playerId } = usePlayerStore();
  
  const [isProcessing, setProcessing] = useState(false);
  const [currentAction, setCurrentAction] = useState<any>(null);

  // 🛑 REFS: Hold latest state to avoid "Stale Closures" in async functions
  const playersRef = useRef(players);
  const roomRef = useRef(room);
  const skipTurnTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

  // Keep Refs Synced
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { roomRef.current = room; }, [room]);

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

    triggerAction({
        type: 'ASK',
        actorName: actor.name,
        targetName: target.name,
        rank: rank,
        duration: TIMING.ASK
    });

    await delay(TIMING.ASK); 

    try {
        const targetHand = target.cards || [];
        const cardsToTransfer = targetHand.filter((c: string) => getRank(c) === rank);

        if (cardsToTransfer.length > 0) {
            console.log(`🎣 CATCH: ${actor.name} took ${cardsToTransfer.length} ${rank}s from ${target.name}`);
            
            const newTargetHand = targetHand.filter((c: string) => getRank(c) !== rank);
            updatePlayer(targetId, { cards: newTargetHand });

            const rawActorHand = [...actor.cards, ...cardsToTransfer];
            const { newHand, newSets, newBookRank } = processBooks(rawActorHand, actor.sets);
            updatePlayer(actorId, { cards: sortHand(newHand), sets: newSets });
            
            addLog({ type: 'CATCH', actorId: actor.id, actorName: actor.name, targetId: target.id, targetName: target.name, rank, count: cardsToTransfer.length });

            triggerAction({
                type: 'CATCH',
                actorName: actor.name,
                targetName: target.name,
                rank,
                count: cardsToTransfer.length,
                duration: TIMING.CATCH
            });

            await delay(TIMING.CATCH + 200); 

            if (newBookRank) {
                triggerAction({
                    type: 'BOOK',
                    actorName: actor.name,
                    rank: newBookRank,
                    duration: TIMING.BOOK
                });
                await delay(TIMING.BOOK + 500); 
            }

            if (newHand.length === 0) {
               console.log(`⏩ ${actor.name} emptied hand after Catch! Passing turn.`);
               passTurn();
            }

        } else {
            console.log(`🌊 GO FISH: ${actor.name} missed asking ${target.name} for ${rank}`);
            addLog({ type: 'FAIL', actorId: actor.id, actorName: actor.name, targetId: target.id, targetName: target.name, rank });
            
            triggerAction({
                type: 'FAIL',
                actorName: actor.name,
                targetName: target.name,
                rank,
                duration: TIMING.FAIL
            });
            
            await delay(TIMING.FAIL);
            
            await executeGoFish(actorId, rank, target.seat_index);
            return; 
        }
    } catch (error) {
        console.error("Move Error:", error);
    } 
    setProcessing(false);
  };

  const executeGoFish = async (actorId: string, rankAsked: string, nextTurnSeat: number) => {
      // ⚠️ Use REF for Ocean to ensure we don't draw from an empty stale ocean
      const currentOcean = [...(roomRef.current.ocean_cards || [])];

      if (currentOcean.length === 0) {
          console.log("Ocean Empty. Passing turn.");
          passTurn(nextTurnSeat);
          setProcessing(false);
          return;
      }

      const actor = playersRef.current.find(p => p.id === actorId); // ⚠️ Use REF
      const drawnCard = currentOcean.pop();
      const drawnRank = getRank(drawnCard as string);

      const rawActorHand = [...actor!.cards, drawnCard!];
      const { newHand, newSets, newBookRank } = processBooks(rawActorHand, actor!.sets);

      updateRoom({ ocean_cards: currentOcean });
      updatePlayer(actorId, { cards: sortHand(newHand), sets: newSets });

      if (drawnRank === rankAsked) {
          console.log(`🍀 LUCKY DRAW: ${actor!.name} got the ${rankAsked}!`);
          addLog({ type: 'LUCKY', actorId: actor!.id, actorName: actor!.name, rank: rankAsked });
          
          triggerAction({
              type: 'LUCKY',
              actorName: actor!.name,
              rank: rankAsked,
              duration: TIMING.LUCKY
          });
          
          await delay(TIMING.LUCKY + 200);

      } else {
          console.log(`🐟 FISH: ${actor!.name} drew a card. Turn Passes.`);
          addLog({ type: 'FISH', actorId: actor!.id, actorName: actor!.name });
          
          triggerAction({
            type: 'FISH',
            actorName: actor!.name,
            duration: TIMING.FISH
          });

          await delay(TIMING.FISH + 200);
      }

      if (newBookRank) {
           triggerAction({
               type: 'BOOK',
               actorName: actor!.name,
               rank: newBookRank,
               duration: TIMING.BOOK
           });
           await delay(TIMING.BOOK + 500);
     }

     if (newHand.length === 0) {
        console.log(`⏩ ${actor!.name} emptied hand after Fish! Passing turn.`);
        passTurn(nextTurnSeat);
     } else if (drawnRank !== rankAsked) {
        passTurn(nextTurnSeat);
     }

      setProcessing(false);
  };

  // 🔄 FIX: Use REFS to ensure passTurn always sees the *current* cards of players
  const passTurn = (forcedNextSeat: number | null = null) => {
    // 1. Use the REF for latest data
    const currentPlayers = [...playersRef.current].sort((a, b) => a.seat_index - b.seat_index);
    const currentRoom = roomRef.current;

    const currentIdx = currentPlayers.findIndex(p => p.seat_index === currentRoom.turn_index);
    
    let searchStartIndex = currentIdx + currentRoom.direction;
    if (forcedNextSeat !== null) {
        const forcedIdx = currentPlayers.findIndex(p => p.seat_index === forcedNextSeat);
        if (forcedIdx !== -1) searchStartIndex = forcedIdx;
    }

    // 2. Scan for a valid player
    for (let i = 0; i < currentPlayers.length; i++) {
        let idx = (searchStartIndex + i) % currentPlayers.length;
        if (idx < 0) idx += currentPlayers.length;
        const candidate = currentPlayers[idx];

        // 3. THIS CHECK IS NOW SAFE (Not Stale)
        if (candidate.cards && candidate.cards.length > 0) {
            
            const newAttentionCount = (!candidate.isBot) 
                ? 0 
                : (currentRoom.turns_since_human_played || 0) + 1;

            updateRoom({ 
                turn_index: candidate.seat_index,
                turns_since_human_played: newAttentionCount
            });
            return;
        }
    }

    console.log("⚠️ No active players found via passTurn. Triggering Round End.");
    startNewRound();
  };

  // 🔄 FIX: Handle Empty Hands Gracefully (With CLEANUP)
  useEffect(() => {
    if (skipTurnTimeoutRef.current) {
      clearTimeout(skipTurnTimeoutRef.current);
      skipTurnTimeoutRef.current = null;
    }

    if (room.status !== 'PLAYING' || isProcessing) return;
    
    const currentPlayer = players.find(p => p.seat_index === room.turn_index);
    
    if (currentPlayer && currentPlayer.cards.length === 0) {
        const activePlayers = players.filter(p => p.cards.length > 0);
        
        if (activePlayers.length > 1) {
            console.log(`⏩ FAILSAFE: ${currentPlayer.name} has no cards. Scheduling skip...`);
            setProcessing(true);
            
            skipTurnTimeoutRef.current = setTimeout(() => {
                console.log(`⏩ EXECUTING SKIP for ${currentPlayer.name}`);
                passTurn(); // <--- Now uses Ref, so it's safe
                setProcessing(false);
            }, 1000);
        } else {
             startNewRound();
        }
    }

    return () => {
      if (skipTurnTimeoutRef.current) clearTimeout(skipTurnTimeoutRef.current);
    };
  }, [room.turn_index, players, isProcessing]);

  // 🔄 FIX: Trigger Round Start if Ocean & Hands are Empty
  useEffect(() => {
      if (room.status !== 'PLAYING' || isProcessing) return;
      
      const activePlayers = players.filter(p => p.cards.length > 0);
      const isOceanEmpty = !room.ocean_cards || room.ocean_cards.length === 0;

      if (isOceanEmpty && activePlayers.length <= 1) {
          startNewRound();
      }
  }, [players, room.ocean_cards]);

  const startNewRound = async () => {
    if (isProcessing) return;
    setProcessing(true);

    if (skipTurnTimeoutRef.current) clearTimeout(skipTurnTimeoutRef.current);

    console.log("🎰 Starting New Round Sequence...");
    
    try {
        triggerAction({
            type: 'ROUND', 
            duration: TIMING.ROUND
        });
        
        await delay(TIMING.ROUND); 

        const deck = generateDeck();
        
        // ⚠️ Use REF for loop to be safe, though updatePlayer uses ID so it's fine
        playersRef.current.forEach(p => {
            const currentScore = p.score || 0;
            const setsWon = p.sets?.length || 0;
            
            updatePlayer(p.id, { 
                cards: sortHand(deck.splice(0, 7)), 
                sets: [], 
                score: currentScore + setsWon 
            });
        });

        updateRoom({ 
            ocean_cards: deck, 
            turn_index: 0,
            status: 'PLAYING',
            turns_since_human_played: 0 
        });
        
        addLog({ type: 'ROUND_START' });

    } catch (err) {
        console.error("Start Round Error:", err);
    } finally {
        setProcessing(false); 
    }
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