'use client';

import { ExternalLink, GitCommitHorizontal } from 'lucide-react';
import { PrStatus } from '@shepai/core/domain/generated/output';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CiStatusBadge } from '@/components/common/ci-status-badge';
import { CometSpinner } from '@/components/ui/comet-spinner';
import { featureNodeStateConfig, lifecycleDisplayLabels } from '@/components/common/feature-node';
import type { FeatureNodeData } from '@/components/common/feature-node';

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

function FeatureDetails({ data }: { data: FeatureNodeData }) {
  const hasAnyDetail = data.agentType ?? data.runtime ?? data.blockedBy ?? data.errorMessage;
  if (!hasAnyDetail) return null;
  return (
    <>
      <Separator />
      <div data-testid="feature-drawer-details" className="flex flex-col gap-3 p-4">
        {data.agentType ? <DetailRow label="Agent" value={data.agentType} /> : null}
        {data.runtime ? <DetailRow label="Runtime" value={data.runtime} /> : null}
        {data.blockedBy ? <DetailRow label="Blocked by" value={data.blockedBy} /> : null}
        {data.errorMessage ? <DetailRow label="Error" value={data.errorMessage} /> : null}
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
