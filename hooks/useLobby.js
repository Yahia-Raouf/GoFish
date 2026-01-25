import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { dbInsert, dbGet, dbGetList, dbDelete, dbUpdate, dbRpc } from '../utils/supabase';
import { usePlayerStore } from '../store/store';

export const useLobby = () => {
    const router = useRouter();

    // We access the store HERE, so the UI doesn't have to.
    const { playerName, playerId, setPlayerId } = usePlayerStore();

    const [isLoading, setIsLoading] = useState(false);

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    // ============================================================
    // 🏠 CREATE ROOM
    // ============================================================
    const createRoom = async () => {
        setIsLoading(true);
        try {
            // If we have an old ID, we overwrite it (New Game = New Identity)
            const roomCode = generateCode();

            // 1. Create the Room
            const roomRes = await dbInsert('rooms', {
                code: roomCode,
                status: 'WAITING',
                host_id: null // We'll rely on seat_index: 0 for host logic usually
            });
            if (!roomRes.success) throw new Error(roomRes.error);

            // 2. Add Myself as Player (Host)
            const playerRes = await dbInsert('players', {
                room_code: roomCode,
                name: playerName,
                avatar: '😎',
                seat_index: 0,
                is_ready: true, // Host is always ready
            });
            if (!playerRes.success) throw new Error(playerRes.error);

            setPlayerId(playerRes.data.id);
            router.push({ pathname: '/screens/GameRoom', params: { roomCode } });

        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================================
    // 🔗 JOIN ROOM
    // ============================================================
    const joinRoom = async (codeInput) => {
        if (!codeInput || codeInput.length !== 4) {
            Alert.alert('Invalid Code', 'Code must be 4 characters.');
            return;
        }

        setIsLoading(true);
        const code = codeInput.toUpperCase();

        try {
            // 1. ZOMBIE CHECK (Keep existing logic)
            if (playerId) {
                const existingPlayer = await dbGet('players', 'id', playerId);
                if (existingPlayer.data && existingPlayer.success && existingPlayer.data.room_code === code) {
                    router.push({ pathname: '/screens/GameRoom', params: { roomCode: code } });
                    return;
                }
            }

            // 2. STANDARD JOIN
            const roomRes = await dbGet('rooms', 'code', code);
            if (!roomRes.success || !roomRes.data) throw new Error('Room not found.');

            const playersRes = await dbGetList('players', 'room_code', code);
            const currentPlayers = playersRes.data || [];
            if (currentPlayers.length >= 4) throw new Error('Room is full.');

            // --- 🛠️ FIX START: FIND FIRST AVAILABLE SEAT ---
            const takenSeats = currentPlayers.map(p => p.seat_index);
            let targetSeat = 0;
            // Loop 0 to 3. If "i" is not in takenSeats, grab it.
            for (let i = 0; i < 4; i++) {
                if (!takenSeats.includes(i)) {
                    targetSeat = i;
                    break;
                }
            }
            // --- 🛠️ FIX END ---

            const playerRes = await dbInsert('players', {
                room_code: code,
                name: playerName,
                avatar: '🙂',
                seat_index: targetSeat, // <--- Use the safe index
                is_ready: false,
            });
            if (!playerRes.success) throw new Error(playerRes.error);

            setPlayerId(playerRes.data.id);
            router.push({ pathname: '/screens/GameRoom', params: { roomCode: code } });

        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================================
    // 🚪 LEAVE ROOM
    // ============================================================
    const leaveRoom = async () => {
        setIsLoading(true);
        try {
            const currentId = usePlayerStore.getState().playerId;

            if (currentId) {
                // Delete the row from Supabase
                const result = await dbDelete('players', 'id', currentId);

                if (!result.success) {
                    console.warn('Failed to delete player from DB (might already be gone)');
                }
            }
        } catch (error) {
            console.error('Error leaving room:', error);
        } finally {
            // Always clean up local state and navigate home
            setPlayerId(null);
            router.replace('/screens/Home');
            setIsLoading(false);
        }
    };

    // ============================================================
    // ✅ TOGGLE READY (Guest Action)
    // ============================================================
    const toggleReady = async (currentStatus) => {
        const currentId = usePlayerStore.getState().playerId;
        if (!currentId) return;

        try {
            await dbUpdate('players', { is_ready: !currentStatus }, 'id', currentId);
        } catch (error) {
            console.error('Error toggling ready:', error);
            Alert.alert('Error', 'Could not update status.');
        }
    };

    // ============================================================
    // 🚀 START GAME (Host Action)
    // ============================================================
    const startGame = async (roomCode) => {
        setIsLoading(true);
        try {
            // 1. Set Status to PLAYING
            // This triggers the screen switch for everyone subscribed to the room
            const result = await dbUpdate('rooms', { status: 'PLAYING' }, 'code', roomCode);

            if (!result.success) {
                throw new Error('Failed to start game.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not start game.');
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================================
    // 💀 HOST ACTION: END ROOM (KILL SWITCH)
    // ============================================================
    const endRoom = async (roomCode) => {
        setIsLoading(true);
        try {
            // Call the SQL function to wipe the room
            // Note: We use the parameter name defined in your SQL function (e.g., 'room_code')
            const result = await dbRpc('clean_room', { target_code: roomCode });

            if (!result.success) {
                throw new Error('Failed to close room.');
            }

            // The Host needs to leave manually because the subscription 
            // might be cut off before the DELETE event reaches them.
            setPlayerId(null);
            router.replace('/screens/Home');

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not end room.');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        createRoom,
        joinRoom,
        leaveRoom,
        toggleReady,
        startGame,
        endRoom, // <--- Export this
        isLoading
    };
};