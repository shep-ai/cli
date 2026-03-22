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
  Sparkles,
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
import { getAgentTypeIcon } from '@/components/common/feature-node/agent-type-icons';

export interface SessionSummary {
  id: string;
  agentType?: string;
  preview: string | null;
  messageCount: number;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
  createdAt: string | null;
  projectPath: string;
  /** Absolute path to the session conversation file (e.g. JSONL) */
  filePath?: string;
}

interface FeatureSessionsDropdownProps {
  repositoryPath: string;
  className?: string;
  /** Callback to create a feature from a session. Only shown on repo nodes. */
  onCreateFromSession?: (session: SessionSummary, sessionFilePath: string) => void;
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

function truncatePreview(preview: string | null, maxLength = 40): string {
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
  onCreateFromSession,
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

  // Fetch sessions on mount. Fast because we only scan the matching project directory.
  // Populates count badge + active indicator, and pre-loads the dropdown.
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ repositoryPath, limit: '10' });
    fetch(`/api/sessions?${params.toString()}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ sessions: SessionSummary[] }>) : null))
      .then((data) => {
        if (!cancelled && data?.sessions) {
          setSessions(data.sessions);
          setHasActiveSessions(data.sessions.some(isSessionActive));
          setFetched(true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [repositoryPath]);

  // Re-fetch on dropdown open if not already loaded (e.g. path changed)
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
                  'nodrag relative flex h-5 cursor-pointer items-center gap-0.5 rounded px-0.5 text-[10px] transition-colors',
                  hasActiveSessions
                    ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  className
                )}
                onClick={stopNodeEvent}
                onPointerDown={stopNodeEvent}
              >
                <History className="h-3 w-3 shrink-0" />
                {sessions.length > 0 ? (
                  <span data-testid="feature-node-sessions-count">{sessions.length}</span>
                ) : null}
                {hasActiveSessions ? (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                ) : null}
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            {hasActiveSessions ? 'Sessions (active)' : 'Sessions'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent
        align="start"
        side="bottom"
        className="w-80"
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
            {visibleSessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                repositoryPath={repositoryPath}
                onCreateFromSession={onCreateFromSession}
              />
            ))}

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

// ── Session row component ─────────────────────────────────────────────

function SessionRow({
  session,
  repositoryPath,
  onCreateFromSession,
}: {
  session: SessionSummary;
  repositoryPath: string;
  onCreateFromSession?: (session: SessionSummary, sessionFilePath: string) => void;
}) {
  const active = isSessionActive(session);
  const AgentIcon = getAgentTypeIcon(session.agentType);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-start gap-2 py-2 pr-2">
        {/* Agent icon with optional active indicator */}
        <div className="relative mt-0.5 shrink-0">
          <AgentIcon className="h-4 w-4" />
          {active ? (
            <span className="border-background absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border bg-emerald-500" />
          ) : null}
        </div>

        {/* Content area */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Preview text */}
          <span className="truncate text-xs leading-tight">{truncatePreview(session.preview)}</span>

          {/* Metadata row */}
          <div className="text-muted-foreground flex items-center gap-2 text-[10px] leading-tight">
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
                className={cn('ml-auto shrink-0', active ? 'font-medium text-emerald-600' : '')}
              >
                {formatRelativeTime(session.lastMessageAt)}
              </span>
            ) : null}
          </div>
        </div>
      </DropdownMenuSubTrigger>

      <DropdownMenuPortal>
        <DropdownMenuSubContent onClick={stopNodeEvent} onPointerDown={stopNodeEvent}>
          <DropdownMenuItem
            className="gap-2 text-xs"
            onClick={() =>
              void copyToClipboard(`claude --resume ${session.id} --project ${repositoryPath}`)
            }
          >
            <Terminal className="h-3.5 w-3.5" />
            Copy resume command
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 text-xs"
            onClick={() => void copyToClipboard(session.id)}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy session ID
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 text-xs"
            onClick={() => {
              const vscodeUri = `vscode://file${repositoryPath}`;
              window.open(vscodeUri, '_blank');
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in IDE
          </DropdownMenuItem>
          {onCreateFromSession && session.filePath ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-xs font-medium text-violet-700 focus:bg-violet-50 focus:text-violet-800"
                onClick={() => onCreateFromSession(session, session.filePath!)}
              >
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                Create feature from session
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
