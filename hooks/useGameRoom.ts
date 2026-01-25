// hooks/useGameRoom.ts
import { useState, useEffect } from 'react';
import { dbGetList, dbSubscribe } from '../utils/supabase';

export const useGameRoom = (roomCode: string) => {
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    if (!roomCode) return;

    const fetchPlayers = async () => {
      const { data, success } = await dbGetList('players', 'room_code', roomCode);
      if (success && data) {
        setPlayers(data.sort((a: any, b: any) => a.seat_index - b.seat_index));
      }
    };

    fetchPlayers();

    // SUBSCRIBE TO ALL PLAYERS (Filter = null)
    const subscription = dbSubscribe(
      `room_global_watcher`, // Use a unique name
      'players',
      null, // <--- NO FILTER (Get all events)
      (payload) => {
        
        // --- 1. HANDLE INSERTS & UPDATES ---
        // We MUST check the room_code, or we'll see players from other rooms!
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
           if (payload.new.room_code !== roomCode) return; // Ignore strangers
        }

        // --- 2. HANDLE STATE UPDATES ---
        
        if (payload.eventType === 'INSERT') {
          setPlayers((prev) => {
             // Prevent duplicates
             if (prev.find(p => p.id === payload.new.id)) return prev;
             return [...prev, payload.new].sort((a, b) => a.seat_index - b.seat_index);
          });
        }

        if (payload.eventType === 'DELETE') {
          // For Delete, we ONLY get the ID. We can't check room_code.
          // But it's safe to just try removing this ID from our local list.
          // If the player wasn't in our room, this does nothing.
          setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
        }

        if (payload.eventType === 'UPDATE') {
           setPlayers((prev) => 
             prev.map(p => (p.id === payload.new.id ? payload.new : p))
                 .sort((a, b) => a.seat_index - b.seat_index)
           );
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [roomCode]);

  return { players };
};