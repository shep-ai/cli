'use client';

import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  FileSearch,
  GitBranch,
  GitCommitHorizontal,
  RotateCcw,
  ShieldCheck,
  Square,
  X,
  Zap,
} from 'lucide-react';
import { InlineAttachments } from '@/components/common/inline-attachments';
import { PrStatus } from '@shepai/core/domain/generated/output';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CiStatusBadge } from '@/components/common/ci-status-badge';
import { CometSpinner } from '@/components/ui/comet-spinner';
import { featureNodeStateConfig, lifecycleDisplayLabels } from '@/components/common/feature-node';
import type { FeatureNodeData } from '@/components/common/feature-node';
import {
  getAgentTypeIcon,
  agentTypeLabels,
} from '@/components/common/feature-node/agent-type-icons';
import { getModelMeta } from '@/lib/model-metadata';
import { formatDuration } from '@/lib/format-duration';
import { BranchSyncStatus } from './branch-sync-status';
import type { BranchSyncData } from '@/hooks/use-branch-sync-status';

export interface OverviewTabProps {
  data: FeatureNodeData;
  syncStatus?: BranchSyncData | null;
  syncLoading?: boolean;
  syncError?: string | null;
  onRefreshSync?: () => void;
  onRebaseOnMain?: () => void;
  rebaseLoading?: boolean;
  rebaseError?: string | null;
}

export function OverviewTab({
  data,
  syncStatus,
  syncLoading,
  syncError,
  onRefreshSync,
  onRebaseOnMain,
  rebaseLoading,
  rebaseError,
}: OverviewTabProps) {
  const isCompleted = data.lifecycle === 'maintain';
  return (
    <>
      <div data-testid="feature-drawer-status" className="flex flex-col gap-3 p-4">
        <div className="text-muted-foreground text-xs font-semibold tracking-wider">
          {lifecycleDisplayLabels[data.lifecycle]}
        </div>
        <div className="flex items-center gap-2">
          <FeatureStateBadge data={data} />
          {data.state === 'error' && data.onRetry ? (
            <button
              data-testid="feature-drawer-retry-button"
              onClick={() => data.onRetry!(data.featureId)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          ) : null}
          {(data.state === 'running' || data.state === 'action-required') && data.onStop ? (
            <button
              data-testid="feature-drawer-stop-button"
              onClick={() => data.onStop!(data.featureId)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          ) : null}
        </div>
        {!isCompleted && data.progress > 0 ? (
          <div data-testid="feature-drawer-progress" className="flex flex-col gap-1">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>Progress</span>
              <span>{data.progress}%</span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  featureNodeStateConfig[data.state].progressClass
                )}
                style={{ width: `${data.progress}%` }}
              />
            </div>
          </div>
        ) : null}
        {isCompleted && data.pr ? (
          <FeaturePrInfo pr={data.pr} hideCiStatus={data.hideCiStatus} />
        ) : null}
      </div>
      <FeatureInfo data={data} />
      {!isCompleted && data.pr ? (
        <>
          <Separator />
          <div className="p-4">
            <FeaturePrInfo pr={data.pr} hideCiStatus={data.hideCiStatus} />
          </div>
        </>
      ) : null}
      <FeatureDetails data={data} />
      {onRebaseOnMain && data.branch && onRefreshSync ? (
        <BranchSyncStatus
          syncStatus={syncStatus ?? null}
          syncLoading={syncLoading ?? false}
          syncError={syncError ?? null}
          onRefreshSync={onRefreshSync}
          onRebaseOnMain={onRebaseOnMain}
          rebaseLoading={rebaseLoading ?? false}
          rebaseError={rebaseError ?? null}
        />
      ) : null}
      <FeatureSettings data={data} />
    </>
  );
}

function FeatureStateBadge({ data }: { data: FeatureNodeData }) {
  const config = featureNodeStateConfig[data.state];
  const Icon = config.icon;
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
        config.badgeBgClass,
        config.badgeClass
      )}
    >
      {data.state === 'running' ? (
        <CometSpinner size="sm" className="shrink-0" />
      ) : (
        <Icon className="h-4 w-4 shrink-0" />
      )}
      <span>{config.label}</span>
    </div>
  );
}

