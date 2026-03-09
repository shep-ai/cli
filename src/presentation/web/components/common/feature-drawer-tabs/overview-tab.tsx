'use client';

import { ExternalLink, GitBranch, GitCommitHorizontal } from 'lucide-react';
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

export interface OverviewTabProps {
  data: FeatureNodeData;
}

export function OverviewTab({ data }: OverviewTabProps) {
  return (
    <>
      <div data-testid="feature-drawer-status" className="flex flex-col gap-3 p-4">
        <div className="text-muted-foreground text-xs font-semibold tracking-wider">
          {lifecycleDisplayLabels[data.lifecycle]}
        </div>
        <FeatureStateBadge data={data} />
        {data.progress > 0 ? (
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
      </div>
      <FeatureInfo data={data} />
      {data.pr ? (
        <>
          <Separator />
          <FeaturePrInfo pr={data.pr} />
        </>
      ) : null}
      <FeatureDetails data={data} />
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
  const hasInfo =
    Boolean(data.branch) ||
    Boolean(data.oneLiner) ||
    Boolean(data.summary) ||
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
            <span className="text-sm leading-relaxed">{data.userQuery}</span>
          </div>
        ) : null}
        {data.summary ? (
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

function FeaturePrInfo({ pr }: { pr: NonNullable<FeatureNodeData['pr']> }) {
  return (
    <div data-testid="feature-drawer-pr" className="border-border mx-4 rounded-lg border">
      <div className="space-y-3 px-4 py-3">
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
        {pr.ciStatus ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">CI Status</span>
            <CiStatusBadge status={pr.ciStatus} />
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

function FeatureDetails({ data }: { data: FeatureNodeData }) {
  const hasAnyDetail = data.agentType ?? data.runtime ?? data.blockedBy ?? data.errorMessage;
  if (!hasAnyDetail) return null;
  return (
    <>
      <Separator />
      <div data-testid="feature-drawer-details" className="flex flex-col gap-3 p-4">
        {data.agentType ? <AgentDetailRow agentType={data.agentType} /> : null}
        {data.runtime ? <DetailRow label="Runtime" value={data.runtime} /> : null}
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
