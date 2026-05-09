import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowRight, ArrowLeft, Send, ImageIcon } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { ChatMessage } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import {
  getDirectConversation,
  getDirectMessages,
  addDirectMessage,
  markDirectConversationAsRead,
  subscribeToDirectMessages,
  type DirectConversation,
  type DirectMessage,
} from '@/services/chat';

function directMessageToChatMessage(dm: DirectMessage, mySenderType: 'customer' | 'merchant'): ChatMessage {
  const isMine = dm.senderType === mySenderType;
  const text = dm.imageUrl ? (dm.message === '📷 صورة' ? '' : dm.message) : dm.message;
  const createdAt = dm.createdAt as { seconds?: number } | undefined;
  const date = createdAt?.seconds ? new Date(createdAt.seconds * 1000) : new Date();
  const time = date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  return { id: dm.id, text, time, isMine, image: dm.imageUrl };
}

export default function ChatScreen() {
  const { colors, t, role, isRTL, user, language } = useApp();
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<DirectConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const isMerchant = role === 'merchant';
  const mySenderType = isMerchant ? 'merchant' : 'customer';

  useEffect(() => {
    if (!chatId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getDirectConversation(chatId).then((conv) => {
      if (!cancelled) {
        setConversation(conv ?? null);
        if (conv && user?.id) markDirectConversationAsRead(chatId, mySenderType);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [chatId, user?.id, mySenderType]);

  useEffect(() => {
    if (!chatId) return;
    const unsub = subscribeToDirectMessages(chatId, (raw) => {
      const list = raw.map((dm) => directMessageToChatMessage(dm, mySenderType));
      setMessages(list);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [chatId, mySenderType]);

  const handleSend = async () => {
    if (!message.trim() || !chatId || !user?.id) return;
    const text = message.trim();
    setMessage('');
    const id = await addDirectMessage(chatId, user.id, mySenderType, text);
    if (!id) setMessage(text);
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('', t('pickFromAlbum'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets.length > 0 && chatId && user?.id) {
        const uri = result.assets[0].uri;
        await addDirectMessage(chatId, user.id, mySenderType, '📷 صورة', uri);
      }
    } catch (error) {
      void error;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>{t('noResultsFound')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16, padding: 12, backgroundColor: colors.primary, borderRadius: 12 }}>
          <Text style={{ color: '#FFF' }}>{language === 'ar' ? 'رجوع' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.messageBubbleRow, item.isMine ? styles.myRow : styles.theirRow]}>
      <View style={[
        styles.messageBubble,
        item.isMine
          ? [styles.myBubble, { backgroundColor: colors.primary }]
          : [styles.theirBubble, { backgroundColor: colors.card }],
        item.image ? styles.imageBubble : null
      ]}>
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={styles.messageImage}
            contentFit="cover"
          />
        )}
        {item.text ? (
          <Text style={[styles.messageText, { color: item.isMine ? '#FFF' : colors.text, marginTop: item.image ? 8 : 0 }]}>
            {item.text}
          </Text>
        ) : null}
        <Text style={[styles.messageTime, { color: item.isMine ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
          {item.time}
        </Text>
      </View>
    </View>
  );

  const hasText = message.trim().length > 0;

  const headerTitle = isMerchant
    ? (conversation.customerName || '—')
    : (conversation.merchantName || conversation.merchantNameAr || '—');
  const headerAvatarUri = isMerchant ? (conversation.customerImage || '') : (conversation.merchantImage || '');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            {isRTL ? <ArrowRight size={22} color={colors.text} /> : <ArrowLeft size={22} color={colors.text} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerInfo}
            activeOpacity={0.7}
            onPress={() => {
              if (!isMerchant && conversation.merchantId) {
                router.push(`/store/${conversation.merchantId}` as any);
              }
            }}
          >
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
              {headerTitle}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (!isMerchant && conversation.merchantId) {
                router.push(`/store/${conversation.merchantId}` as any);
              }
            }}
          >
            <Image source={{ uri: headerAvatarUri }} style={styles.headerAvatar} contentFit="cover" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.card }}>
          <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.borderLight }]}>
            <View style={styles.inputRow}>
              {!hasText && (
                <View style={styles.attachRow}>
                  <TouchableOpacity
                    style={[styles.attachBtn, { backgroundColor: colors.primaryLight }]}
                    onPress={handlePickImage}
                  >
                    <ImageIcon size={17} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                value={message}
                onChangeText={setMessage}
                placeholder={t('writeMessage')}
                placeholderTextColor={colors.textMuted}
                textAlign={isRTL ? 'right' : 'left'}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: hasText ? colors.primary : 'transparent',
                  },
                ]}
                onPress={handleSend}
                disabled={!hasText}
                activeOpacity={0.7}
              >
                <Send
                  size={18}
                  color={hasText ? '#FFF' : colors.textMuted}
                  style={{ transform: [{ rotate: isRTL ? '0deg' : '180deg' }] }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700' as const },
  onlineText: { fontSize: 12, fontWeight: '500' as const, marginTop: 2 },
  headerAvatar: { width: 44, height: 44, borderRadius: 22 },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageBubbleRow: { marginBottom: 8 },
  myRow: { alignItems: 'flex-start' },
  theirRow: { alignItems: 'flex-end' },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  imageBubble: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  messageImage: {
    width: 240,
    height: 180,
    borderRadius: 12,
  },
  myBubble: { borderBottomLeftRadius: 6 },
  theirBubble: { borderBottomRightRadius: 6 },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTime: { fontSize: 11, marginTop: 4, textAlign: 'left' },
  inputBar: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  attachRow: {
    flexDirection: 'row',
    gap: 4,
    paddingBottom: 2,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
