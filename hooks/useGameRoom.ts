// hooks/useGameRoom.ts
import { useState, useEffect, useRef } from 'react';
import { dbGet, dbGetList, dbSubscribe, dbUpdate, dbDelete } from '../utils/supabase';
import { usePlayerStore } from '../store/store';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

// ⏱️ TIMING CONSTANTS
const HEARTBEAT_INTERVAL = 5000; // Send pulse every 5s
const GHOST_THRESHOLD = 60000;   // Mark dead after 60s
const REAPER_INTERVAL = 10000;   // Check for dead bodies every 10s

export const useGameRoom = (roomCode: string) => {
  const router = useRouter();

  const [players, setPlayers] = useState<any[]>([]);
  const [room, setRoom] = useState<any>(null); // <--- Stores Game State (Status, Deck, Turn)
  
  const { playerId } = usePlayerStore();
  
  // Ref to access latest state inside intervals without causing re-renders
  const playersRef = useRef<any[]>([]); 

  // Keep ref synced with state
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // ============================================================
  // 💓 THE HEARTBEAT (I am alive!)
  // ============================================================
  useEffect(() => {
    if (!playerId || !roomCode) return;

    const sendHeartbeat = async () => {
      // Update my own last_seen timestamp
      await dbUpdate('players', { last_seen: new Date().toISOString() }, 'id', playerId);
    };

    // 1. Send immediately on mount
    sendHeartbeat();

    // 2. Send periodically
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [playerId, roomCode]);

  // ============================================================
  // 💀 THE REAPER (Clean up the dead)
  // ============================================================
  useEffect(() => {
    if (!roomCode) return;

    const runReaper = async () => {
      const now = new Date().getTime();
      const currentPlayers = playersRef.current;

      // 1. Identify Ghosts
      const ghosts = currentPlayers.filter(p => {
        const lastSeen = new Date(p.last_seen).getTime();
        return (now - lastSeen) > GHOST_THRESHOLD;
      });

      if (ghosts.length === 0) return;

      // 2. ELECT A REAPER (Prevent race conditions)
      // We sort players by seat_index. The first *ALIVE* player is responsible for cleanup.
      // This handles "Host Migration" automatically—if the Host dies, Seat 1 becomes the Reaper.
      const alivePlayers = currentPlayers.filter(p => {
        const lastSeen = new Date(p.last_seen).getTime();
        return (now - lastSeen) <= GHOST_THRESHOLD;
      });

      if (alivePlayers.length > 0) {
        const reaper = alivePlayers.sort((a, b) => a.seat_index - b.seat_index)[0];
        
        // "If I am the Reaper, I will clean up."
        if (reaper.id === playerId) {
          console.log(`💀 I am the Reaper. Removing ${ghosts.length} ghosts.`);
          for (const ghost of ghosts) {
            await dbDelete('players', 'id', ghost.id);
          }
        }
      }
    };

    const interval = setInterval(runReaper, REAPER_INTERVAL);
    return () => clearInterval(interval);
  }, [playerId, roomCode]);

  // ============================================================
  // 📡 FETCH & SUBSCRIBE TO DATA
  // ============================================================
  useEffect(() => {
    if (!roomCode) return;

    // --- 1. INITIAL FETCH ---
    const initData = async () => {
      // A. Fetch Players
      const pRes = await dbGetList('players', 'room_code', roomCode);
      if (pRes.success && pRes.data) {
        setPlayers(pRes.data.sort((a: any, b: any) => a.seat_index - b.seat_index));
      }

      // B. Fetch Room Data
      const rRes = await dbGet('rooms', 'code', roomCode);
      if (rRes.success && rRes.data) {
        setRoom(rRes.data);
      }
    };

    initData();

    // --- 2. SUBSCRIBE TO PLAYERS ---
    // Note: We subscribe to ALL players (null filter) to catch DELETE events
    // because Supabase DELETE payloads don't include custom columns like room_code.
    const playerSub = dbSubscribe(
      `room_players_${roomCode}`,
      'players',
      null, 
      (payload) => {
        // A. FILTERING: Ignore events from other rooms
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
           if (payload.new.room_code !== roomCode) return;
        }

        // B. STATE UPDATES
        if (payload.eventType === 'INSERT') {
          setPlayers((prev) => {
             // Prevent duplicates
             if (prev.find(p => p.id === payload.new.id)) return prev;
             return [...prev, payload.new].sort((a, b) => a.seat_index - b.seat_index);
          });
        }

        if (payload.eventType === 'DELETE') {
          // We can only filter by ID here, so we remove if it exists in our list
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

    // --- 3. SUBSCRIBE TO ROOM STATUS (UPDATED) ---
    const roomSub = dbSubscribe(
      `room_status_${roomCode}`,
      'rooms',
      `code=eq.${roomCode}`, 
      (payload) => {
        // A. UPDATE EVENT (Status change, etc.)
        if (payload.eventType === 'UPDATE') {
          setRoom(payload.new);
        }
        
        // B. DELETE EVENT (Host Killed the Room)
        if (payload.eventType === 'DELETE') {
           console.log("💀 Room deleted by Host. Kicking player...");
           
           // Show Toast / Alert
           Alert.alert("Game Ended", "The Host has ended the game.");
           
           // Navigate Home
           // We use replace to prevent going 'back' to the dead room
           router.replace('/screens/Home');
        }
      }
    );

    // Cleanup subscriptions on unmount
    return () => {
      playerSub.unsubscribe();
      roomSub.unsubscribe();
    };
  }, [roomCode]);

  return { players, room };
};