// ── Feature Info section ─────────────────────────────────────────────

function formatRelativeTime(timestamp: string | number): string {
  const now = Date.now();
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diffMs = now - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 30) {
    return new Date(time).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  if (diffDay > 0) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  if (diffHr > 0) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffMin > 0) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  return 'just now';
}

function FeatureInfo({ data }: { data: FeatureNodeData }) {
  const showSummary =
    Boolean(data.summary) && !(data.userQuery && data.summary?.trim() === data.userQuery.trim());

  const hasInfo =
    Boolean(data.branch) ||
    Boolean(data.oneLiner) ||
    showSummary ||
    Boolean(data.userQuery) ||
    Boolean(data.createdAt);
  if (!hasInfo) return null;

  return (
    <>
      <Separator />
      <div data-testid="feature-drawer-info" className="flex flex-col gap-3 p-4">
        {data.branch ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs font-medium">Branch</span>
            <span className="flex items-center gap-1.5 text-sm">
              <GitBranch className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">{data.branch}</code>
              {data.baseBranch ? (
                <span className="text-muted-foreground text-xs">from {data.baseBranch}</span>
              ) : null}
            </span>
          </div>
        ) : null}
        {data.oneLiner ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs font-medium">One-Liner</span>
            <span className="text-sm leading-relaxed">{data.oneLiner}</span>
          </div>
        ) : null}
        {data.userQuery ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs font-medium">User Query</span>
            <InlineAttachments text={data.userQuery} />
          </div>
        ) : null}
        {showSummary ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs font-medium">Summary</span>
            <span className="text-sm leading-relaxed">{data.summary}</span>
          </div>
        ) : null}
        {data.createdAt ? (
          <DetailRow label="Created" value={formatRelativeTime(data.createdAt)} />
        ) : null}
      </div>
    </>
  );
}

// ── PR Info section ──────────────────────────────────────────────────

const prStatusStyles: Record<PrStatus, string> = {
  [PrStatus.Open]: 'border-transparent bg-blue-50 text-blue-700 hover:bg-blue-50',
  [PrStatus.Merged]: 'border-transparent bg-purple-50 text-purple-700 hover:bg-purple-50',
  [PrStatus.Closed]: 'border-transparent bg-red-50 text-red-700 hover:bg-red-50',
};

