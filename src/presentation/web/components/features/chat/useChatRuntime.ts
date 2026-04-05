'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ThreadMessageLike, AppendMessage } from '@assistant-ui/react';
import { useExternalStoreRuntime } from '@assistant-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InteractiveMessage } from '@shepai/core/domain/generated/output';
import { InteractiveMessageRole } from '@shepai/core/domain/generated/output';

/** Shape matching UserInteractionData from the agent executor interface. */
export interface InteractionData {
  toolCallId: string;
  questions: {
    question: string;
    header: string;
    options: { label: string; description: string; preview?: string }[];
    multiSelect: boolean;
  }[];
}

/** Chat state returned by the backend — matches ChatState from service interface */
interface ChatState {
  messages: InteractiveMessage[];
  sessionStatus: string | null;
  streamingText: string | null;
  sessionInfo: SessionInfo | null;
  turnStatus?: string;
  pendingInteraction?: InteractionData | null;
}

interface SessionInfo {
  pid: number | null;
  sessionId: string | null;
  model: string | null;
  startedAt: string;
  idleTimeoutMinutes: number;
  lastActivityAt: string;
  totalCostUsd: number | null;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
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
  worktreePath: string,
  model?: string,
  agentType?: string
): Promise<InteractiveMessage> {
  const res = await fetch(`/api/interactive/chat/${featureId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, worktreePath, model, agentType }),
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
  /** Override model for new sessions (e.g. 'claude-sonnet-4-6'). */
  model?: string;
  /** Override agent type for new sessions (e.g. 'claude-code'). */
  agentType?: string;
  /** When true, inject debug bubbles showing SSE events, session info, etc. */
  debugMode?: boolean;
}

/** A debug event captured from SSE for display in debug mode. */
export interface DebugEvent {
  id: string;
  timestamp: Date;
  label: string;
  detail?: string;
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

  // Keep a ref to the latest model/agent so the mutation closure always
  // reads the current value without depending on stale captures.
  const modelRef = useRef(options?.model);
  const agentTypeRef = useRef(options?.agentType);
  modelRef.current = options?.model;
  agentTypeRef.current = options?.agentType;

  // ── Debug events (dev mode only) ────────────────────────────────────────
  const debugModeRef = useRef(options?.debugMode ?? false);
  debugModeRef.current = options?.debugMode ?? false;
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);

  const pushDebug = useCallback((label: string, detail?: string) => {
    if (!debugModeRef.current) return;
    setDebugEvents((prev) => [
      ...prev,
      { id: `dbg-${Date.now()}-${Math.random()}`, timestamp: new Date(), label, detail },
    ]);
  }, []);

  // ── TanStack Query: fetch messages from backend ─────────────────────────
  const { data: chatState, isLoading: isChatLoading } = useQuery({
    queryKey: chatQueryKey(featureId),
    queryFn: () => fetchChatState(featureId),
    refetchInterval: 3000, // Fallback polling every 3s
  });

  // Auto-mark as read when chat tab is open and turn status is 'unread'
  useEffect(() => {
    if (chatState?.turnStatus === 'unread') {
      void fetch(`/api/interactive/chat/${featureId}/mark-read`, { method: 'POST' });
    }
  }, [chatState?.turnStatus, featureId]);

  const messages = useMemo(() => chatState?.messages ?? [], [chatState?.messages]);
  const sessionStatus = chatState?.sessionStatus ?? null;

  // Track session status changes for debug
  const prevSessionStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (sessionStatus && sessionStatus !== prevSessionStatusRef.current) {
      const info = chatState?.sessionInfo;
      const detail = info
        ? `model=${info.model ?? '?'}, sid=${info.sessionId?.slice(0, 8) ?? '?'}`
        : undefined;
      pushDebug(`session_${sessionStatus}`, detail);
    }
    prevSessionStatusRef.current = sessionStatus;
  }, [sessionStatus, chatState?.sessionInfo, pushDebug]);
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

  // ── Interaction state (AskUserQuestion) ─────────────────────────────
  const [pendingInteraction, setPendingInteraction] = useState<InteractionData | null>(null);

  // Sync pending interaction from backend polling (fallback for missed SSE)
  useEffect(() => {
    const backendInteraction = chatState?.pendingInteraction ?? null;
    if (backendInteraction) {
      setPendingInteraction(backendInteraction);
    } else if (!backendInteraction && pendingInteraction) {
      // Backend cleared it (e.g. agent continued) — clear local state
      setPendingInteraction(null);
    }
  }, [chatState?.pendingInteraction, pendingInteraction]);

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

    es.addEventListener('activity', (event: MessageEvent) => {
      cancelAwaiting();
      try {
        const data = JSON.parse(event.data as string) as {
          activity?: { kind: string; label: string; detail?: string };
        };
        if (data.activity) {
          pushDebug(`[${data.activity.kind}] ${data.activity.label}`, data.activity.detail);
        }
      } catch {
        // Ignore
      }
      // Tool events are already persisted to DB — just refetch to show them
      void queryClient.invalidateQueries({ queryKey: chatQueryKey(featureId) });
    });

    es.addEventListener('log', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as { log: string };
        if (data.log) {
          cancelAwaiting();
          setStatusLog(data.log);
          pushDebug('log', data.log);
        }
      } catch {
        // Ignore
      }
    });

    es.addEventListener('interaction', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as { interaction: InteractionData };
        if (data.interaction) {
          cancelAwaiting();
          setPendingInteraction(data.interaction);
        }
      } catch {
        // Ignore
      }
    });

    es.addEventListener('done', () => {
      setStatusLog(null);
      cancelAwaiting();
      pushDebug('turn_done');
      // Agent turn completed — clear any lingering interaction state
      setPendingInteraction(null);
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
  }, [featureId, queryClient, cancelAwaiting, pushDebug]);

  // ── Mutation: send user message ─────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      postMessage(featureId, content, worktreePath ?? '', modelRef.current, agentTypeRef.current),
    onMutate: async (content: string) => {
      pushDebug(
        'send_message',
        `model=${modelRef.current ?? 'default'}, agent=${agentTypeRef.current ?? 'default'}, len=${content.length}`
      );
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
    const chatMessages: ThreadMessageLike[] = messages.map(toThreadMessage);

    // Merge debug bubbles into the timeline by timestamp
    let result: ThreadMessageLike[];
    if (options?.debugMode && debugEvents.length > 0) {
      const debugMessages: ThreadMessageLike[] = debugEvents.map((evt) => ({
        id: evt.id,
        role: 'assistant' as const,
        content: [
          {
            type: 'text' as const,
            text: evt.detail ? `🔧 **${evt.label}** — ${evt.detail}` : `🔧 **${evt.label}**`,
          },
        ],
        createdAt: evt.timestamp,
      }));
      // Merge both arrays (both already sorted by time) into one sorted list
      result = [];
      let ci = 0;
      let di = 0;
      while (ci < chatMessages.length && di < debugMessages.length) {
        const chatTime = chatMessages[ci].createdAt
          ? new Date(chatMessages[ci].createdAt as unknown as string).getTime()
          : 0;
        const dbgTime = debugMessages[di].createdAt
          ? new Date(debugMessages[di].createdAt as unknown as string).getTime()
          : 0;
        if (chatTime <= dbgTime) {
          result.push(chatMessages[ci++]);
        } else {
          result.push(debugMessages[di++]);
        }
      }
      while (ci < chatMessages.length) result.push(chatMessages[ci++]);
      while (di < debugMessages.length) result.push(debugMessages[di++]);
    } else {
      result = chatMessages;
    }

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
  }, [
    messages,
    activeStreamText,
    awaitingResponse,
    sessionStatus,
    statusLog,
    options?.debugMode,
    debugEvents,
  ]);

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
    setDebugEvents([]);
    setStatusLog(null);
    cancelAwaiting();
    setPendingInteraction(null);
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

  // ── Respond to interaction (AskUserQuestion) ───────────────────────────
  const respondToInteraction = useCallback(
    async (answers: Record<string, string>) => {
      // Clear the bubble and status log immediately — answers are persisted as
      // a user message by the backend, shown in conversation history on refetch.
      setPendingInteraction(null);
      setStatusLog(null);

      try {
        const res = await fetch(`/api/interactive/chat/${featureId}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers }),
        });
        if (!res.ok) {
          // eslint-disable-next-line no-console
          console.error(`[respondToInteraction] failed: ${res.status}`);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[respondToInteraction] error:', err);
      }

      // Refetch to show the persisted user message with answers
      void queryClient.invalidateQueries({ queryKey: chatQueryKey(featureId) });
    },
    [featureId, queryClient]
  );

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

  return {
    runtime,
    status,
    clearChat,
    stopAgent,
    sessionInfo,
    isChatLoading,
    pendingInteraction,
    respondToInteraction,
  };
}
