import React, { useState } from 'react';
import { View, Text, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { Center } from './Layout';
import { Button } from './Button';
import { usePlayerStore } from '../store/store';
import { useGameLoop } from '../hooks/useGameLoop';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const ActiveGame = ({ room, players, actions, gameLoop }) => {
  const { playerId } = usePlayerStore();

  // 1. PLUG IN THE BRAIN
  const { isMyTurn, askForCard, isProcessing, effectiveHost } = gameLoop;

  // 2. UI STATE
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedRank, setSelectedRank] = useState(null);

  // 3. HELPER DATA
  const myPlayer = players.find((p) => p.id === playerId);
  const myRanks = Array.from(new Set(myPlayer?.cards?.map((c) => c.slice(0, -1)) || []));
  const opponents = players.filter((p) => p.id !== playerId);

  const handleSubmitMove = () => {
    if (selectedTarget && selectedRank) {
      askForCard(selectedTarget, selectedRank);
      setModalVisible(false);
      setSelectedTarget(null);
      setSelectedRank(null);
    }
  };

  return (
    <Center>
      <ScrollView className="w-full px-4 pt-10" showsVerticalScrollIndicator={false}>
        {/* --- INFO DASHBOARD --- */}
        <View className="mb-6 gap-2 rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-xl">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <MaterialCommunityIcons name="cards-playing-outline" size={20} color="#60a5fa" />
              <Text className="font-bold text-blue-200">
                Ocean: <Text className="text-white">{room.ocean_cards?.length || 0}</Text>
              </Text>
            </View>
            <View className="rounded-full bg-black/40 px-3 py-1">
              <Text className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                Turn: Seat {room.turn_index}
              </Text>
            </View>
          </View>
        </View>

        {/* --- PLAYER LIST --- */}
        <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-widest text-blue-200/50">
          Table
        </Text>
        <View className="mb-6 gap-2">
          {players
            .sort((a, b) => a.seat_index - b.seat_index)
            .map((p) => {
              const isCurrentTurn = room.turn_index === p.seat_index;
              const isMe = p.id === playerId;
              const isHost = p.id === effectiveHost?.id;

              return (
                <View
                  key={p.id}
                  className={`flex-row items-center justify-between rounded-xl border-l-4 p-3 shadow-sm ${
                    isCurrentTurn
                      ? 'border-yellow-400 bg-slate-800'
                      : 'border-transparent bg-slate-900/50'
                  }`}>
                  <View>
                    <View className="flex-row items-center gap-2">
                      <Text
                        className={`text-lg font-bold ${isCurrentTurn ? 'text-yellow-400' : 'text-slate-300'}`}>
                        {p.name} {isMe ? '(You)' : ''}
                      </Text>
                      {isHost && <MaterialCommunityIcons name="crown" size={14} color="#facc15" />}
                    </View>
                  </View>

                  <View className="items-end">
                    <View className="flex-row items-center gap-1">
                      <MaterialCommunityIcons name="cards" size={14} color="#94a3b8" />
                      <Text className="font-bold text-white">{p.cards?.length || 0}</Text>
                    </View>
                    {p.sets?.length > 0 && (
                      <Text className="text-xs font-bold text-green-400">
                        {p.sets.length} {p.sets.length === 1 ? 'Set' : 'Sets'}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
        </View>

        {/* --- MY HAND --- */}
        <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-widest text-blue-200/50">
          Your Hand
        </Text>

        {/* 🛠️ UI UPDATE: ScrollView with max-h-60 (approx 2 rows) */}
        <ScrollView
          className="mb-6 max-h-60 grow-0"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}>
          <View className="flex-row flex-wrap gap-2 pb-2">
            {myPlayer?.cards?.length > 0 ? (
              myPlayer.cards
                .sort((a, b) => {
                  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
                  return ranks.indexOf(a.slice(0, -1)) - ranks.indexOf(b.slice(0, -1));
                })
                .map((card, index) => (
                  <View
                    key={index}
                    className="aspect-[2/3] w-[18%] items-center justify-center rounded-lg border-b-4 border-gray-300 bg-white shadow-md">
                    <Text
                      className={`text-xl font-black ${['H', 'D'].includes(card.slice(-1)) ? 'text-red-600' : 'text-slate-900'}`}>
                      {card.slice(0, -1)}
                    </Text>
                    <MaterialCommunityIcons
                      name={
                        card.includes('H')
                          ? 'cards-heart'
                          : card.includes('D')
                            ? 'cards-diamond'
                            : card.includes('C')
                              ? 'cards-club'
                              : 'cards-spade'
                      }
                      size={16}
                      color={['H', 'D'].includes(card.slice(-1)) ? '#dc2626' : '#0f172a'}
                    />
                  </View>
                ))
            ) : (
              <View className="w-full rounded-xl border border-dashed border-white/10 bg-white/5 p-4">
                <Text className="text-center italic text-white/40">Waiting for deal...</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* --- MY SETS --- */}
        <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-widest text-green-400/80">
          Your Sets (Score: {myPlayer?.sets?.length || 0})
        </Text>

        {/* 🛠️ UI UPDATE: ScrollView with max-h-60 */}
        <ScrollView
          className="mb-24 max-h-60 grow-0"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}>
          <View className="flex-row flex-wrap gap-2 pb-2">
            {myPlayer?.sets?.length > 0 ? (
              myPlayer.sets.map((set, index) => (
                <View
                  key={index}
                  className="aspect-[2/3] w-[18%] items-center justify-center rounded-lg border-b-4 border-green-600 bg-yellow-100 shadow-md">
                  <Text className="text-xl font-black text-green-800">{set.rank}</Text>
                  <MaterialCommunityIcons name="star-circle" size={18} color="#16a34a" />
                  <Text className="mt-1 text-[8px] font-bold uppercase text-green-700">Full</Text>
                </View>
              ))
            ) : (
              <View className="w-full rounded-xl border border-white/5 bg-black/20 p-3">
                <Text className="text-center text-xs italic text-white/30">
                  No sets collected yet.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {/* --- BOTTOM ACTION BAR --- */}
      <View className="absolute bottom-0 w-full bg-gradient-to-t from-black/90 to-transparent px-6 pb-8 pt-4">
        {isMyTurn ? (
          <Button
            title="Make a Move"
            onPress={() => setModalVisible(true)}
            variant="primary"
            disabled={isProcessing}
          />
        ) : (
          <View className="items-center py-2">
            <Text className="animate-pulse font-medium italic text-white/50">
              Waiting for {players.find((p) => p.seat_index === room.turn_index)?.name}...
            </Text>
          </View>
        )}

        {/* --- EXIT CONTROLS --- */}
        <View className="mb-4 mt-4 w-full gap-3 opacity-80">
          {/* Check if I am the Host using the effectiveHost from useGameLoop */}
          {myPlayer?.id === effectiveHost?.id ? (
            <Button
              title="End Game (Host)"
              variant="danger"
              onPress={() => actions.endRoom(room.code)}
            />
          ) : null}
        </View>
      </View>

      {/* --- THE "ASK" MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="h-[70%] rounded-t-3xl border-t border-white/10 bg-slate-900 p-6">
            {/* HEADER */}
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-2xl font-black italic text-white">ASK A PLAYER</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="rounded-full bg-white/10 p-2">
                <MaterialCommunityIcons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* STEP 1: SELECT OPPONENT */}
            <Text className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-200">
              1. Who to ask?
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 max-h-24">
              {opponents.map((opp) => (
                <TouchableOpacity
                  key={opp.id}
                  onPress={() => setSelectedTarget(opp.id)}
                  className={`mr-4 w-20 items-center justify-center rounded-xl border-2 p-3 ${selectedTarget === opp.id ? 'border-blue-400 bg-blue-600' : 'border-slate-700 bg-slate-800'}`}>
                  <Text className="mb-1 text-2xl">{opp.avatar || '🙂'}</Text>
                  <Text className="text-center text-xs font-bold text-white" numberOfLines={1}>
                    {opp.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* STEP 2: SELECT RANK */}
            <Text className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-200">
              2. For which rank?
            </Text>
            {myRanks.length === 0 ? (
              <Text className="text-sm italic text-red-400">You have no cards to ask with!</Text>
            ) : (
              <View className="mb-8 flex-row flex-wrap gap-3">
                {myRanks.map((rank) => (
                  <TouchableOpacity
                    key={rank}
                    onPress={() => setSelectedRank(rank)}
                    className={`h-16 w-14 items-center justify-center rounded-lg border-b-4 ${selectedRank === rank ? 'border-yellow-600 bg-yellow-400' : 'border-gray-300 bg-white'}`}>
                    <Text
                      className={`text-xl font-black ${selectedRank === rank ? 'text-black' : 'text-slate-800'}`}>
                      {rank}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* SUBMIT BUTTON */}
            <View className="mt-auto">
              <Button
                title={isProcessing ? 'Sending...' : 'Ask!'}
                variant={selectedTarget && selectedRank ? 'primary' : 'secondary'}
                disabled={!selectedTarget || !selectedRank || isProcessing}
                onPress={handleSubmitMove}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Center>
  );
};
