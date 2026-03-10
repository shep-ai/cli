'use client';

import {
  ExternalLink,
  AlertTriangle,
  FileDiff,
  GitCommitHorizontal,
  GitBranch,
  ArrowRight,
  Camera,
  FileText,
  MonitorPlay,
  Terminal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CiStatusBadge } from '@/components/common/ci-status-badge';
import { DrawerActionBar } from '@/components/common/drawer-action-bar';
import { DiffView } from './diff-view';
import type {
  MergeReviewProps,
  MergeReviewEvidence,
} from './merge-review-config';

const EVIDENCE_ICONS: Record<MergeReviewEvidence['type'], typeof Camera> = {
  Screenshot: Camera,
  Video: MonitorPlay,
  TestOutput: FileText,
  TerminalRecording: Terminal,
};

function EvidenceList({ evidence }: { evidence: MergeReviewEvidence[] }) {
  return (
    <div className="border-border rounded-lg border">
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <Camera className="text-muted-foreground h-4 w-4" />
          <span className="text-foreground text-xs font-semibold">Evidences</span>
          <Badge variant="secondary" className="text-[10px]">
            {evidence.length}
          </Badge>
        </div>
        <ul className="space-y-2">
          {evidence.map((e) => {
            const Icon = EVIDENCE_ICONS[e.type] ?? Camera;
            return (
              <li key={`${e.type}-${e.relativePath}`} className="flex items-start gap-2.5">
                <Icon className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0">
                  <span className="text-foreground text-xs font-medium">{e.description}</span>
                  {e.taskRef ? (
                    <span className="text-muted-foreground ml-1.5 text-[10px]">({e.taskRef})</span>
                  ) : null}
                  <p className="text-muted-foreground mt-0.5 truncate font-mono text-[10px]">
                    {e.relativePath}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
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
  chatInput,
  onChatInputChange,
}: MergeReviewProps) {
  const { pr, diffSummary, fileDiffs, branch, warning, evidence } = data;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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

        {/* Evidence */}
        {evidence && evidence.length > 0 ? <EvidenceList evidence={evidence} /> : null}

        {/* File diffs */}
        {fileDiffs && fileDiffs.length > 0 ? <DiffView fileDiffs={fileDiffs} /> : null}
      </div>

      <DrawerActionBar
        onReject={onReject}
        onApprove={onApprove}
        approveLabel="Approve Merge"
        revisionPlaceholder="Ask AI to revise before merging..."
        isProcessing={isProcessing}
        isRejecting={isRejecting}
        chatInput={chatInput}
        onChatInputChange={onChatInputChange}
      />
    </div>
  );
}
