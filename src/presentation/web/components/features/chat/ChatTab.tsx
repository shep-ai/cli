'use client';

import { useMemo } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { Trash2, Square, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Thread } from '@/components/assistant-ui/thread';
import { useChatRuntime } from './useChatRuntime';

export interface ChatTabProps {
  featureId: string;
  worktreePath?: string;
}

export function ChatTab({ featureId, worktreePath }: ChatTabProps) {
  const { runtime, status, clearChat, stopAgent, sessionInfo, isChatLoading } = useChatRuntime(
    featureId,
    worktreePath
  );

  const statusBar = (
    <ChatStatusBar
      sessionInfo={sessionInfo}
      isAgentActive={status.isRunning}
      statusText={status.statusText}
      onClear={clearChat}
      onStop={stopAgent}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        {isChatLoading ? (
          <ChatSkeleton />
        ) : (
          <AssistantRuntimeProvider runtime={runtime}>
            <Thread statusBar={statusBar} />
          </AssistantRuntimeProvider>
        )}
      </div>
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────

function ChatSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 p-4 pt-6">
      {/* Assistant message skeleton */}
      <div className="flex items-start gap-2.5">
        <div className="bg-muted h-6 w-6 animate-pulse rounded-full" />
        <div className="flex flex-col gap-1.5">
          <div className="bg-muted h-4 w-48 animate-pulse rounded-lg" />
          <div className="bg-muted h-4 w-72 animate-pulse rounded-lg" />
          <div className="bg-muted h-4 w-36 animate-pulse rounded-lg" />
        </div>
      </div>
      {/* User message skeleton */}
      <div className="flex items-start gap-2.5">
        <div className="bg-muted h-6 w-6 animate-pulse rounded-full" />
        <div className="bg-muted h-4 w-32 animate-pulse rounded-lg" />
      </div>
      {/* Assistant message skeleton */}
      <div className="flex items-start gap-2.5">
        <div className="bg-muted h-6 w-6 animate-pulse rounded-full" />
        <div className="flex flex-col gap-1.5">
          <div className="bg-muted h-4 w-56 animate-pulse rounded-lg" />
          <div className="bg-muted h-4 w-64 animate-pulse rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ── Session info types ──────────────────────────────────────────────────────

interface SessionInfo {
  pid: number | null;
  sessionId: string | null;
  model: string | null;
  startedAt: string;
  idleTimeoutMinutes: number;
  lastActivityAt: string;
}

// ── Status bar (below thread, above prompt) ─────────────────────────────────

function ChatStatusBar({
  sessionInfo,
  isAgentActive,
  statusText,
  onClear,
  onStop,
}: {
  sessionInfo: SessionInfo | null;
  isAgentActive: boolean;
  statusText: string | null;
  onClear: () => Promise<void>;
  onStop: () => Promise<void>;
}) {
  return (
    <div className="flex h-10 shrink-0 items-center border-t px-3">
      {/* Left — session info + activity indicator */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {sessionInfo ? (
          <SessionBadge info={sessionInfo} />
        ) : (
          <span className="text-muted-foreground/50 text-xs">No active session</span>
        )}
        {isAgentActive ? (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-muted-foreground truncate text-xs">
              {statusText ?? 'Working...'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1.5">
        {sessionInfo ? (
          <ToolbarButton
            onClick={() => {
              void onStop();
            }}
            title="Force stop agent process"
            variant="danger"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span>Stop</span>
          </ToolbarButton>
        ) : null}
        <ToolbarButton
          onClick={() => {
            void onClear();
          }}
          title="Clear chat history"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear</span>
        </ToolbarButton>
      </div>
    </div>
  );
}

// ── Session badge ───────────────────────────────────────────────────────────

function SessionBadge({ info }: { info: SessionInfo }) {
  const uptime = useUptime(info.startedAt);
  const sleepsIn = useSleepsIn(info.lastActivityAt, info.idleTimeoutMinutes);

  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <Cpu className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      <div className="flex items-center gap-1.5 overflow-hidden text-xs">
        {info.model ? (
          <span className="text-foreground/70 truncate font-medium">{info.model}</span>
        ) : null}
        {info.pid ? (
          <Chip title={`PID ${info.pid}${info.sessionId ? ` · Session ${info.sessionId}` : ''}`}>
            pid {info.pid}
          </Chip>
        ) : null}
        <Chip>{uptime}</Chip>
        <Chip title={`Auto-sleep after ${info.idleTimeoutMinutes}m idle`}>sleep {sleepsIn}</Chip>
      </div>
    </div>
  );
}

function Chip({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap"
    >
      {children}
    </span>
  );
}

// ── Time hooks ──────────────────────────────────────────────────────────────

function useUptime(startedAt: string): string {
  return useMemo(() => formatDuration(Date.now() - new Date(startedAt).getTime()), [startedAt]);
}

function useSleepsIn(lastActivityAt: string, timeoutMinutes: number): string {
  return useMemo(() => {
    const elapsed = Date.now() - new Date(lastActivityAt).getTime();
    const remaining = timeoutMinutes * 60_000 - elapsed;
    if (remaining <= 0) return 'soon';
    return formatDuration(remaining);
  }, [lastActivityAt, timeoutMinutes]);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

// ── Toolbar button ──────────────────────────────────────────────────────────

function ToolbarButton({
  children,
  onClick,
  title,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  variant?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
        variant === 'danger'
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  );
}
