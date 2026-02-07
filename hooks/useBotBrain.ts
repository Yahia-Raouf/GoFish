import { useEffect, useRef } from 'react';
import { useOfflineGameStore, getRank } from '../store/offlineGameStore';

// ============================================================
// 🤖 BOT DIFFICULTY CONFIGURATION
// ============================================================
export const BOT_CONFIG = {
  MEMORY_SPAN: 8,              // Remember last N moves
  SMART_PLAY_PROBABILITY: 0.9, // 90% chance to use memory/logic
  TARGET_LEADER_BIAS: 0.5,     // 50% extra weight to target the winning player
  
  // NEW: Attention Mechanics
  HUMAN_ATTENTION_THRESHOLD: 8, // After 8 bot moves, start caring about human
  HUMAN_ATTENTION_BIAS: 15,     // Massive score boost to target human
  
  THINKING_TIME: 500,         
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
    if (!bot.cards || bot.cards.length === 0) return;

    const isSmart = Math.random() < BOT_CONFIG.SMART_PLAY_PROBABILITY;
    
    let targetId: string | null = null;
    let rankToAsk: string | null = null;

    if (isSmart) {
        // console.log(`🤖 ${bot.name}: Using Smart Logic 🧠`);
        const decision = calculateSmartMove(bot);
        if (decision) {
            targetId = decision.targetId;
            rankToAsk = decision.rank;
        }
    } 

    // Fallback: Random Move
    if (!targetId || !rankToAsk) {
        const randomMove = getRandomMove(bot);
        if (!randomMove) return; 
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
      const recentLogs = logs.slice(-BOT_CONFIG.MEMORY_SPAN);
      const knownHands: Record<string, Set<string>> = {}; 

      players.forEach(p => { 
          if(p.id !== bot.id) knownHands[p.id] = new Set(); 
      });

      recentLogs.forEach(log => {
          if (log.type === 'CATCH' || log.type === 'FAIL') {
             knownHands[log.actorId]?.add(log.rank);
          }
          if (log.type === 'CATCH') {
             knownHands[log.actorId]?.add(log.rank);
             knownHands[log.targetId]?.delete(log.rank);
          }
          if (log.type === 'LUCKY') {
             knownHands[log.actorId]?.add(log.rank);
          }
      });

      const deadRanks = new Set();
      players.forEach(p => {
          p.sets.forEach((s: any) => deadRanks.add(s.rank));
      });

      const myRanks = new Set(bot.cards.map((c: string) => getRank(c)));
      const potentialMoves: { targetId: string, rank: string, score: number }[] = [];

      for (const opponentId in knownHands) {
          const opponent = players.find(p => p.id === opponentId);
          if (!opponent || opponent.cards.length === 0) continue; 

          knownHands[opponentId].forEach(rank => {
              if (myRanks.has(rank) && !deadRanks.has(rank)) {
                  
                  // BASE SCORE: 10 (Guaranteed Hit)
                  let score = 10; 
                  
                  // 1. LEADER BIAS (Attack the winner)
                  const maxSets = Math.max(...players.map(p => p.sets.length));
                  if (opponent.sets.length === maxSets && maxSets > 0) {
                      score += (BOT_CONFIG.TARGET_LEADER_BIAS * 5); 
                  }

                  // 2. ATTENTION BIAS (Include Human if ignored for too long)
                  // If Opponent is HUMAN and we haven't played with them in a while...
                  if (!opponent.isBot && room.turns_since_human_played > BOT_CONFIG.HUMAN_ATTENTION_THRESHOLD) {
                      score += (room.turns_since_human_played * BOT_CONFIG.HUMAN_ATTENTION_BIAS);
                      // console.log(`🎯 Targeting Human! Attention Score Boost: ${score}`);
                  }

                  potentialMoves.push({ targetId: opponentId, rank, score });
              }
          });
      }

      if (potentialMoves.length > 0) {
          potentialMoves.sort((a, b) => b.score - a.score);
          return potentialMoves[0];
      }

      return null; 
  };

  // ============================================================
  // 🎲 HELPER: RANDOM MOVE
  // ============================================================
  const getRandomMove = (bot: any): { targetId: string; rank: string } | null => {
      const myRanks = Array.from(new Set(bot.cards.map((c: string) => getRank(c))));
      if (myRanks.length === 0) return null;

      let validTargets = players.filter(p => p.id !== bot.id && p.cards.length > 0);
      if (validTargets.length === 0) return null;

      // 🧠 FORCED RANDOM BIAS
      // If we are desperate to include the human, filter the list to ONLY the human (if they have cards)
      if (room.turns_since_human_played > (BOT_CONFIG.HUMAN_ATTENTION_THRESHOLD + 2)) {
          const humanTarget = validTargets.find(p => !p.isBot);
          if (humanTarget) {
              validTargets = [humanTarget]; // FORCE TARGET
          }
      }

      const randomRank = myRanks[Math.floor(Math.random() * myRanks.length)];
      const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];

      return { targetId: randomTarget.id as string, rank: randomRank as string };
  };
};