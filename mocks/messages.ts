import { Conversation, ChatMessage } from '@/types';

export const chatMessages: Record<string, ChatMessage[]> = {};

export const customerChatMessages: Record<string, ChatMessage[]> = {};

export const merchantConversations: Conversation[] = [];

export const customerConversations: Conversation[] = [];

export const getTotalUnread = (conversations: Conversation[]): number => {
  return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
};
