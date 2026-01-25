import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Define the Shape of your Store (Best practice for TypeScript)
interface PlayerState {
  playerName: string | null;
  playerId: string | null; // <--- ADDED: Stores your DB UUID
  setPlayerName: (name: string) => void;
  setPlayerId: (id: string) => void; // <--- ADDED: Action to save it
  logout: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      playerName: null,
      playerId: null, // <--- Starts empty

      setPlayerName: (name) => set({ playerName: name }),
      
      // 2. New Action: Call this after creating/joining a room
      setPlayerId: (id) => set({ playerId: id }),

      // 3. Logout: Clear both name AND ID
      logout: () => set({ playerName: null, playerId: null }),
    }),
    {
      name: 'player-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);