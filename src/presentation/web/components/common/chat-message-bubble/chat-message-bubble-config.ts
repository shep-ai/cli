export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatMessageBubbleProps {
  message: ChatMessage;
}
