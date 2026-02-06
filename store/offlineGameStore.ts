import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// 🃏 CARD UTILITIES (Self-contained for Offline Mode)
// ============================================================
export const SUITS = ['H', 'D', 'C', 'S'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const getRank = (card: string) => card.slice(0, -1);

export const sortHand = (hand: string[]) => {
  return [...hand].sort((a, b) => {
    const rankA = getRank(a);
    const rankB = getRank(b);
    return RANKS.indexOf(rankA) - RANKS.indexOf(rankB);
  });
};

export const generateDeck = () => {
  const deck: string[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`); 
    }
  }
  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// ============================================================
// 🏪 OFFLINE STORE
// ============================================================
const BOT_NAMES = ['Bot Alice', 'Bot Bob', 'Bot Charlie'];

interface Player {
  id: string;
  name: string;
  cards: string[];
  sets: { rank: string; timestamp: number }[];
  seat_index: number;
  isBot: boolean;
  avatar?: string;
}

interface RoomState {
  code: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  ocean_cards: string[];
  turn_index: number;
  direction: number;
}

interface OfflineGameState {
  room: RoomState;
  players: Player[];
  logs: any[];
  
  // Actions
  initGame: (humanName: string, humanId: string) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  updateRoom: (updates: Partial<RoomState>) => void;
  addLog: (entry: any) => void;
  resetGame: () => void;
}

export const useOfflineGameStore = create<OfflineGameState>()(
  persist(
    (set, get) => ({
      // INITIAL STATE
      room: {
        code: 'OFFLINE',
        status: 'WAITING',
        ocean_cards: [],
        turn_index: 0,
        direction: 1,
      },
      players: [],
      logs: [],

      // ACTIONS
      initGame: (humanName, humanId) => {
        console.log("🎮 Initializing Offline Game...");
        const deck = generateDeck();
        
        // 1. Create Players
        const human: Player = { 
            id: humanId || 'human-1', 
            name: humanName || 'Player', 
            cards: [], 
            sets: [], 
            seat_index: 0, 
            isBot: false,
            avatar: '👤'
        };

        const bots: Player[] = BOT_NAMES.map((name, i) => ({
            id: `bot-${i}`, 
            name, 
            cards: [], 
            sets: [], 
            seat_index: i + 1, 
            isBot: true,
            avatar: '🤖'
        }));

        const newPlayers = [human, ...bots];
        
        // 2. Deal 7 Cards to everyone
        newPlayers.forEach(p => {
            p.cards = sortHand(deck.splice(0, 7));
        });

        // 3. Set State
        set({
            room: {
                code: 'OFFLINE',
                status: 'PLAYING',
                ocean_cards: deck,
                turn_index: 0, // Human starts
                direction: 1
            },
            players: newPlayers,
            logs: []
        });
      },

      updatePlayer: (id, updates) => set(state => ({
          players: state.players.map(p => p.id === id ? { ...p, ...updates } : p)
      })),

      updateRoom: (updates) => set(state => ({
          room: { ...state.room, ...updates }
      })),
      
      addLog: (entry) => set(state => ({ logs: [...state.logs, entry] })),

      resetGame: () => set({
        room: {
            code: 'OFFLINE',
            status: 'WAITING',
            ocean_cards: [],
            turn_index: 0,
            direction: 1,
        },
        players: [],
        logs: []
      })
    }),
    {
      name: 'offline-game-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);