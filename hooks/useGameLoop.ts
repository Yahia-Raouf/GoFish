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

// Simple delay helper for async operations
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    if (currentPlayer.cards && currentPlayer.cards.length === 0) {
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
      // 1. Trigger Animation for everyone
      await dbInsert('game_moves', {
          room_code: room.code,
          actor_id: playerId,
          action_type: 'ROUND', 
      });

      // 2. Wait for animation to play (3s)
      await delay(3000);

      const deck = generateDeck();
      const updates = [];
      const CARDS_PER_PLAYER = 7;

      for (const player of players) {
        const hand = deck.splice(0, CARDS_PER_PLAYER);
        
        // 🛑 CRITICAL FIX: Add current sets to total score before resetting sets
        const currentScore = player.score || 0;
        const setsWon = player.sets?.length || 0;

        updates.push(
          dbUpdate('players', { 
              cards: sortHand(hand), 
              sets: [], 
              score: currentScore + setsWon // <--- SAVE SCORE HERE
          }, 'id', player.id)
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
      console.log('✅ Round Started! Scores updated.');

    } catch (error) {
      console.error('Deal Error:', error);
    } finally {
      setProcessing(false);
    }
  };

  // ============================================================
  // 🏁 ROUND END LOGIC
  // ============================================================
  const isRoundOver = (currentPlayers: any[], ocean: any[]) => {
      if (!ocean || !currentPlayers || currentPlayers.length < 2) return false;

      const initialOceanCount = 52 - (currentPlayers.length * 7);
      if (ocean.length >= initialOceanCount - 1) {
          return false; 
      }

      const activePlayers = currentPlayers.filter(p => p.cards && p.cards.length > 0);
      return activePlayers.length <= 1;
  };

  useEffect(() => {
      if (!isHost || !room || room.status !== 'PLAYING' || processing) return;

      if (isRoundOver(players, room.ocean_cards)) {
          console.log("🏁 Round End Detected (<= 1 active player). Resetting...");
          handleRoundEnd();
      }
  }, [players, room, isHost]);

  const handleRoundEnd = async () => {
      if (processing) return; 
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
      let bookRank = null; 

      for (const rank in rankCounts) {
          if (rankCounts[rank] === 4) {
              bookFound = true;
              bookRank = rank;
              newHand = newHand.filter(c => getRank(c) !== rank);
              newSets.push({ rank, timestamp: Date.now() });
          }
      }
      return { newHand, newSets, bookFound, bookRank };
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
            
            const { newHand, newSets, bookFound, bookRank } = processBooks(rawMyHand, myPlayer.sets);

            // 1. Insert CATCH Move first (so animation triggers)
            await dbInsert('game_moves', {
                room_code: room.code,
                actor_id: playerId,
                target_id: targetId,
                action_type: 'CATCH',
                rank_asked: rank,
                cards_transferred: cardsToTransfer.length
            });

            // 2. Perform DB Updates
            await Promise.all([
                dbUpdate('players', { cards: newTargetHand }, 'id', targetId),
                dbUpdate('players', { cards: sortHand(newHand), sets: newSets }, 'id', playerId)
            ]);
            
            // 3. If Book Found, Wait then Trigger BOOK Move
            if (bookFound && bookRank) {
                await delay(2500);

                await dbInsert('game_moves', {
                    room_code: room.code,
                    actor_id: playerId,
                    action_type: 'BOOK',
                    rank_asked: bookRank 
                });
            }

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
          await passTurn(nextTurnSeat);
          return;
      }

      const currentOcean = [...room.ocean_cards];
      const drawnCard = currentOcean.pop(); 
      const drawnRank = getRank(drawnCard);

      const rawMyHand = [...myPlayer.cards, drawnCard];
      const { newHand, newSets, bookFound, bookRank } = processBooks(rawMyHand, myPlayer.sets);

      // Perform updates immediately 
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
          
      } else {
          console.log("Standard Draw. Turn Passes.");
          await dbInsert('game_moves', {
              room_code: room.code,
              actor_id: playerId,
              action_type: 'FISH', 
          });
          await passTurn(nextTurnSeat);
      }

      // 3. If Book Found from Fishing, trigger BOOK animation
      if (bookFound && bookRank) {
          await delay(2500);

          await dbInsert('game_moves', {
              room_code: room.code,
              actor_id: playerId,
              action_type: 'BOOK',
              rank_asked: bookRank
          });
      }
  };

  // ============================================================
  // ⏭️ SMART PASS TURN
  // ============================================================
  const passTurn = async (forcedNextSeat: number | null = null) => {
    if (!sortedPlayers.length) return;

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
            console.log(`Passing turn to ${candidate.name} (Seat ${candidate.seat_index})`);
            await dbUpdate('rooms', { turn_index: candidate.seat_index }, 'code', room.code);
            return;
        }
    }

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