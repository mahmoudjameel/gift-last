import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Search, X, Trash2, CircleCheck, Circle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Conversation } from '@/types';
import { GuestLoginCard } from '@/components/GuestLoginPrompt';
import { subscribeToCustomerDirectConversations, deleteDirectConversation, type DirectConversation } from '@/services/chat';

function directToConversation(c: DirectConversation): Conversation {
  const updatedAt = c.lastMessageAt as { seconds?: number } | undefined;
  const date = updatedAt?.seconds ? new Date(updatedAt.seconds * 1000) : new Date();
  const time = date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  return {
    id: c.id,
    name: c.merchantName || c.merchantNameAr || '—',
    avatar: c.merchantImage || '',
    lastMessage: c.lastMessage || '',
    time,
    unreadCount: c.unreadCountCustomer ?? 0,
    isOnline: false,
    storeId: c.merchantId,
  };
}

export default function CustomerMessagesScreen() {
  const { colors, t, isRTL, isGuest, user } = useApp();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isGuest || !user?.id) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const unsub = subscribeToCustomerDirectConversations(user.id, (list) => {
      setConversations(list.map(directToConversation));
      setLoading(false);
    });
    return unsub;
  }, [user?.id, isGuest]);

  const totalUnread = useMemo(() => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0), [conversations]);

  const filteredConversations = useMemo(() => {
    if (!searchText.trim()) return conversations;
    const q = searchText.toLowerCase();
    return conversations.filter(
      c => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
    );
  }, [conversations, searchText]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    await Promise.all(selectedIds.map((id) => deleteDirectConversation(id)));
    setSelectedIds([]);
    setIsSelecting(false);
  }, [selectedIds]);

  const handleCancelSelect = useCallback(() => {
    setSelectedIds([]);
    setIsSelecting(false);
  }, []);

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.conversationCard, { borderBottomColor: colors.borderLight }]}
      activeOpacity={0.7}
      onPress={() => {
        if (isSelecting) {
          toggleSelect(item.id);
        } else {
          router.push(`/chat/${item.id}` as any);
        }
      }}
      onLongPress={() => {
        if (!isSelecting) {
          setIsSelecting(true);
          setSelectedIds([item.id]);
        }
      }}
    >
      {isSelecting && (
        <View style={styles.checkboxWrap}>
          {selectedIds.includes(item.id) ? (
            <CircleCheck size={22} color={colors.primary} />
          ) : (
            <Circle size={22} color={colors.textMuted} />
          )}
        </View>
      )}
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
        {item.isOnline && <View style={[styles.onlineDot, { borderColor: colors.card }]} />}
      </View>
      <View style={styles.convInfo}>
        <Text style={[styles.convName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.convMessage, { color: colors.textSecondary }]} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
      <View style={styles.convLeft}>
        {item.unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
        <Text style={[styles.convTime, { color: item.unreadCount > 0 ? colors.primary : colors.textMuted, fontWeight: item.unreadCount > 0 ? '700' as const : '400' as const }]}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isGuest) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
          <View style={styles.guestHeader}>
            <Text style={[styles.guestHeaderTitle, { color: colors.text }]}>{t('messages')}</Text>
          </View>
        </SafeAreaView>
        <GuestLoginCard />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        {isSelecting ? (
          <View style={styles.selectHeader}>
            <TouchableOpacity onPress={handleCancelSelect}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.selectedCount, { color: colors.text }]}>
              {selectedIds.length} {t('selectedCount')}
            </Text>
            <TouchableOpacity onPress={handleDeleteSelected} disabled={selectedIds.length === 0}>
              <Trash2 size={22} color={selectedIds.length > 0 ? colors.error : colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.header}>
            <View style={styles.headerRight}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('messages')}</Text>
              {totalUnread > 0 && (
                <Text style={[styles.unreadCount, { color: colors.primary }]}>{totalUnread} {t('unreadMessages')}</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.selectBtn, { backgroundColor: colors.borderLight }]}
              onPress={() => setIsSelecting(true)}
            >
              <Text style={[styles.selectBtnText, { color: colors.text }]}>{t('selectChats')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('searchMessages')}
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={(text) => { setSearchText(text); setIsSearching(true); }}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {isSearching && searchText.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchText(''); setIsSearching(false); }}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {loading && conversations.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={[styles.listContent, filteredConversations.length === 0 && styles.emptyList]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading && filteredConversations.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('noMessages')}</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  guestHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  guestHeaderTitle: { fontSize: 24, fontWeight: '800' as const },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerRight: {},
  headerTitle: { fontSize: 24, fontWeight: '800' as const },
  unreadCount: { fontSize: 13, marginTop: 4 },
  selectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  selectedCount: { fontSize: 16, fontWeight: '600' as const },
  selectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  selectBtnText: { fontSize: 13, fontWeight: '600' as const },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: { paddingBottom: 100 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyList: { flexGrow: 1 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15 },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  checkboxWrap: {
    marginEnd: 10,
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  convInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  convName: { fontSize: 15, fontWeight: '600' as const, marginBottom: 3 },
  convMessage: { fontSize: 13 },
  convLeft: { alignItems: 'flex-end', gap: 4 },
  unreadBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: '#FFF', fontSize: 11, fontWeight: '700' as const },
  convTime: { fontSize: 12 },
});
