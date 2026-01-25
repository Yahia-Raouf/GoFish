import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { dbInsert, dbGet, dbGetList, dbDelete } from '../utils/supabase';
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

    // --- ACTION: Create ---
    const createRoom = async () => {
        setIsLoading(true);
        try {
            // If we have an old ID, we overwrite it (New Game = New Identity)
            const roomCode = generateCode();

            const roomRes = await dbInsert('rooms', { code: roomCode, status: 'WAITING' });
            if (!roomRes.success) throw new Error(roomRes.error);

            const playerRes = await dbInsert('players', {
                room_code: roomCode,
                name: playerName,
                avatar: '😎',
                seat_index: 0,
                is_ready: true,
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

    // --- ACTION: Join (Contains the "Player ID Check") ---
    const joinRoom = async (codeInput) => {
        if (!codeInput || codeInput.length !== 4) {
            Alert.alert('Invalid Code', 'Code must be 4 characters.');
            return;
        }

        setIsLoading(true);
        const code = codeInput.toUpperCase();

        try {
            // 1. ZOMBIE CHECK
            if (playerId) {
                const existingPlayer = await dbGet('players', 'id', playerId);

                // If I exist and I am trying to join the SAME room I'm already in...
                if (existingPlayer.data && existingPlayer.success && existingPlayer.data.room_code === code) {
                    router.push({ pathname: '/screens/GameRoom', params: { roomCode: code } });
                    return;
                }
            }

            // 2. STANDARD JOIN
            const roomRes = await dbGet('rooms', 'code', code);
            if (!roomRes.success) throw new Error('Room not found.');

            const playersRes = await dbGetList('players', 'room_code', code);
            const currentPlayers = playersRes.data || [];
            if (currentPlayers.length >= 4) throw new Error('Room is full.');

            const playerRes = await dbInsert('players', {
                room_code: code,
                name: playerName,
                avatar: '🙂',
                seat_index: currentPlayers.length,
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
    // 🚪 LEAVE ROOM (Database Cleanup)
    // ============================================================
    const leaveRoom = async () => {
        setIsLoading(true);
        try {
            // 1. Get the current ID directly from the store
            const currentId = usePlayerStore.getState().playerId;

            if (currentId) {
                // 2. Delete the row from Supabase
                const result = await dbDelete('players', 'id', currentId);

                if (!result.success) {
                    console.warn('Failed to delete player from DB (might already be gone)');
                }
            }
        } catch (error) {
            console.error('Error leaving room:', error);
        } finally {
            // 3. Always clean up local state and navigate home
            // We do this in 'finally' so the user isn't stuck if the DB fails
            setPlayerId(null);
            router.back();
            setIsLoading(false);
        }
    };

    return {
        createRoom,
        joinRoom,
        leaveRoom, // Exported so GameRoom can use it
        isLoading
    };
};