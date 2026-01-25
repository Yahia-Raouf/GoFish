import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { dbUpdate, dbInsert } from '../utils/supabase';
import { usePlayerStore } from '../store/store';

// ============================================================
// 🃏 CARD UTILITIES
// ============================================================
const SUITS = ['H', 'D', 'C', 'S'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const getRank = (card: string) => card.slice(0, -1);

const sortHand = (hand: string[]) => {
  return [...hand].sort((a, b) => {
    const rankA = getRank(a);
    const rankB = getRank(b);
    return RANKS.indexOf(rankA) - RANKS.indexOf(rankB);
  });
};

const generateDeck = () => {
  const deck: string[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`); 
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const useGameLoop = (room: any, players: any[]) => {
  const { playerId } = usePlayerStore();
  const [processing, setProcessing] = useState(false);

  // Sorting players ensures consistent turn logic
  const sortedPlayers = [...players].sort((a, b) => a.seat_index - b.seat_index);
  const effectiveHost = sortedPlayers[0];
  
  const myPlayer = players.find((p) => p.id === playerId);
  const isHost = myPlayer?.id === effectiveHost?.id;
  const isMyTurn = myPlayer?.seat_index === room?.turn_index;

  // ============================================================
  // 🛠️ TURN FIXER (Auto-Pass if Current Player is Empty/Gone)
  // ============================================================
  useEffect(() => {
    if (!isHost || !room || room.status !== 'PLAYING' || processing) return;

    const currentPlayer = players.find(p => p.seat_index === room.turn_index);
    
    // Case 1: Player Left
    if (!currentPlayer) {
        console.log("⚠️ Turn Player Missing! Auto-passing...");
        passTurn();
        return;
    }

    // Case 2: Player has 0 Cards (Empty Hand Rule)
    // If it's their turn but they have no cards, they can't ask. Skip them.
    if (currentPlayer.cards && currentPlayer.cards.length === 0) {
        // ONLY pass if the round isn't over (otherwise we loop forever)
        if (!isRoundOver(players, room.ocean_cards)) {
            console.log("⚠️ Player has 0 cards. Skipping turn...");
            passTurn();
        } else {
            console.log("🛑 Round Over detected. Waiting for restart...");
            handleRoundEnd();
        }
    }
  }, [room, players, isHost]); 

  // ============================================================
  // 🎰 HOST: INITIALIZE / NEW ROUND
  // ============================================================
  useEffect(() => {
    if (!isHost || !room || !players.length) return;

    // Trigger if Ocean is empty AND everyone's hand is empty (Fresh Game or Round End)
    // OR if status is PLAYING but no cards exist yet.
    const isFreshGame =
      room.status === 'PLAYING' &&
      (!room.ocean_cards || room.ocean_cards.length === 0) &&
      players.every((p) => !p.cards || p.cards.length === 0);

    if (isFreshGame && !processing) {
      startNewRound();
    }
  }, [isHost, room, players]);

  // ============================================================
  // 🎰 HOST: START NEW ROUND
  // ============================================================
  const startNewRound = async () => {
    setProcessing(true);
    console.log('🎰 HOST: Starting New Round...');

    try {
      const deck = generateDeck();
      const updates = [];
      const CARDS_PER_PLAYER = 7;

      for (const player of players) {
        const hand = deck.splice(0, CARDS_PER_PLAYER);
        updates.push(
          // 🛠️ FIX: Explicitly set 'sets' to empty array []
          dbUpdate('players', { cards: sortHand(hand), sets: [] }, 'id', player.id)
        );
      }

      const startSeat = players[Math.floor(Math.random() * players.length)].seat_index;
      
      updates.push(
        dbUpdate('rooms', {
            ocean_cards: deck,       
            turn_index: startSeat,   
            direction: 1,            
          }, 'code', room.code)
      );

      await Promise.all(updates);
      console.log('✅ Round Started! Sets cleared.');

    } catch (error) {
      console.error('Deal Error:', error);
    } finally {
      setProcessing(false);
    }
  };

  // ============================================================
  // 🏁 ROUND END LOGIC (Fixed)
  // ============================================================
  const isRoundOver = (currentPlayers: any[], ocean: any[]) => {
      // 1. Safety Check: Is the game loading?
      if (!ocean || !currentPlayers || currentPlayers.length < 2) return false;

      // 2. THE FIX: Fresh Deck Guard
      // If the Ocean is "Full" (calculated based on player count), 
      // it means we just dealt. DO NOT end the round.
      // We allow a small buffer (-1) just in case.
      const initialOceanCount = 52 - (currentPlayers.length * 7);
      if (ocean.length >= initialOceanCount - 1) {
          return false; 
      }

      // 3. Standard Rule: Round ends if 1 or 0 players have cards left
      const activePlayers = currentPlayers.filter(p => p.cards && p.cards.length > 0);
      return activePlayers.length <= 1;
  };

  // 🛠️ HOST MONITOR: Check for Round End constantly
  useEffect(() => {
      if (!isHost || !room || room.status !== 'PLAYING' || processing) return;

      if (isRoundOver(players, room.ocean_cards)) {
          console.log("🏁 Round End Detected (<= 1 active player). Resetting...");
          handleRoundEnd();
      }
  }, [players, room, isHost]); // Runs whenever hand sizes change

  const handleRoundEnd = async () => {
      if (processing) return; // Prevent double-trigger
      
      // Reset Ocean to empty to signal "Limbo" state if needed, 
      // but startNewRound() handles the re-deal anyway.
      
      // We wait a brief moment so players see the final state, then re-deal.
      // (For now, instant reset)
      await startNewRound(); 
  };

  // ============================================================
  // 📘 HELPER: BOOK CHECK & EMPTY HAND CHECK
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
  // 🗣️ ACTION: ASK FOR CARD
  // ============================================================
  const askForCard = async (targetId: string, rank: string) => {
    if (!isMyTurn || processing) return;

    // Anti-Cheat
    const hasRank = myPlayer.cards.some((c: string) => getRank(c) === rank);
    if (!hasRank) { Alert.alert('Rule Violation', `You need a ${rank}!`); return; }

    setProcessing(true);
    try {
        const targetPlayer = players.find(p => p.id === targetId);
        const targetHand = targetPlayer.cards || [];
        const cardsToTransfer = targetHand.filter((c: string) => getRank(c) === rank);

        if (cardsToTransfer.length > 0) {
            // --- CATCH ---
            console.log(`🎣 CATCH! Getting ${cardsToTransfer.join(', ')}`);
            
            const newTargetHand = targetHand.filter((c: string) => getRank(c) !== rank);
            const rawMyHand = [...myPlayer.cards, ...cardsToTransfer];
            const { newHand, newSets } = processBooks(rawMyHand, myPlayer.sets);

            await Promise.all([
                dbUpdate('players', { cards: newTargetHand }, 'id', targetId),
                dbUpdate('players', { cards: sortHand(newHand), sets: newSets }, 'id', playerId),
                dbInsert('game_moves', {
                    room_code: room.code,
                    actor_id: playerId,
                    target_id: targetId,
                    action_type: 'CATCH',
                    rank_asked: rank,
                    cards_transferred: cardsToTransfer.length
                })
            ]);
            
            // LOGIC FIX: If I catch the cards, make a book, and reach 0 cards...
            // I technically get another turn, but I have no cards to ask with.
            // The useEffect "TURN FIXER" will catch this and auto-pass.

        } else {
            // --- FAIL ---
            console.log("🌊 GO FISH!");
            await dbInsert('game_moves', {
                room_code: room.code,
                actor_id: playerId,
                target_id: targetId,
                action_type: 'FAIL',
                rank_asked: rank
            });
            await executeGoFish(rank, targetPlayer.seat_index); 
        }

    } catch (error) {
        console.error("Ask Error:", error);
    } finally {
        setProcessing(false);
    }
  };

  // ============================================================
  // 🎣 HELPER: GO FISH
  // ============================================================
  const executeGoFish = async (rankAsked: string, nextTurnSeat: number) => {
      // 1. Ocean Empty?
      if (!room.ocean_cards || room.ocean_cards.length === 0) {
          console.log("Ocean Empty. Passing turn.");
          // If ocean is empty, we must pass turn (or end round).
          await passTurn(nextTurnSeat);
          return;
      }

      const currentOcean = [...room.ocean_cards];
      const drawnCard = currentOcean.pop(); 
      const drawnRank = getRank(drawnCard);

      const rawMyHand = [...myPlayer.cards, drawnCard];
      const { newHand, newSets } = processBooks(rawMyHand, myPlayer.sets);

      await Promise.all([
          dbUpdate('rooms', { ocean_cards: currentOcean }, 'code', room.code),
          dbUpdate('players', { cards: sortHand(newHand), sets: newSets }, 'id', playerId)
      ]);

      if (drawnRank === rankAsked) {
          console.log("🍀 LUCKY DRAW!");
          await dbInsert('game_moves', {
              room_code: room.code,
              actor_id: playerId,
              action_type: 'LUCKY',
              rank_asked: rankAsked 
          });
          // Same Logic: If lucky draw makes a book and leaves me with 0 cards,
          // the useEffect "Turn Fixer" will see 0 cards and pass for me.
      } else {
          console.log("Standard Draw. Turn Passes.");
          await dbInsert('game_moves', {
              room_code: room.code,
              actor_id: playerId,
              action_type: 'FISH', 
          });
          await passTurn(nextTurnSeat);
      }
  };

  // ============================================================
  // ⏭️ SMART PASS TURN (The Skipper)
  // ============================================================
  const passTurn = async (forcedNextSeat: number | null = null) => {
    if (!sortedPlayers.length) return;

    let candidates = [...sortedPlayers];
    
    // Start searching from the player AFTER the current turn
    const currentIdx = candidates.findIndex(p => p.seat_index === room.turn_index);
    
    // If we have a forced target (from Go Fish), start searching from THERE.
    let searchStartIndex = currentIdx + room.direction;
    if (forcedNextSeat !== null) {
        const forcedIdx = candidates.findIndex(p => p.seat_index === forcedNextSeat);
        if (forcedIdx !== -1) searchStartIndex = forcedIdx;
    }

    // Loop through all players to find one with cards > 0
    // We loop max `players.length` times to prevent infinite loops
    for (let i = 0; i < candidates.length; i++) {
        // Calculate wrapped index
        let idx = (searchStartIndex + i) % candidates.length;
        if (idx < 0) idx += candidates.length;

        const candidate = candidates[idx];

        // CHECK: Does this player have cards?
        if (candidate.cards && candidate.cards.length > 0) {
            console.log(`Passing turn to ${candidate.name} (Seat ${candidate.seat_index})`);
            await dbUpdate('rooms', { turn_index: candidate.seat_index }, 'code', room.code);
            return;
        }
    }

    // If we get here, NO ONE has cards (Round Over)
    console.log("⚠️ No active players found. Triggering Round End.");
    handleRoundEnd();
  };

  return {
    isMyTurn,
    askForCard,
    isProcessing: processing,
    effectiveHost 
  };
};