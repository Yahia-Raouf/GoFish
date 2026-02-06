import { useEffect, useRef } from 'react';
import { useOfflineGameStore, getRank } from '../store/offlineGameStore';

// ============================================================
// 🤖 BOT DIFFICULTY CONFIGURATION
// ============================================================
export const BOT_CONFIG = {
  MEMORY_SPAN: 8,              // Remember last N moves
  SMART_PLAY_PROBABILITY: 0.9, // 90% chance to use memory/logic
  TARGET_LEADER_BIAS: 0.5,     // 50% extra weight to target the winning player
  THINKING_TIME: 1500,         // Milliseconds
};

export const useBotBrain = (
  performMove: (actorId: string, targetId: string, rank: string) => Promise<void>,
  isProcessing: boolean
) => {
  const { room, players, logs } = useOfflineGameStore();
  const timeoutRef = useRef<NodeJS.Timeout | number | null>(null);

  useEffect(() => {
    const currentPlayer = players.find((p) => p.seat_index === room.turn_index);

    if (
      room.status !== 'PLAYING' ||
      !currentPlayer?.isBot ||
      isProcessing
    ) {
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      await executeBotTurn(currentPlayer);
    }, BOT_CONFIG.THINKING_TIME);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [room.turn_index, room.status, isProcessing, players, logs]);

  // ============================================================
  // 🧠 THE STRATEGY ENGINE
  // ============================================================
  const executeBotTurn = async (bot: any) => {
    // 1. Safety Check
    if (!bot.cards || bot.cards.length === 0) return;

    // 2. Bot Decision: Smart or Random?
    const isSmart = Math.random() < BOT_CONFIG.SMART_PLAY_PROBABILITY;
    
    let targetId: string | null = null;
    let rankToAsk: string | null = null;

    if (isSmart) {
        console.log(`🤖 ${bot.name}: Using Smart Logic 🧠`);
        const decision = calculateSmartMove(bot);
        if (decision) {
            targetId = decision.targetId;
            rankToAsk = decision.rank;
        } else {
            console.log(`🤖 ${bot.name}: No logical moves found. Fallback to random.`);
        }
    } else {
        console.log(`🤖 ${bot.name}: playing randomly 🎲`);
    }

    // 3. Fallback: Random Move
    if (!targetId || !rankToAsk) {
        const randomMove = getRandomMove(bot);
        if (!randomMove) return; // Should not happen
        targetId = randomMove.targetId;
        rankToAsk = randomMove.rank;
    }

    console.log(`🤖 ${bot.name} ACTS: Asking ${players.find(p=>p.id===targetId)?.name} for ${rankToAsk}`);
    await performMove(bot.id, targetId!, rankToAsk!);
  };

  // ============================================================
  // 🔍 HELPER: CALCULATE SMART MOVE
  // ============================================================
  const calculateSmartMove = (bot: any): { targetId: string; rank: string; score: number } | null => {
      // A. Build Knowledge Base from Logs
      // We look at the last MEMORY_SPAN logs
      const recentLogs = logs.slice(-BOT_CONFIG.MEMORY_SPAN);
      
      const knownHands: Record<string, Set<string>> = {}; 
      // Structure: { 'player-id': Set('4', 'K') }

      // Initialize knownHands for opponents
      players.forEach(p => { 
          if(p.id !== bot.id) knownHands[p.id] = new Set(); 
      });

      // Scan Logs to fill knowledge
      recentLogs.forEach(log => {
          // Rule 1: If someone ASKS for a rank, they MUST have it.
          // (Note: Our logs don't explicitly store "ASK" separate from result, 
          // but CATCH and FAIL both imply the Actor asked for it).
          if (log.type === 'CATCH' || log.type === 'FAIL') {
             if (knownHands[log.actorId]) {
                 knownHands[log.actorId].add(log.rank);
             }
          }

          // Rule 2: If someone CATCHES a rank, they definitely have it now.
          if (log.type === 'CATCH') {
             if (knownHands[log.actorId]) {
                 knownHands[log.actorId].add(log.rank);
             }
             // Negative Info: The target gave it away, so they don't have it anymore.
             if (knownHands[log.targetId]) {
                 knownHands[log.targetId].delete(log.rank);
             }
          }

          // Rule 3: Lucky Draw (Public knowledge if revealed?)
          // Usually Lucky Draw is revealed.
          if (log.type === 'LUCKY') {
             if (knownHands[log.actorId]) {
                 knownHands[log.actorId].add(log.rank);
             }
          }
      });

      // B. Filter Out Dead Ranks (Books on the table)
      // If a set is completed, nobody has that rank anymore.
      const deadRanks = new Set();
      players.forEach(p => {
          p.sets.forEach((s: any) => deadRanks.add(s.rank));
      });

      // C. Find Intersection: My Hand vs. Known Opponent Hands
      const myRanks = new Set(bot.cards.map((c: string) => getRank(c)));
      
      const potentialMoves: { targetId: string, rank: string, score: number }[] = [];

      for (const opponentId in knownHands) {
          const opponent = players.find(p => p.id === opponentId);
          if (!opponent || opponent.cards.length === 0) continue; // Skip empty opponents

          // Check known ranks
          knownHands[opponentId].forEach(rank => {
              if (myRanks.has(rank) && !deadRanks.has(rank)) {
                  // MATCH FOUND! I have 'rank', and I know 'opponent' has 'rank'.
                  
                  // Scoring Logic
                  let score = 10; // Base score for a guaranteed hit
                  
                  // Difficulty Factor: Target the Leader
                  // If this opponent has the most sets, prioritize them.
                  const maxSets = Math.max(...players.map(p => p.sets.length));
                  if (opponent.sets.length === maxSets && maxSets > 0) {
                      score += (BOT_CONFIG.TARGET_LEADER_BIAS * 5); 
                  }

                  potentialMoves.push({ targetId: opponentId, rank, score });
              }
          });
      }

      // Return the best move
      if (potentialMoves.length > 0) {
          // Sort by score descending
          potentialMoves.sort((a, b) => b.score - a.score);
          return potentialMoves[0];
      }

      return null; // No smart move found
  };

  // ============================================================
  // 🎲 HELPER: RANDOM MOVE
  // ============================================================
  const getRandomMove = (bot: any): { targetId: string; rank: string } | null => {
      // 1. My Ranks
      const myRanks = Array.from(new Set(bot.cards.map((c: string) => getRank(c))));
      if (myRanks.length === 0) return null;

      // 2. Valid Targets
      const validTargets = players.filter(p => p.id !== bot.id && p.cards.length > 0);
      if (validTargets.length === 0) return null;

      // 3. Pick
      const randomRank = myRanks[Math.floor(Math.random() * myRanks.length)];
      const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];

      return { targetId: randomTarget.id as string, rank: randomRank as string };
  };
};