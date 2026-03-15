'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  History,
  Copy,
  ExternalLink,
  Terminal,
  MessageSquare,
  Clock,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SessionSummary {
  id: string;
  preview: string | null;
  messageCount: number;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
  createdAt: string | null;
  projectPath: string;
}

interface FeatureSessionsDropdownProps {
  repositoryPath: string;
  className?: string;
}

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const PREVIEW_COUNT = 3;

function isSessionActive(session: SessionSummary): boolean {
  if (!session.lastMessageAt) return false;
  return Date.now() - new Date(session.lastMessageAt).getTime() < ACTIVE_THRESHOLD_MS;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function truncatePreview(preview: string | null, maxLength = 45): string {
  if (!preview) return 'No preview';
  if (preview.length <= maxLength) return preview;
  return `${preview.slice(0, maxLength)}...`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/** Stop both click and pointerDown from reaching React Flow's node selection handler */
function stopNodeEvent(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function FeatureSessionsDropdown({
  repositoryPath,
  className,
}: FeatureSessionsDropdownProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [hasActiveSessions, setHasActiveSessions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const prevPathRef = useRef(repositoryPath);

  // Reset when path changes
  useEffect(() => {
    if (prevPathRef.current !== repositoryPath) {
      prevPathRef.current = repositoryPath;
      setSessions([]);
      setFetched(false);
      setHasActiveSessions(false);
      setExpanded(false);
    }
  }, [repositoryPath]);

  // Lightweight probe on mount: fetch only the most recent session to check if active.
  // This is fast (parses 1 file) and gives us the green indicator without loading all sessions.
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ repositoryPath, limit: '1' });
    fetch(`/api/sessions?${params.toString()}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ sessions: SessionSummary[] }>) : null))
      .then((data) => {
        if (!cancelled && data?.sessions?.length) {
          setHasActiveSessions(data.sessions.some(isSessionActive));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [repositoryPath]);

  // Full fetch lazily on dropdown open — avoids N concurrent heavy requests on mount
  const doFetch = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ repositoryPath, limit: '10' });
      const res = await fetch(`/api/sessions?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { sessions: SessionSummary[] };
        setSessions(data.sessions);
        setHasActiveSessions(data.sessions.some(isSessionActive));
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [repositoryPath, fetched]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) void doFetch();
    },
    [doFetch]
  );

  const visibleSessions = expanded ? sessions : sessions.slice(0, PREVIEW_COUNT);
  const hasMore = sessions.length > PREVIEW_COUNT;

  return (
    <DropdownMenu modal={false} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="View sessions"
                data-testid="feature-node-sessions-button"
                className={cn(
                  'nodrag relative flex h-5 w-5 cursor-pointer items-center justify-center rounded text-xs transition-colors',
                  hasActiveSessions
                    ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  className
                )}
                onClick={stopNodeEvent}
                onPointerDown={stopNodeEvent}
              >
                <History className="h-3 w-3" />
                {hasActiveSessions ? (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                ) : null}
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {hasActiveSessions ? 'Sessions (active)' : 'Sessions'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent
        align="start"
        side="bottom"
        className="w-72"
        onClick={stopNodeEvent}
        onPointerDown={stopNodeEvent}
      >
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
          <History className="h-3 w-3" />
          Agent Sessions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-muted-foreground py-4 text-center text-xs">No sessions found</div>
        ) : (
          <>
            {visibleSessions.map((session) => {
              const active = isSessionActive(session);
              return (
                <DropdownMenuSub key={session.id}>
                  <DropdownMenuSubTrigger className="flex flex-col items-start gap-1 py-2">
                    <div className="flex w-full items-center gap-1.5">
                      {active ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate text-xs">
                        {truncatePreview(session.preview)}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex w-full items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="h-2.5 w-2.5" />
                        {session.messageCount}
                      </span>
                      {session.firstMessageAt ? (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(session.firstMessageAt).toLocaleDateString()}
                        </span>
                      ) : null}
                      {session.lastMessageAt ? (
                        <span
                          className={cn(
                            'ml-auto shrink-0',
                            active ? 'font-medium text-emerald-600' : ''
                          )}
                        >
                          {formatRelativeTime(session.lastMessageAt)}
                        </span>
                      ) : null}
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent onClick={stopNodeEvent} onPointerDown={stopNodeEvent}>
                      <DropdownMenuItem
                        className="gap-2 text-xs"
                        onClick={() =>
                          void copyToClipboard(
                            `claude --resume ${session.id} --project ${repositoryPath}`
                          )
                        }
                      >
                        <Terminal className="h-3 w-3" />
                        Copy resume command
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2 text-xs"
                        onClick={() => void copyToClipboard(session.id)}
                      >
                        <Copy className="h-3 w-3" />
                        Copy session ID
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2 text-xs"
                        onClick={() => {
                          const vscodeUri = `vscode://file${repositoryPath}`;
                          window.open(vscodeUri, '_blank');
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open in IDE
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              );
            })}

            {hasMore ? (
              <DropdownMenuItem
                className="text-muted-foreground justify-center gap-1 py-1.5 text-[10px]"
                onClick={(e) => {
                  e.preventDefault();
                  setExpanded((v) => !v);
                }}
              >
                <ChevronDown
                  className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')}
                />
                {expanded ? 'Show less' : `Show ${sessions.length - PREVIEW_COUNT} more`}
              </DropdownMenuItem>
            ) : null}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
