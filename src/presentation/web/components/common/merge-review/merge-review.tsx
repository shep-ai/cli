'use client';

import {
  ExternalLink,
  GitMerge,
  Loader2,
  AlertTriangle,
  FileDiff,
  GitCommitHorizontal,
  GitBranch,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CiStatusBadge } from '@/components/common/ci-status-badge';
import { DrawerActionBar } from '@/components/common/drawer-action-bar';
import type { MergeReviewProps, MergeReviewPhase } from './merge-review-config';

function PhaseList({ phases }: { phases: MergeReviewPhase[] }) {
  return (
    <div className="border-border rounded-lg border">
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <Layers className="text-muted-foreground h-4 w-4" />
          <span className="text-foreground text-xs font-semibold">Implementation Phases</span>
        </div>
        <ol className="space-y-2">
          {phases.map((phase, i) => (
            <li key={phase.id} className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                {i + 1}
              </span>
              <div className="min-w-0">
                <span className="text-foreground text-xs font-medium">{phase.name}</span>
                {phase.description ? (
                  <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                    {phase.description}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function MergeReview({
  data,
  onApprove,
  onReject,
  isProcessing = false,
  isRejecting = false,
}: MergeReviewProps) {
  const { pr, diffSummary, phases, branch, warning } = data;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
          <div className="flex-1">
            <h2 className="text-foreground text-sm font-bold">Merge Review</h2>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {pr
                ? 'Review the pull request details and approve to merge.'
                : 'Review the changes and approve to merge.'}
            </p>
          </div>
        </div>

        {/* Branch merge direction (GitHub-like) */}
        {branch ? (
          <div className="border-border rounded-lg border">
            <div className="flex items-center gap-2 px-4 py-3">
              <GitBranch className="text-muted-foreground h-4 w-4 shrink-0" />
              <Badge variant="secondary" className="font-mono text-[11px]">
                {branch.source}
              </Badge>
              <ArrowRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <Badge variant="outline" className="font-mono text-[11px]">
                {branch.target}
              </Badge>
            </div>
          </div>
        ) : null}

        {/* PR metadata card */}
        {pr ? (
          <div className="border-border rounded-lg border">
            <div className="space-y-3 px-4 py-3">
              {/* PR number + link */}
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
                <Badge variant="outline" className="text-xs">
                  {pr.status}
                </Badge>
              </div>

              {/* CI status */}
              {pr.ciStatus ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">CI Status</span>
                  <CiStatusBadge status={pr.ciStatus} />
                </div>
              ) : null}

              {/* Commit hash */}
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
        ) : null}

        {/* Diff summary */}
        {diffSummary ? (
          <div className="border-border rounded-lg border">
            <div className="px-4 py-3">
              <div className="mb-3 flex items-center gap-2">
                <FileDiff className="text-muted-foreground h-4 w-4" />
                <span className="text-foreground text-xs font-semibold">Changes</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-foreground text-sm font-bold">
                    {diffSummary.filesChanged}
                  </div>
                  <div className="text-muted-foreground text-[10px]">files</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-green-600">+{diffSummary.additions}</div>
                  <div className="text-muted-foreground text-[10px]">additions</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-red-600">-{diffSummary.deletions}</div>
                  <div className="text-muted-foreground text-[10px]">deletions</div>
                </div>
                <div className="text-center">
                  <div className="text-foreground text-sm font-bold">{diffSummary.commitCount}</div>
                  <div className="text-muted-foreground text-[10px]">commits</div>
                </div>
              </div>
            </div>
          </div>
        ) : warning ? (
          <div className="border-border rounded-lg border">
            <div className="flex items-center gap-2 px-4 py-3">
              <AlertTriangle className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="text-muted-foreground text-xs">{warning}</span>
            </div>
          </div>
        ) : null}

        {/* Implementation phases */}
        {phases && phases.length > 0 ? <PhaseList phases={phases} /> : null}
      </div>

      <DrawerActionBar
        onReject={onReject}
        onApprove={onApprove}
        approveLabel="Approve Merge"
        approveIcon={
          isProcessing ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <GitMerge className="mr-1.5 h-4 w-4" />
          )
        }
        revisionPlaceholder="Ask AI to revise before merging..."
        rejectDialogTitle="Reject Merge"
        isProcessing={isProcessing}
        isRejecting={isRejecting}
      />
    </div>
  );
}
