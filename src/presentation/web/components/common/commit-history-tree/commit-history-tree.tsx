'use client';

import { useState, useCallback } from 'react';
import { GitCommit, AlertCircle, GitBranch, Copy, Check, Loader2 } from 'lucide-react';
import type { CommitInfo } from '@/app/actions/get-repository-commits';

/* ---------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

export interface CommitHistoryTreeProps {
  commits: CommitInfo[] | null;
  loading: boolean;
  error: string | null;
  currentBranch: string;
  defaultBranch: string;
  /** Currently selected branch in the tree view */
  activeBranch: string;
  /** Called when the user switches between branches */
  onBranchChange: (branch: string) => void;
}

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

function formatRelativeDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) return 'just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

/** Generate a deterministic color from a string (e.g. author email). */
function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 45%)`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Parse refs into branch and tag labels, stripping remote prefixes. */
function parseRefs(refs: string[]): { branches: string[]; tags: string[] } {
  const branches: string[] = [];
  const tags: string[] = [];
  for (const ref of refs) {
    if (ref.startsWith('tag: ')) {
      tags.push(ref.slice(5));
    } else if (ref.startsWith('HEAD -> ')) {
      branches.push(ref.slice(8));
    } else if (!ref.startsWith('origin/') && !ref.startsWith('upstream/')) {
      branches.push(ref);
    }
  }
  return { branches, tags };
}

/* ---------------------------------------------------------------------------
 * Sub-components
 * ------------------------------------------------------------------------- */

function AuthorAvatar({ name, email }: { name: string; email: string }) {
  const initials = getInitials(name || email || '?');
  const color = getAvatarColor(email || name);
  return (
    <span
      title={name || email}
      style={{ backgroundColor: color }}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
    >
      {initials}
    </span>
  );
}

function RefBadge({ label, variant }: { label: string; variant: 'branch' | 'tag' | 'head' }) {
  const classes =
    variant === 'head'
      ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
      : variant === 'branch'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium ${classes}`}
    >
      {variant !== 'tag' && <GitBranch className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

function CopyHashButton({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [hash]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy full commit hash"
      className="text-muted-foreground/40 hover:text-muted-foreground ml-0.5 opacity-0 transition-opacity group-hover/commit:opacity-100"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function BranchSelector({
  currentBranch,
  defaultBranch,
  activeBranch,
  onBranchChange,
}: {
  currentBranch: string;
  defaultBranch: string;
  activeBranch: string;
  onBranchChange: (branch: string) => void;
}) {
  const branches = Array.from(new Set([currentBranch, defaultBranch].filter(Boolean)));

  if (branches.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 px-4 py-2">
      {branches.map((branch) => (
        <button
          key={branch}
          type="button"
          onClick={() => onBranchChange(branch)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            activeBranch === branch
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <GitBranch className="h-3 w-3" />
          {branch}
          {branch === currentBranch && branch === activeBranch && (
            <span className="bg-primary/20 text-primary rounded px-1 text-[9px]">current</span>
          )}
          {branch === defaultBranch && (
            <span className="bg-muted text-muted-foreground rounded px-1 text-[9px]">default</span>
          )}
        </button>
      ))}
    </div>
  );
}

function CommitRow({ commit, isLast }: { commit: CommitInfo; isLast: boolean }) {
  const { branches, tags } = parseRefs(commit.refs);
  const headRef = commit.refs.find((r) => r.startsWith('HEAD -> '));
  const headBranch = headRef ? headRef.slice(8) : null;

  return (
    <div className="group/commit relative flex gap-3 px-4 py-2">
      {/* Tree line */}
      <div className="relative flex flex-col items-center">
        <div className="bg-primary relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-sm dark:border-gray-900" />
        {!isLast && (
          <div className="bg-border/60 mt-0.5 w-px flex-1" style={{ minHeight: '16px' }} />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-1">
        {/* Refs row */}
        {headBranch || branches.length > 0 || tags.length > 0 ? (
          <div className="mb-1 flex flex-wrap gap-1">
            {headBranch ? <RefBadge label={headBranch} variant="head" /> : null}
            {branches
              .filter((b) => b !== headBranch)
              .map((b) => (
                <RefBadge key={b} label={b} variant="branch" />
              ))}
            {tags.map((t) => (
              <RefBadge key={t} label={t} variant="tag" />
            ))}
          </div>
        ) : null}

        {/* Subject */}
        <p className="text-foreground/90 truncate text-sm leading-snug" title={commit.subject}>
          {commit.subject}
        </p>

        {/* Meta row */}
        <div className="mt-1 flex items-center gap-2">
          <AuthorAvatar name={commit.authorName} email={commit.authorEmail} />
          <span className="text-muted-foreground min-w-0 truncate text-xs">
            {commit.authorName || commit.authorEmail}
          </span>
          <span className="text-muted-foreground/60 shrink-0 font-mono text-xs">
            {commit.shortHash}
          </span>
          <CopyHashButton hash={commit.hash} />
          <span className="text-muted-foreground/50 ml-auto shrink-0 text-xs tabular-nums">
            {formatRelativeDate(commit.date)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Main component
 * ------------------------------------------------------------------------- */

export function CommitHistoryTree({
  commits,
  loading,
  error,
  currentBranch,
  defaultBranch,
  activeBranch,
  onBranchChange,
}: CommitHistoryTreeProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-600">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!commits || commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8">
        <GitCommit className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">No commits found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <BranchSelector
        currentBranch={currentBranch}
        defaultBranch={defaultBranch}
        activeBranch={activeBranch}
        onBranchChange={onBranchChange}
      />
      <div className="flex flex-col">
        {commits.map((commit, index) => (
          <CommitRow key={commit.hash} commit={commit} isLast={index === commits.length - 1} />
        ))}
      </div>
    </div>
  );
}
