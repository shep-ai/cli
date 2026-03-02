'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamEvent {
  type: 'progress' | 'result' | 'error';
  content: string;
  timestamp: string;
}

export interface UseDecisionChatResult {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (text: string, reviewContext: Record<string, unknown>) => Promise<void>;
  resetChat: () => void;
}

export function useDecisionChat(
  reviewType: 'tech' | 'prd',
  featureId: string
): UseDecisionChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset when featureId changes
  useEffect(() => {
    setMessages([]);
    setError(null);
    setIsStreaming(false);

    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [featureId]);

  const sendMessage = useCallback(
    async (text: string, reviewContext: Record<string, unknown>) => {
      if (isStreaming) return;

      const userMessage: ChatMessage = { role: 'user', content: text };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsStreaming(true);
      setError(null);

      // Cancel any previous request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/decision-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            featureId,
            reviewType,
            reviewContext,
            messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          setError(errBody.error ?? `HTTP ${response.status}`);
          setIsStreaming(false);
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let hasError = false;

        // Add an empty assistant message to incrementally fill
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            let event: StreamEvent;
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }

            if (event.type === 'error') {
              setError(event.content);
              hasError = true;
              break;
            }

            if (event.type === 'progress') {
              assistantContent += event.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                };
                return updated;
              });
            }

            if (event.type === 'result') {
              assistantContent = event.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: event.content,
                };
                return updated;
              });
            }
          }

          if (hasError) break;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Ignore abort errors — expected on unmount
          return;
        }
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, featureId, reviewType]
  );

  const resetChat = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, error, sendMessage, resetChat };
}