function FeaturePrInfo({
  pr,
  hideCiStatus,
}: {
  pr: NonNullable<FeatureNodeData['pr']>;
  hideCiStatus?: boolean;
}) {
  return (
    <div data-testid="feature-drawer-pr">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <a
            href={pr.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2"
          >
            PR #{pr.number}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Badge className={prStatusStyles[pr.status]}>{pr.status}</Badge>
        </div>
        {pr.ciStatus && hideCiStatus !== true ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">CI Status</span>
            <CiStatusBadge status={pr.ciStatus} />
          </div>
        ) : null}
        {pr.mergeable === false ? (
          <div data-testid="pr-merge-conflict" className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">Merge Status</span>
            <Badge className="border-transparent bg-orange-50 text-orange-700 hover:bg-orange-50">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
              Conflicts
            </Badge>
          </div>
        ) : null}
        {pr.commitHash ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">Commit</span>
            <div className="flex items-center gap-1.5">
              <GitCommitHorizontal className="text-muted-foreground h-3.5 w-3.5" />
              <code className="bg-muted text-foreground rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                {pr.commitHash.slice(0, 7)}
              </code>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Details section ──────────────────────────────────────────────────

/** Hook that returns a live-updating elapsed time string for running features. */
function useElapsedTime(startedAt?: number): string | null {
  const [elapsed, setElapsed] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(null);
      return;
    }
    // Compute immediately
    setElapsed(formatDuration(Math.max(0, Date.now() - startedAt)));
    // Tick every second
    intervalRef.current = setInterval(() => {
      setElapsed(formatDuration(Math.max(0, Date.now() - startedAt)));
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startedAt]);

  return elapsed;
}

function FeatureDetails({ data }: { data: FeatureNodeData }) {
  const isRunning = data.state === 'running' || data.state === 'action-required';
  const elapsedTime = useElapsedTime(isRunning ? data.startedAt : undefined);
  const hasAnyDetail =
    data.fastMode ??
    data.agentType ??
    data.runtime ??
    elapsedTime ??
    data.blockedBy ??
    data.errorMessage;
  if (!hasAnyDetail) return null;
  return (
    <>
      <Separator />
      <div data-testid="feature-drawer-details" className="flex flex-col gap-3 p-4">
        {data.fastMode ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs font-medium">Mode</span>
            <span className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 shrink-0 text-amber-500" />
              Fast Mode
            </span>
          </div>
        ) : null}
        {data.agentType ? <AgentDetailRow agentType={data.agentType} /> : null}
        {data.runtime ? <DetailRow label="Runtime" value={data.runtime} /> : null}
        {!data.runtime && elapsedTime ? (
          <DetailRow label="Running for" value={elapsedTime} />
        ) : null}
        {data.blockedBy ? <DetailRow label="Blocked by" value={data.blockedBy} /> : null}
        {data.errorMessage ? <DetailRow label="Error" value={data.errorMessage} /> : null}
      </div>
    </>
  );
}

function AgentDetailRow({ agentType }: { agentType: string }) {
  const Icon = getAgentTypeIcon(agentType);
  const label = agentTypeLabels[agentType as keyof typeof agentTypeLabels] ?? agentType;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs font-medium">Agent</span>
      <span className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </span>
    </div>
  );
}

// ── Settings section ─────────────────────────────────────────────────

function SettingBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
      )}
    >
      {enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
  );
}

function FeatureSettings({ data }: { data: FeatureNodeData }) {
  const hasSettings =
    data.approvalGates != null ||
    data.push != null ||
    data.openPr != null ||
    data.ciWatchEnabled != null ||
    data.enableEvidence != null ||
    data.modelId;
  if (!hasSettings) return null;

  return (
    <>
      <Separator />
      <div data-testid="feature-drawer-settings" className="flex flex-col gap-3 p-4">
        <span className="text-muted-foreground text-xs font-semibold tracking-wider">SETTINGS</span>
        {data.modelId ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs font-medium">Model</span>
            <span className="text-sm">
              {getModelMeta(data.modelId).displayName || data.modelId}
            </span>
          </div>
        ) : null}
        {data.approvalGates ? (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
              <ShieldCheck className="h-3 w-3" />
              Auto-Approve
            </span>
            <div className="flex flex-wrap gap-1.5">
              <SettingBadge enabled={data.approvalGates.allowPrd} label="PRD" />
              <SettingBadge enabled={data.approvalGates.allowPlan} label="Plan" />
              <SettingBadge enabled={data.approvalGates.allowMerge} label="Merge" />
            </div>
          </div>
        ) : null}
        {data.enableEvidence != null ? (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
              <FileSearch className="h-3 w-3" />
              Evidence
            </span>
            <div className="flex flex-wrap gap-1.5">
              <SettingBadge enabled={data.enableEvidence} label="Collect" />
              {data.commitEvidence != null ? (
                <SettingBadge enabled={data.commitEvidence} label="Add to PR" />
              ) : null}
            </div>
          </div>
        ) : null}
        {data.push != null || data.openPr != null || data.ciWatchEnabled != null ? (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
              <GitBranch className="h-3 w-3" />
              Git
            </span>
            <div className="flex flex-wrap gap-1.5">
              {data.push != null ? <SettingBadge enabled={data.push} label="Push" /> : null}
              {data.openPr != null ? <SettingBadge enabled={data.openPr} label="PR" /> : null}
              {data.ciWatchEnabled != null ? (
                <SettingBadge enabled={data.ciWatchEnabled} label="Watch" />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
