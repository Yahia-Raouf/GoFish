import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { Center } from './Layout';
import { Button } from './Button';
import { usePlayerStore } from '../store/store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useOfflineGameStore, getRank } from '../store/offlineGameStore';
import { BOT_CONFIG } from '../hooks/useBotBrain';
import { ActionOverlay } from './ActionOverlay';

export const ActiveGame = ({
  room,
  players,
  actions,
  gameLoop,
  onlineAction, 
  onClearOnlineAction, 
}) => {
  const { playerId } = usePlayerStore();

  const isOffline = room.code === 'OFFLINE';
  const { logs: offlineLogs } = useOfflineGameStore();
  const logs = isOffline ? offlineLogs : [];

  const { isMyTurn, askForCard, isProcessing, effectiveHost } = gameLoop;
  const activeAction = isOffline ? gameLoop.currentAction : onlineAction;

  const handleActionFinished = () => {
    if (isOffline) {
      gameLoop.clearAction();
    } else if (onClearOnlineAction) {
      onClearOnlineAction();
    }
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedRank, setSelectedRank] = useState(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  const myPlayer = players.find((p) => p.id === playerId);
  const myRanks = Array.from(new Set(myPlayer?.cards?.map((c) => c.slice(0, -1)) || []));
  const opponents = players.filter((p) => p.id !== playerId);

  const recentLogs = isOffline ? logs.slice(-BOT_CONFIG.MEMORY_SPAN).reverse() : [];

  const knownHands = useMemo(() => {
    if (!isOffline) return {};
    const knowledge = {};
    players.forEach((p) => { knowledge[p.id] = new Set(); });
    const memoryLogs = logs.slice(-BOT_CONFIG.MEMORY_SPAN);

    memoryLogs.forEach((log) => {
      const rank = String(log.rank);
      if (!rank || rank === 'undefined') return;
      if (log.type === 'CATCH') {
        knowledge[log.actorId]?.add(rank);
        knowledge[log.targetId]?.delete(rank);
      } else if (log.type === 'FAIL') {
        knowledge[log.actorId]?.add(rank);
      } else if (log.type === 'LUCKY') {
        knowledge[log.actorId]?.add(rank);
      }
    });

    const bookedRanks = new Set();
    players.forEach((p) => { p.sets.forEach((s) => bookedRanks.add(s.rank)); });
    Object.keys(knowledge).forEach((pid) => {
      bookedRanks.forEach((br) => knowledge[pid].delete(br));
    });
    return knowledge;
  }, [logs, players, isOffline]);

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
      <ActionOverlay action={activeAction} onFinished={handleActionFinished} />

      <ScrollView
        className="w-full flex-1 px-4 pt-10"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}>
        
        {/* --- INFO DASHBOARD --- */}
        <View className="mb-6 gap-2 rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-xl">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons name="cards-playing-outline" size={20} color="#60a5fa" />
                <Text className="font-bold text-blue-200">
                  Ocean: <Text className="text-white">{room.ocean_cards?.length || 0}</Text>
                </Text>
              </View>

              {isOffline && (
                <TouchableOpacity
                  onPress={() => setHistoryVisible(true)}
                  className="flex-row items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                  <MaterialCommunityIcons name="history" size={16} color="#60a5fa" />
                  <Text className="text-[10px] font-bold text-blue-200">HISTORY</Text>
                  {logs.length > 0 && (
                    <View className="ml-1 h-4 w-4 items-center justify-center rounded-full bg-blue-500">
                      <Text className="text-[8px] font-black text-white">
                        {Math.min(logs.length, BOT_CONFIG.MEMORY_SPAN)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View className="rounded-full bg-black/40 px-3 py-1">
              <Text className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                Turn: Seat {room.turn_index}
              </Text>
            </View>
          </View>
        </View>

        {/* --- TABLE LIST --- */}
        <TouchableOpacity
          onPress={() => setIsTableExpanded(!isTableExpanded)}
          activeOpacity={0.7}
          className="mb-2 flex-row items-center justify-between rounded-2xl"
          style={!isTableExpanded ? {
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                  padding: 16,
                  marginBottom: 24,
                } : { paddingRight: 8, marginLeft: 4 }}>
          <View className="flex-row items-center gap-3">
            <Text className={`text-xs font-bold uppercase tracking-widest ${!isTableExpanded ? 'text-blue-100' : 'text-blue-200/50'}`}>
              Table
            </Text>
            {!isTableExpanded && (
              <View className="rounded border border-blue-400/20 bg-blue-500/20 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-blue-200">{players.length} Players</Text>
              </View>
            )}
          </View>
          <MaterialCommunityIcons name={isTableExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#60a5fa" />
        </TouchableOpacity>

        {isTableExpanded && (
          <View className="mb-6 gap-2">
            {players.sort((a, b) => a.seat_index - b.seat_index).map((p) => {
                const isCurrentTurn = room.turn_index === p.seat_index;
                const isMe = p.id === playerId;
                const isHost = p.id === effectiveHost?.id;
                const knownRanks = Array.from(knownHands[p.id] || []).sort();
                
                // Calculate Totals
                const currentSets = p.sets?.length || 0;
                const totalScore = (p.score || 0) + currentSets;

                return (
                  <View key={p.id} className={`flex-row items-center justify-between rounded-xl border-l-4 p-3 shadow-sm ${isCurrentTurn ? 'border-yellow-400 bg-slate-800' : 'border-transparent bg-slate-900/50'}`}>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className={`text-lg font-bold ${isCurrentTurn ? 'text-yellow-400' : 'text-slate-300'}`}>
                          {p.name} {isMe ? '(You)' : ''}
                        </Text>
                        {isOffline && p.isBot ? <MaterialCommunityIcons name="robot" size={14} color="#94a3b8" /> : isHost && <MaterialCommunityIcons name="crown" size={14} color="#facc15" />}
                      </View>
                      
                      {isOffline && !isMe && knownRanks.length > 0 && (
                        <View className="mt-1 flex-row flex-wrap gap-1">
                          {knownRanks.map((rank) => (
                            <View key={rank} className="flex-row items-center rounded border border-blue-500/20 bg-blue-950/60 px-1.5 py-0.5">
                              <MaterialCommunityIcons name="eye-outline" size={10} color="#60a5fa" />
                              <Text className="ml-1 text-[10px] font-bold text-blue-200">{rank}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    <View className="items-end">
                      <View className="flex-row items-center gap-1">
                        <MaterialCommunityIcons name="cards" size={14} color="#94a3b8" />
                        <Text className="font-bold text-white">{p.cards?.length || 0}</Text>
                      </View>
                      <View className="flex-row gap-2 mt-1">
                          <Text className="text-xs font-bold text-green-400">Sets: {currentSets}</Text>
                          <Text className="text-xs font-black text-yellow-400">Total: {totalScore}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        {/* --- MY HAND --- */}
        <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-widest text-blue-200/50">Your Hand</Text>
        <View className="flex-row flex-wrap gap-2">
          {myPlayer?.cards?.length > 0 ? (
            myPlayer.cards.sort((a, b) => {
                const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
                return ranks.indexOf(a.slice(0, -1)) - ranks.indexOf(b.slice(0, -1));
              }).map((card, index) => (
                <View key={index} className="aspect-[2/3] w-[18%] items-center justify-center rounded-lg border-b-4 border-gray-300 bg-white shadow-md">
                  <Text className={`text-xl font-black ${['H', 'D'].includes(card.slice(-1)) ? 'text-red-600' : 'text-slate-900'}`}>{card.slice(0, -1)}</Text>
                  <MaterialCommunityIcons name={card.includes('H') ? 'cards-heart' : card.includes('D') ? 'cards-diamond' : card.includes('C') ? 'cards-club' : 'cards-spade'} size={16} color={['H', 'D'].includes(card.slice(-1)) ? '#dc2626' : '#0f172a'} />
                </View>
              ))
          ) : (
            <View className="w-full rounded-xl border border-dashed border-white/10 bg-white/5 p-4">
              <Text className="text-center italic text-white/40">Waiting for deal...</Text>
            </View>
          )}
        </View>

        {/* --- MY SETS --- */}
        <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-widest text-green-400/80">
            Your Sets (Round: {myPlayer?.sets?.length || 0} | Total: {(myPlayer?.score || 0) + (myPlayer?.sets?.length || 0)})
        </Text>
        <View className="mb-6 flex-row flex-wrap gap-2 pb-2">
          {myPlayer?.sets?.length > 0 ? (
            myPlayer.sets.map((set, index) => (
              <View key={index} className="aspect-[2/3] w-[18%] items-center justify-center rounded-lg border-b-4 border-green-600 bg-yellow-100 shadow-md">
                <Text className="text-xl font-black text-green-800">{set.rank}</Text>
                <MaterialCommunityIcons name="star-circle" size={18} color="#16a34a" />
                <Text className="mt-1 text-[8px] font-bold uppercase text-green-700">Full</Text>
              </View>
            ))
          ) : (
            <View className="w-full rounded-xl border border-white/5 bg-black/20 p-3">
              <Text className="text-center text-xs italic text-white/30">No sets collected yet.</Text>
            </View>
          )}
        </View>

        {/* --- BOTTOM ACTION BAR --- */}
        <View className="w-full border-t border-white/10 pb-12 pt-4">
          {isMyTurn ? (
            <Button title="Make a Move" onPress={() => setModalVisible(true)} variant="primary" disabled={isProcessing} />
          ) : (
            <View className="items-center py-2">
              <Text className="animate-pulse font-medium italic text-white/50">Waiting for {players.find((p) => p.seat_index === room.turn_index)?.name}...</Text>
            </View>
          )}

          <View className="mt-4 w-full gap-3 opacity-80">
            {myPlayer?.id === effectiveHost?.id ? (
              <Button title="End Game (Host)" variant="danger" onPress={() => actions.endRoom(room.code)} />
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* --- THE "ASK" MODAL --- */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="h-[70%] rounded-t-3xl border-t border-white/10 bg-slate-900 p-6">
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-2xl font-black italic text-white">ASK A PLAYER</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="rounded-full bg-white/10 p-2">
                <MaterialCommunityIcons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <Text className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-200">1. Who to ask?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 max-h-24">
              {opponents.map((opp) => (
                <TouchableOpacity key={opp.id} onPress={() => setSelectedTarget(opp.id)} className={`mr-4 w-20 items-center justify-center rounded-xl border-2 p-3 ${selectedTarget === opp.id ? 'border-blue-400 bg-blue-600' : 'border-slate-700 bg-slate-800'}`}>
                  <Text className="mb-1 text-2xl">{opp.avatar || '🙂'}</Text>
                  <Text className="text-center text-xs font-bold text-white" numberOfLines={1}>{opp.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-200">2. For which rank?</Text>
            {myRanks.length === 0 ? (
              <Text className="text-sm italic text-red-400">You have no cards to ask with!</Text>
            ) : (
              <View className="mb-8 flex-row flex-wrap gap-3">
                {myRanks.map((rank) => (
                  <TouchableOpacity key={rank} onPress={() => setSelectedRank(rank)} className={`h-16 w-14 items-center justify-center rounded-lg border-b-4 ${selectedRank === rank ? 'border-yellow-600 bg-yellow-400' : 'border-gray-300 bg-white'}`}>
                    <Text className={`text-xl font-black ${selectedRank === rank ? 'text-black' : 'text-slate-800'}`}>{rank}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View className="mt-auto">
              <Button title={isProcessing ? 'Sending...' : 'Ask!'} variant={selectedTarget && selectedRank ? 'primary' : 'secondary'} disabled={!selectedTarget || !selectedRank || isProcessing} onPress={handleSubmitMove} />
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MOVE HISTORY OVERLAY --- */}
      {isOffline && (
        <Modal animationType="fade" transparent={true} visible={historyVisible} onRequestClose={() => setHistoryVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => setHistoryVisible(false)} className="flex-1 items-center justify-center bg-black/60">
            <View onStartShouldSetResponder={() => true} className="max-h-[60%] w-[85%] rounded-3xl border border-white/20 bg-slate-900 p-6 shadow-2xl">
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <MaterialCommunityIcons name="brain" size={20} color="#60a5fa" />
                  <Text className="text-xl font-black italic text-white">MATCH MEMORY</Text>
                </View>
                <Text className="text-[10px] font-bold uppercase tracking-widest text-blue-200/50">Last {BOT_CONFIG.MEMORY_SPAN} Turns</Text>
              </View>

              <ScrollView className="z-50" showsVerticalScrollIndicator={true}>
                {recentLogs.length > 0 ? (
                  recentLogs.map((log, index) => (
                    <View key={index} className="mb-3 rounded-xl border-l-2 border-blue-400 bg-white/5 p-3">
                      <View className="mb-1">
                        {log.type === 'FISH' ? (
                          <Text className="text-xs text-blue-200"><Text className="font-bold text-white">{log.actorName}</Text> drew a card from the ocean.</Text>
                        ) : log.type === 'LUCKY' ? (
                          <Text className="text-xs text-blue-200"><Text className="font-bold text-white">{log.actorName}</Text> drew the <Text className="font-bold text-yellow-400">{log.rank}</Text> and goes again!</Text>
                        ) : log.type === 'ROUND_START' ? (
                          <Text className="text-xs font-black italic text-yellow-400/80">🌊 ROUND STARTED</Text>
                        ) : (
                          <Text className="text-xs text-blue-200"><Text className="font-bold text-white">{log.actorName}</Text> asked <Text className="font-bold text-white">{log.targetName}</Text> for <Text className="font-bold text-yellow-400">{log.rank}s</Text></Text>
                        )}
                      </View>
                      <View className="flex-row items-center gap-2">
                        {log.type === 'CATCH' ? (
                            <><MaterialCommunityIcons name="check-circle" size={12} color="#4ade80" /><Text className="text-[10px] font-bold text-green-400">SUCCESS (+{log.count})</Text></>
                        ) : log.type === 'FAIL' ? (
                            <><MaterialCommunityIcons name="water" size={12} color="#60a5fa" /><Text className="text-[10px] font-bold text-blue-400">GO FISH</Text></>
                        ) : log.type === 'LUCKY' ? (
                            <><MaterialCommunityIcons name="star" size={12} color="#facc15" /><Text className="text-[10px] font-bold text-yellow-400">LUCKY DRAW</Text></>
                        ) : log.type === 'FISH' ? (
                            <><MaterialCommunityIcons name="cards-outline" size={12} color="#94a3b8" /><Text className="text-[10px] font-bold text-slate-400">DREW CARD</Text></>
                        ) : <View />}
                      </View>
                    </View>
                  ))
                ) : (
                  <View className="items-center py-10"><Text className="text-center italic text-white/30">The game has just begun. No moves recorded yet.</Text></View>
                )}
              </ScrollView>
              <TouchableOpacity onPress={() => setHistoryVisible(false)} className="mt-4 items-center rounded-xl bg-blue-600 py-3"><Text className="font-bold text-white">Back to Game</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Center>
  );
};