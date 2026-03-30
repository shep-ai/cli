'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  History,
  Copy,
  ExternalLink,
  Terminal,
  MessageSquare,
  Clock,
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
import { useSessionsContext } from '@/hooks/sessions-provider';

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
  /** When true, also scan worktree session directories (used by repo nodes). */
  includeWorktrees?: boolean;
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
  const { t } = useTranslation('web');
  const [expanded, setExpanded] = useState(false);

  // Read sessions from the centralized SessionsProvider context.
  // Sessions are batch-fetched every 30s — no per-instance HTTP calls.
  const { getSessionsForPath, hasActiveSessions: hasActiveForPath } = useSessionsContext();
  const sessions = getSessionsForPath(repositoryPath);
  const active = hasActiveForPath(repositoryPath);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) setExpanded(false);
  }, []);

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
                aria-label={t('featureNode.viewSessions')}
                data-testid="feature-node-sessions-button"
                className={cn(
                  'nodrag relative flex h-5 cursor-pointer items-center gap-0.5 rounded px-0.5 text-[10px] transition-colors',
                  'text-muted-foreground hover:text-foreground hover:bg-muted',
                  className
                )}
                onClick={stopNodeEvent}
                onPointerDown={stopNodeEvent}
              >
                <History className="h-3 w-3 shrink-0" />
                {sessions.length > 0 ? (
                  <span data-testid="feature-node-sessions-count">{sessions.length}</span>
                ) : null}
                {active ? (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                ) : null}
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            {active ? t('featureNode.sessionsActive') : t('featureNode.sessions')}
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
          {t('featureNode.agentSessions')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {sessions.length === 0 ? (
          <div className="text-muted-foreground py-4 text-center text-xs">
            {t('featureNode.noSessionsFound')}
          </div>
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
                {expanded
                  ? t('featureNode.showLess')
                  : t('featureNode.showMore', { count: sessions.length - PREVIEW_COUNT })}
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
  const sessionActive = isSessionActive(session);
  const AgentIcon = getAgentTypeIcon(session.agentType);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-start gap-2 py-2 pe-2">
        {/* Agent icon with optional active indicator */}
        <div className="relative mt-0.5 shrink-0">
          <AgentIcon className="h-4 w-4" />
          {sessionActive ? (
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
                className={cn(
                  'ml-auto shrink-0',
                  sessionActive ? 'font-medium text-emerald-600' : ''
                )}
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
