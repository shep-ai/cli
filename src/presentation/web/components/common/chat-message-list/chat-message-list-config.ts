import type { ChatMessage } from '@/components/common/chat-message-bubble';

export interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
}
