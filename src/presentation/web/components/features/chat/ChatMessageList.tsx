'use client';

import { useRef, useEffect, useState } from 'react';
import { MessageSquare, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import type { InteractiveMessage } from '@shepai/core/domain/generated/output';
import { InteractiveMessageRole } from '@shepai/core/domain/generated/output';
import { ChatMessageBubble } from './ChatMessageBubble';

export interface ChatMessageListProps {
  /** Persisted message history for this feature */
  messages: InteractiveMessage[];
  /**
   * Current streaming text buffer.
   * When non-null, an in-progress assistant bubble is shown at the bottom.
   */
  streamingContent: string | null;
  /** Whether the agent is thinking (waiting for first token) */
  isAgentThinking?: boolean;
  /** Activity log entries from tool use / thinking events */
  activityLog?: string[];
  /** Show a loading skeleton while the initial message history is fetching */
  isLoading?: boolean;
  /** Empty-state message shown when there are no messages and no session */
  emptyStateMessage?: string;
}

/**
 * Scrollable message list rendering all persisted messages plus an optional
 * in-progress streaming bubble at the bottom. Auto-scrolls to the newest
 * message whenever messages or streamingContent changes.
 */
export function ChatMessageList({
  messages,
  streamingContent,
  isAgentThinking = false,
  activityLog = [],
  isLoading = false,
  emptyStateMessage = 'No messages yet.',
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages or streaming content changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, streamingContent, isAgentThinking, activityLog.length]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div
              className="bg-muted h-10 animate-pulse rounded-2xl"
              style={{ width: `${40 + i * 15}%` }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0 && streamingContent === null && !isAgentThinking) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <MessageSquare className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">{emptyStateMessage}</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto p-4"
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.createdAt}
            streaming={false}
          />
        ))}

        {/* Thinking indicator with expandable activity log */}
        {isAgentThinking && streamingContent === null ? (
          <ThinkingIndicator activityLog={activityLog} />
        ) : null}

        {/* In-progress streaming message */}
        {streamingContent !== null && (
          <>
            {activityLog.length > 0 && <ActivityLogCollapsible entries={activityLog} />}
            <ChatMessageBubble
              role={InteractiveMessageRole.assistant}
              content={streamingContent}
              streaming={true}
            />
          </>
        )}

        {/* Invisible anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/** Animated thinking indicator with expandable activity log. */
function ThinkingIndicator({ activityLog }: { activityLog: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const latestEntry = activityLog.length > 0 ? activityLog[activityLog.length - 1] : null;

  return (
    <div className="flex w-full flex-col items-start" aria-label="Agent is thinking">
      <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:0ms]" />
            <span className="inline-block size-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:150ms]" />
            <span className="inline-block size-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:300ms]" />
          </div>
          {latestEntry ? (
            <span className="text-muted-foreground text-xs">{latestEntry}</span>
          ) : (
            <span className="text-muted-foreground text-xs">Thinking...</span>
          )}
        </div>

        {activityLog.length > 1 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground mt-1.5 flex items-center gap-1 text-[11px] transition-colors"
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            {activityLog.length} steps
          </button>
        )}

        {expanded && activityLog.length > 1 ? (
          <div className="border-muted-foreground/20 mt-2 border-t pt-2">
            {/* eslint-disable react/no-array-index-key -- stable append-only log */}
            {activityLog.map((entry, i) => (
              <div
                key={`${entry.slice(0, 20)}-${i}`}
                className="text-muted-foreground flex items-center gap-1.5 py-0.5 text-[11px]"
              >
                <Activity className="size-2.5 shrink-0 opacity-50" />
                <span>{entry}</span>
              </div>
            ))}
            {/* eslint-enable react/no-array-index-key */}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Collapsible activity log shown above streaming content. */
function ActivityLogCollapsible({ entries }: { entries: string[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex w-full justify-start">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-colors"
      >
        <Activity className="size-3 opacity-50" />
        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        {entries.length} agent actions
      </button>
      {expanded ? (
        <div className="bg-muted/50 ml-2 rounded-md px-3 py-2">
          {/* eslint-disable react/no-array-index-key -- stable append-only log */}
          {entries.map((entry, i) => (
            <div
              key={`${entry.slice(0, 20)}-${i}`}
              className="text-muted-foreground flex items-center gap-1.5 py-0.5 text-[11px]"
            >
              <Activity className="size-2.5 shrink-0 opacity-50" />
              <span>{entry}</span>
            </div>
          ))}
          {/* eslint-enable react/no-array-index-key */}
        </div>
      ) : null}
    </div>
  );
}
