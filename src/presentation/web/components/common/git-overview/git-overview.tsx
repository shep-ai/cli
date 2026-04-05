'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Archive,
  Check,
  ChevronDown,
  FileCheck2,
  FileEdit,
  FilePlus,
  GitBranch,
  GitCommitHorizontal,
  Globe,
  Loader2,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGitRepoInfo } from '@/app/actions/get-git-log';
import type { GitRepoInfo, GitFileEntry } from '@/app/actions/get-git-log';

// ── Primitives ──────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
  extra,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="px-3 pt-4 pb-1">
      <div className="text-foreground mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-wider uppercase">
        <Icon className="size-4 opacity-50" />
        {title}
        {extra ? <span className="ml-auto">{extra}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-muted/60 rounded-md border border-transparent p-3', className)}>
      {children}
    </div>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-foreground/40 text-[11px] font-medium tracking-wider uppercase">
        {label}
      </span>
      <span className="text-sm leading-snug">{children}</span>
    </div>
  );
}

const fileStatusColor: Record<GitFileEntry['status'], string> = {
  staged: 'text-green-600 dark:text-green-400',
  modified: 'text-amber-600 dark:text-amber-400',
  untracked: 'text-foreground/40',
};

const fileStatusIcon: Record<
  GitFileEntry['status'],
  React.ComponentType<{ className?: string }>
> = {
  staged: FileCheck2,
  modified: FileEdit,
  untracked: FilePlus,
};

// ── Main ────────────────────────────────────────────────────────────

export interface GitOverviewProps {
  /** Path to run git commands in (repo root or worktree) */
  gitPath: string;
  /** Optional error message to display */
  error?: string | null;
  /**
   * 'repo' — full view: limited commits, collapsible branches, file lists
   * 'feature' — no branches list, mark source branch in tree
   */
  mode?: 'repo' | 'feature';
  /** Source branch name to mark in commit tree (feature mode) */
  sourceBranch?: string;
}

