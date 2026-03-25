'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ThreadMessageLike, AppendMessage } from '@assistant-ui/react';
import { useExternalStoreRuntime } from '@assistant-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InteractiveMessage } from '@shepai/core/domain/generated/output';
import { InteractiveMessageRole } from '@shepai/core/domain/generated/output';

/** Chat state returned by the backend — matches ChatState from service interface */
interface ChatState {
  messages: InteractiveMessage[];
  sessionStatus: string | null;
  streamingText: string | null;
  sessionInfo: SessionInfo | null;
}

interface SessionInfo {
  pid: number | null;
  sessionId: string | null;
  model: string | null;
  startedAt: string;
  idleTimeoutMinutes: number;
  lastActivityAt: string;
}

// ── API helpers ─────────────────────────────────────────────────────────────

async function fetchChatState(featureId: string): Promise<ChatState> {
  const res = await fetch(`/api/interactive/chat/${featureId}/messages`);
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error(`[ChatState] fetch failed: ${res.status}`, await res.text().catch(() => ''));
    throw new Error(`Failed to fetch chat state: ${res.status}`);
  }
  return res.json() as Promise<ChatState>;
}

async function postMessage(
  featureId: string,
  content: string,
  worktreePath: string
): Promise<InteractiveMessage> {
  const res = await fetch(`/api/interactive/chat/${featureId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, worktreePath }),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  const data = (await res.json()) as { message: InteractiveMessage };
  return data.message;
}

// ── Convert domain message to assistant-ui format ───────────────────────────

function toThreadMessage(msg: InteractiveMessage): ThreadMessageLike {
  return {
    id: msg.id,
    role: msg.role === InteractiveMessageRole.user ? 'user' : 'assistant',
    content: [{ type: 'text', text: msg.content }],
    createdAt: msg.createdAt ? new Date(msg.createdAt as unknown as string) : undefined,
  };
}

// ── Query key ───────────────────────────────────────────────────────────────

function chatQueryKey(featureId: string) {
  return ['chat-messages', featureId] as const;
}

// ── Status info for the typing indicator ────────────────────────────────────

export interface ChatStatus {
  /** Whether the agent is actively working (booting, thinking, streaming). */
  isRunning: boolean;
  /** Human-readable status text (e.g. "Agent is waking up...", "Using tool: Read"). */
  statusText: string | null;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface ChatRuntimeOptions {
  /** Transform message content before sending (e.g. append attachment refs). */
  contentTransform?: (content: string) => string;
  /** Called after a message is successfully sent (e.g. clear attachments). */
  onMessageSent?: () => void;
}

/**
 * `featureId` is a polymorphic scope key: a feature UUID, "repo-<id>", or "global".
 * All API calls and SSE subscriptions are scoped to this key.
 */
export function useChatRuntime(
  featureId: string,
  worktreePath?: string,
  options?: ChatRuntimeOptions
) {
  const queryClient = useQueryClient();

  // ── TanStack Query: fetch messages from backend ─────────────────────────
  const { data: chatState, isLoading: isChatLoading } = useQuery({
    queryKey: chatQueryKey(featureId),
    queryFn: () => fetchChatState(featureId),
    refetchInterval: 3000, // Fallback polling every 3s
  });

  const messages = useMemo(() => chatState?.messages ?? [], [chatState?.messages]);
  const sessionStatus = chatState?.sessionStatus ?? null;
  const backendStreamingText = chatState?.streamingText ?? null;

  // Cache last known sessionInfo so PID stays visible after process exits
  const lastSessionInfoRef = useRef<ChatState['sessionInfo']>(null);
  if (chatState?.sessionInfo) {
    lastSessionInfoRef.current = chatState.sessionInfo;
  }
  const sessionInfo = chatState?.sessionInfo ?? lastSessionInfoRef.current;

  // ── SSE: real-time streaming deltas ─────────────────────────────────────

  const [streamingText, setStreamingText] = useState('');
  const [statusLog, setStatusLog] = useState<string | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const awaitingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Delayed awaiting — only show Thinking bubble after 600ms to avoid flash
  const startAwaiting = useCallback(() => {
    if (awaitingTimerRef.current) clearTimeout(awaitingTimerRef.current);
    awaitingTimerRef.current = setTimeout(() => setAwaitingResponse(true), 600);
  }, []);
  const cancelAwaiting = useCallback(() => {
    if (awaitingTimerRef.current) {
      clearTimeout(awaitingTimerRef.current);
      awaitingTimerRef.current = null;
    }
    setAwaitingResponse(false);
  }, []);

  // Clear awaitingResponse when backend delivers a new assistant message
  const lastMsgRole = messages.length > 0 ? messages[messages.length - 1].role : null;
  useEffect(() => {
    if (lastMsgRole === InteractiveMessageRole.assistant) {
      cancelAwaiting();
    }
  }, [lastMsgRole, messages.length, cancelAwaiting]);

  useEffect(() => {
    const es = new EventSource(`/api/interactive/chat/${featureId}/stream`);
    eventSourceRef.current = es;

    es.addEventListener('delta', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as { delta: string };
        if (data.delta) {
          cancelAwaiting();
          setStreamingText((prev) => prev + data.delta);
          setStatusLog(null);
        }
      } catch {
        // Ignore
      }
    });

    es.addEventListener('activity', () => {
      cancelAwaiting();
      // Tool events are already persisted to DB — just refetch to show them
      void queryClient.invalidateQueries({ queryKey: chatQueryKey(featureId) });
    });

    es.addEventListener('log', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as { log: string };
        if (data.log) {
          cancelAwaiting();
          setStatusLog(data.log);
        }
      } catch {
        // Ignore
      }
    });

    es.addEventListener('done', () => {
      setStatusLog(null);
      cancelAwaiting();
      // Refetch first, THEN clear local streaming state so there's no gap
      void queryClient.invalidateQueries({ queryKey: chatQueryKey(featureId) }).then(() => {
        setStreamingText('');
      });
    });

    es.onerror = () => {
      // SSE dropped — the 3s polling handles reliability
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [featureId, queryClient, cancelAwaiting]);

  // ── Mutation: send user message ─────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (content: string) => postMessage(featureId, content, worktreePath ?? ''),
    onMutate: async (content: string) => {
      startAwaiting();
      // Cancel in-flight refetches so our optimistic update isn't overwritten
      await queryClient.cancelQueries({ queryKey: chatQueryKey(featureId) });

      const previous = queryClient.getQueryData<ChatState>(chatQueryKey(featureId));

      // Optimistically add user message
      queryClient.setQueryData<ChatState>(chatQueryKey(featureId), (old) => ({
        messages: [
          ...(old?.messages ?? []),
          {
            id: `optimistic-${Date.now()}`,
            featureId,
            role: InteractiveMessageRole.user,
            content,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        sessionStatus: old?.sessionStatus ?? 'booting',
        streamingText: null,
        sessionInfo: old?.sessionInfo ?? null,
      }));

      return { previous };
    },
    onError: (_err, _content, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(chatQueryKey(featureId), context.previous);
      }
    },
    onSettled: () => {
      // Refetch to reconcile optimistic data with server
      void queryClient.invalidateQueries({ queryKey: chatQueryKey(featureId) });
    },
  });

  // ── Derive running state ────────────────────────────────────────────────
  // Note: sendMutation.isPending is excluded — the 600ms awaitingResponse
  // timer provides a smooth transition without flicker.
  const isRunning =
    awaitingResponse || !!streamingText || !!statusLog || sessionStatus === 'booting';

  // ── Build thread messages for assistant-ui ─────────────────────────────
  const activeStreamText = streamingText ?? backendStreamingText ?? '';

  const threadMessages: ThreadMessageLike[] = useMemo(() => {
    const result: ThreadMessageLike[] = messages.map(toThreadMessage);

    // Streaming text as the last message — may include a live activity suffix
    if (activeStreamText.trim()) {
      const parts: { type: 'text'; text: string }[] = [{ type: 'text', text: activeStreamText }];
      // Append live activity indicator when agent is doing tool work
      if (statusLog) {
        parts.push({ type: 'text', text: `*⏳ ${statusLog}*` });
      }
      result.push({ id: 'streaming', role: 'assistant', content: parts });
    } else if (statusLog) {
      // No streaming text yet but agent is actively working (tool calls, etc.)
      result.push({
        id: 'streaming',
        role: 'assistant',
        content: [{ type: 'text', text: `*⏳ ${statusLog}*` }],
      });
    } else if (awaitingResponse || sessionStatus === 'booting') {
      // Note: sendMutation.isPending is NOT included here — the 600ms
      // delay via startAwaiting() prevents flash on fast responses.
      result.push({
        id: 'streaming',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: sessionStatus === 'booting' ? '*Agent is waking up...*' : '*Thinking...*',
          },
        ],
      });
    }

    return result;
  }, [messages, activeStreamText, awaitingResponse, sessionStatus, statusLog]);

  // ── Status info for typing indicator ──────────────────────────────────
  const status: ChatStatus = useMemo(() => {
    if (!isRunning) return { isRunning: false, statusText: null };
    return { isRunning: true, statusText: statusLog };
  }, [isRunning, statusLog]);

  // ── onNew: called by assistant-ui when user submits ─────────────────────
  const onNew = useCallback(
    async (message: AppendMessage) => {
      const textPart = message.content.find((c) => c.type === 'text');
      if (textPart?.type !== 'text' || !textPart.text.trim()) return;
      const content = options?.contentTransform
        ? options.contentTransform(textPart.text)
        : textPart.text;
      sendMutation.mutate(content, {
        onSuccess: () => options?.onMessageSent?.(),
      });
    },
    [sendMutation, options]
  );

  // ── Clear chat ─────────────────────────────────────────────────────────
  const clearChat = useCallback(async () => {
    const res = await fetch(`/api/interactive/chat/${featureId}/messages`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to clear chat: ${res.status}`);
    setStreamingText('');

    setStatusLog(null);
    cancelAwaiting();
    void queryClient.invalidateQueries({ queryKey: chatQueryKey(featureId) });
  }, [featureId, queryClient, cancelAwaiting]);

  // ── Stop agent ────────────────────────────────────────────────────────
  const stopAgent = useCallback(async () => {
    const res = await fetch(`/api/interactive/chat/${featureId}/stop`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to stop agent: ${res.status}`);
    setStreamingText('');

    setStatusLog(null);
    cancelAwaiting();
    void queryClient.invalidateQueries({ queryKey: chatQueryKey(featureId) });
  }, [featureId, queryClient, cancelAwaiting]);

  // ── Build assistant-ui runtime ──────────────────────────────────────────
  const runtime = useExternalStoreRuntime({
    messages: threadMessages,
    convertMessage: useCallback((msg: ThreadMessageLike): ThreadMessageLike => msg, []),
    isRunning,
    onNew,
    onCancel: useCallback(async () => {
      setStreamingText('');

      setStatusLog(null);
      cancelAwaiting();
    }, [cancelAwaiting]),
  });

  return { runtime, status, clearChat, stopAgent, sessionInfo, isChatLoading };
}
