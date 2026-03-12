'use client';

import { useCallback, useReducer, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ChatMessageRole = 'user' | 'assistant';
export type ChatMessageStatus = 'sending' | 'streaming' | 'complete' | 'error';
export type ChatStatus = 'idle' | 'sending' | 'streaming' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
  status: ChatMessageStatus;
}

/* ------------------------------------------------------------------ */
/*  Reducer actions                                                    */
/* ------------------------------------------------------------------ */

type ChatAction =
  | { type: 'add_user_message'; message: ChatMessage }
  | { type: 'start_streaming' }
  | { type: 'stream_token'; content: string }
  | { type: 'complete_streaming'; sessionId?: string }
  | { type: 'set_error'; error: string }
  | { type: 'clear_messages' };

export interface ChatState {
  messages: ChatMessage[];
  status: ChatStatus;
  error: string | null;
  sessionId: string | null;
}

export const initialChatState: ChatState = {
  messages: [],
  status: 'idle',
  error: null,
  sessionId: null,
};

/* ------------------------------------------------------------------ */
/*  Reducer                                                            */
/* ------------------------------------------------------------------ */

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'add_user_message':
      return {
        ...state,
        messages: [...state.messages, action.message],
        status: 'sending',
        error: null,
      };

    case 'start_streaming': {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'streaming',
      };
      return {
        ...state,
        messages: [...state.messages, assistantMessage],
        status: 'streaming',
      };
    }

    case 'stream_token': {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + action.content };
      }
      return { ...state, messages: msgs };
    }

    case 'complete_streaming': {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, status: 'complete' };
      }
      return {
        ...state,
        messages: msgs,
        status: 'idle',
        sessionId: action.sessionId ?? state.sessionId,
      };
    }

    case 'set_error': {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant' && last.status === 'streaming') {
        msgs[msgs.length - 1] = { ...last, status: 'error' };
      }
      return {
        ...state,
        messages: msgs,
        status: 'error',
        error: action.error,
      };
    }

    case 'clear_messages':
      return { ...initialChatState };

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  SSE stream parser                                                  */
/* ------------------------------------------------------------------ */

export interface ParsedSSEEvent {
  type: 'progress' | 'result' | 'error';
  content: string;
  sessionId?: string;
  timestamp?: string;
}

/**
 * Parse SSE-formatted chunks from a ReadableStream.
 * Yields parsed events as they arrive.
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncIterable<ParsedSSEEvent> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Split on double newline (SSE event boundary)
    const parts = buffer.split('\n\n');
    // Last part may be incomplete — keep it in the buffer
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed || trimmed.startsWith(':')) continue; // Skip empty lines and comments (heartbeats)

      // Extract data lines
      const dataLines: string[] = [];
      for (const line of trimmed.split('\n')) {
        if (line.startsWith('data: ')) {
          dataLines.push(line.slice(6));
        }
      }

      if (dataLines.length === 0) continue;

      try {
        const parsed = JSON.parse(dataLines.join('\n')) as ParsedSSEEvent;
        yield parsed;
      } catch {
        // Non-JSON data — skip
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export interface UseChatResult {
  messages: ChatMessage[];
  status: ChatStatus;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  retry: () => Promise<void>;
  clearChat: () => void;
}

export function useChat(): UseChatResult {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);

  const streamResponse = useCallback(async (message: string, sessionId: string | null) => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    dispatch({ type: 'start_streaming' });

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Request failed');
        dispatch({ type: 'set_error', error: errorText });
        return;
      }

      if (!response.body) {
        dispatch({ type: 'set_error', error: 'No response body' });
        return;
      }

      const reader = response.body.getReader();

      try {
        for await (const event of parseSSEStream(reader)) {
          if (controller.signal.aborted) break;

          switch (event.type) {
            case 'progress':
              dispatch({ type: 'stream_token', content: event.content });
              break;
            case 'result':
              dispatch({ type: 'complete_streaming', sessionId: event.sessionId });
              return;
            case 'error':
              dispatch({ type: 'set_error', error: event.content });
              return;
          }
        }

        // Stream ended without a result event — treat as complete
        dispatch({ type: 'complete_streaming' });
      } finally {
        reader.releaseLock();
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      dispatch({ type: 'set_error', error: errorMessage });
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      if (state.status === 'sending' || state.status === 'streaming') return;

      lastUserMessageRef.current = trimmed;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
        status: 'complete',
      };

      dispatch({ type: 'add_user_message', message: userMessage });
      await streamResponse(trimmed, state.sessionId);
    },
    [state.status, state.sessionId, streamResponse]
  );

  const retry = useCallback(async () => {
    const lastMessage = lastUserMessageRef.current;
    if (!lastMessage) return;

    // Remove the last assistant message if it errored
    dispatch({ type: 'clear_messages' });

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: lastMessage,
      timestamp: new Date(),
      status: 'complete',
    };

    dispatch({ type: 'add_user_message', message: userMessage });
    await streamResponse(lastMessage, state.sessionId);
  }, [state.sessionId, streamResponse]);

  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    lastUserMessageRef.current = null;
    dispatch({ type: 'clear_messages' });
  }, []);

  return {
    messages: state.messages,
    status: state.status,
    error: state.error,
    sendMessage,
    retry,
    clearChat,
  };
}