export function GitOverview({ gitPath, error, mode = 'repo', sourceBranch }: GitOverviewProps) {
  const [repoInfo, setRepoInfo] = useState<GitRepoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [branchesExpanded, setBranchesExpanded] = useState(false);

  const commitLimit = mode === 'repo' ? 3 : 8;

  useEffect(() => {
    if (!gitPath) return;
    setLoading(true);
    getGitRepoInfo(gitPath, commitLimit).then((result) => {
      setRepoInfo(result);
      setLoading(false);
    });
  }, [gitPath, commitLimit]);

  if (!gitPath) return null;

  const wt = repoInfo?.workingTree;
  const isDirty = wt && (wt.staged > 0 || wt.modified > 0 || wt.untracked > 0);
  const ds = repoInfo?.diffStats;

  return (
    <div className="pb-4">
      {loading ? (
        <div className="text-foreground/40 flex items-center gap-2 px-4 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" /> Loading git info...
        </div>
      ) : null}

      {repoInfo ? (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 px-3 pt-3">
            <Card>
              <KV label="Branch">
                <span className="inline-flex items-center gap-1.5">
                  <GitBranch className="text-foreground/30 size-3.5 shrink-0" />
                  <code className="font-mono text-sm">{repoInfo.currentBranch || '—'}</code>
                </span>
                {sourceBranch ? (
                  <span className="text-foreground/40 mt-0.5 block text-xs">
                    from {sourceBranch}
                  </span>
                ) : null}
              </KV>
            </Card>

            <Card>
              <KV label="Working Tree">
                {isDirty ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {wt.staged > 0 ? (
                      <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                        <FileCheck2 className="size-3.5" /> {wt.staged} staged
                      </span>
                    ) : null}
                    {wt.modified > 0 ? (
                      <span className="inline-flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                        <FileEdit className="size-3.5" /> {wt.modified} modified
                      </span>
                    ) : null}
                    {wt.untracked > 0 ? (
                      <span className="text-foreground/50 inline-flex items-center gap-1 text-sm">
                        <FilePlus className="size-3.5" /> {wt.untracked} untracked
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                    <Check className="size-3.5" /> Clean
                  </span>
                )}
              </KV>
            </Card>

            {ds ? (
              <Card>
                <KV label="Uncommitted Changes">
                  <div className="flex items-center gap-3 text-sm">
                    <span>
                      {ds.filesChanged} file{ds.filesChanged !== 1 ? 's' : ''}
                    </span>
                    <span className="text-green-600 dark:text-green-400">+{ds.insertions}</span>
                    <span className="text-red-500 dark:text-red-400">-{ds.deletions}</span>
                  </div>
                </KV>
              </Card>
            ) : null}

            {repoInfo.remotes.length > 0 ? (
              <Card>
                <KV label="Remote">
                  {repoInfo.remotes.map((r) => (
                    <span key={r.name} className="inline-flex items-center gap-1.5 text-sm">
                      <Globe className="text-foreground/30 size-3.5 shrink-0" />
                      <span className="truncate">
                        {r.url
                          .replace(/\.git$/, '')
                          .replace(/^https?:\/\/([^@]+@)?/, '')
                          .replace(/x-access-token:[^@]+@/, '')}
                      </span>
                    </span>
                  ))}
                </KV>
              </Card>
            ) : null}

            {repoInfo.stashCount > 0 ? (
              <Card>
                <KV label="Stashes">
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <Archive className="text-foreground/30 size-3.5 shrink-0" />
                    {repoInfo.stashCount} stash{repoInfo.stashCount !== 1 ? 'es' : ''}
                  </span>
                </KV>
              </Card>
            ) : null}

            {repoInfo.tags.length > 0 ? (
              <Card>
                <KV label="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {repoInfo.tags.map((t) => (
                      <span
                        key={t}
                        className="bg-foreground/[0.04] inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs"
                      >
                        <Tag className="text-foreground/30 size-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                </KV>
              </Card>
            ) : null}
          </div>

          {/* Commit history */}
          {repoInfo.commits.length > 0 ? (
            <Section icon={GitCommitHorizontal} title="Recent Commits">
              <div className="relative ml-3">
                <div className="bg-border absolute top-2 bottom-2 left-[5px] w-px" />
                {repoInfo.commits.map((c, i) => (
                  <div key={c.hash} className="group relative flex gap-3 py-1.5">
                    <div
                      className={cn(
                        'relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full border-2',
                        i === 0
                          ? 'border-primary bg-primary'
                          : 'border-border bg-background group-hover:border-foreground/30'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="min-w-0 truncate text-sm leading-snug">{c.subject}</p>
                        <code className="text-foreground/30 shrink-0 font-mono text-[11px]">
                          {c.shortHash}
                        </code>
                      </div>
                      <div className="text-foreground/40 mt-0.5 flex items-center gap-2 text-xs">
                        <span>{c.author}</span>
                        <span>·</span>
                        <span>{c.relativeDate}</span>
                        {c.branch ? (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-0.5">
                              <GitBranch className="size-3" />
                              {c.branch}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                {/* Source branch marker (feature mode) */}
                {mode === 'feature' && sourceBranch ? (
                  <div className="relative flex gap-3 py-1.5">
                    <div className="relative z-10 mt-1.5 size-[11px] shrink-0 rounded-sm border-2 border-blue-500 bg-blue-500" />
                    <span className="text-foreground/40 text-xs">
                      branched from{' '}
                      <code className="font-mono text-[11px] text-blue-500">{sourceBranch}</code>
                    </span>
                  </div>
                ) : null}
              </div>
            </Section>
          ) : null}

          {/* File list — repo mode */}
          {mode === 'repo' && wt && wt.files.length > 0 ? (
            <FileListSection files={wt.files} />
          ) : null}

          {/* Branches — repo mode only */}
          {mode === 'repo' && repoInfo.branches.length > 1 ? (
            <BranchesSection
              branches={repoInfo.branches}
              expanded={branchesExpanded}
              onToggle={() => setBranchesExpanded(!branchesExpanded)}
            />
          ) : null}
        </>
      ) : null}

      {error ? (
        <Section icon={AlertTriangle} title="Issues">
          <Card className="bg-destructive/5 border-transparent">
            <p className="text-destructive text-sm">{error}</p>
          </Card>
        </Section>
      ) : null}
    </div>
  );
}

// ── File list ───────────────────────────────────────────────────────

function FileListSection({ files }: { files: GitFileEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const staged = files.filter((f) => f.status === 'staged');
  const modified = files.filter((f) => f.status === 'modified');
  const untracked = files.filter((f) => f.status === 'untracked');
  const previewLimit = 8;
  const totalFiles = files.length;
  const showToggle = totalFiles > previewLimit;

  return (
    <Section icon={FileEdit} title={`Changed Files (${totalFiles})`}>
      <div className="flex flex-col gap-2">
        {staged.length > 0 ? (
          <FileGroup label="Staged" files={staged} expanded={expanded} limit={previewLimit} />
        ) : null}
        {modified.length > 0 ? (
          <FileGroup label="Modified" files={modified} expanded={expanded} limit={previewLimit} />
        ) : null}
        {untracked.length > 0 ? (
          <FileGroup label="Untracked" files={untracked} expanded={expanded} limit={previewLimit} />
        ) : null}
        {showToggle ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-foreground/40 hover:bg-foreground/5 hover:text-foreground/60 flex items-center gap-1 self-start rounded px-2 py-1 text-xs"
          >
            <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
            {expanded ? 'Show less' : `Show all ${totalFiles} files`}
          </button>
        ) : null}
      </div>
    </Section>
  );
}

function FileGroup({
  label,
  files,
  expanded,
  limit,
}: {
  label: string;
  files: GitFileEntry[];
  expanded: boolean;
  limit: number;
}) {
  const visible = expanded ? files : files.slice(0, limit);
  const status = files[0]?.status ?? 'modified';
  const color = fileStatusColor[status];
  const Icon = fileStatusIcon[status];

  return (
    <div>
      <div className="text-foreground/40 mb-1 flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
        <Icon className={cn('size-3', color)} />
        {label} ({files.length})
      </div>
      <div className="flex flex-col">
        {visible.map((f) => (
          <div
            key={`${f.status}-${f.path}`}
            className="hover:bg-foreground/[0.03] flex items-center gap-2 rounded px-2 py-0.5"
          >
            <code className={cn('w-5 shrink-0 text-center font-mono text-[10px]', color)}>
              {f.code.trim()}
            </code>
            <span className="min-w-0 truncate font-mono text-xs">{f.path}</span>
          </div>
        ))}
        {!expanded && files.length > limit ? (
          <span className="text-foreground/30 px-2 py-0.5 text-[11px]">
            +{files.length - limit} more
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ── Branches (repo mode) ────────────────────────────────────────────

function BranchesSection({
  branches,
  expanded,
  onToggle,
}: {
  branches: GitRepoInfo['branches'];
  expanded: boolean;
  onToggle: () => void;
}) {
  const sorted = [...branches].sort((a, b) => {
    const isDefault = (n: string) => /^(main|master)$/.test(n);
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    if (isDefault(a.name) && !isDefault(b.name)) return -1;
    if (!isDefault(a.name) && isDefault(b.name)) return 1;
    return 0;
  });

  const previewCount = 4;
  const visible = expanded ? sorted : sorted.slice(0, previewCount);
  const hasMore = sorted.length > previewCount;

  return (
    <Section icon={GitBranch} title={`Branches (${sorted.length})`}>
      <div className="flex flex-col">
        {visible.map((b) => (
          <div
            key={b.name}
            className={cn(
              'flex items-center justify-between rounded px-2 py-1.5',
              b.isCurrent && 'bg-muted/60'
            )}
          >
            <span className="inline-flex items-center gap-1.5 text-sm">
              {b.isCurrent ? (
                <span className="size-2 shrink-0 rounded-full bg-green-500" />
              ) : /^(main|master)$/.test(b.name) ? (
                <span className="size-2 shrink-0 rounded-full bg-blue-500" />
              ) : (
                <span className="bg-foreground/10 size-2 shrink-0 rounded-full" />
              )}
              <code className="font-mono text-[13px]">{b.name}</code>
              {b.isCurrent ? <span className="text-foreground/40 text-[10px]">current</span> : null}
            </span>
            <span className="text-foreground/40 text-xs">{b.lastCommitDate}</span>
          </div>
        ))}
        {hasMore ? (
          <button
            type="button"
            onClick={onToggle}
            className="text-foreground/40 hover:bg-foreground/5 hover:text-foreground/60 flex items-center gap-1 self-start rounded px-2 py-1 text-xs"
          >
            <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
            {expanded ? 'Show less' : `Show all ${sorted.length} branches`}
          </button>
        ) : null}
      </div>
    </Section>
  );
}
