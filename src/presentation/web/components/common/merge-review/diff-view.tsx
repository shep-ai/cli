'use client';

import { useState } from 'react';
import { ChevronRight, FileText, FilePlus, FileMinus, FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MergeReviewFileDiff, MergeReviewDiffHunk } from './merge-review-config';

const STATUS_CONFIG = {
  added: { icon: FilePlus, label: 'A', className: 'text-green-600' },
  modified: { icon: FileEdit, label: 'M', className: 'text-amber-600' },
  deleted: { icon: FileMinus, label: 'D', className: 'text-red-600' },
  renamed: { icon: FileEdit, label: 'R', className: 'text-blue-600' },
} as const;

function FileStatusIcon({ status }: { status: MergeReviewFileDiff['status'] }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return <Icon className={cn('h-3.5 w-3.5 shrink-0', config.className)} />;
}

function HunkView({ hunk }: { hunk: MergeReviewDiffHunk }) {
  return (
    <div className="border-border border-t first:border-t-0">
      <div className="bg-muted/50 text-muted-foreground px-3 py-1 font-mono text-[10px]">
        {hunk.header}
      </div>
      <div className="font-mono text-[11px] leading-[18px]">
        {hunk.lines.map((line) => (
          <div
            key={`${line.type}-${line.oldNumber ?? ''}-${line.newNumber ?? ''}`}
            className={cn(
              'flex',
              line.type === 'added' && 'bg-green-50 dark:bg-green-950/30',
              line.type === 'removed' && 'bg-red-50 dark:bg-red-950/30'
            )}
          >
            <span className="text-muted-foreground w-10 shrink-0 px-1 text-right text-[10px] select-none">
              {line.oldNumber ?? ''}
            </span>
            <span className="text-muted-foreground w-10 shrink-0 px-1 text-right text-[10px] select-none">
              {line.newNumber ?? ''}
            </span>
            <span
              className={cn(
                'w-4 shrink-0 text-center select-none',
                line.type === 'added' && 'text-green-700 dark:text-green-400',
                line.type === 'removed' && 'text-red-700 dark:text-red-400'
              )}
            >
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </span>
            <span className="min-w-0 flex-1 pr-2 break-all whitespace-pre-wrap">
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileDiffItem({ file }: { file: MergeReviewFileDiff }) {
  const [isOpen, setIsOpen] = useState(false);

  const fileName = file.path.split('/').pop() ?? file.path;
  const dirPath = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '';

  return (
    <div className="border-border border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <ChevronRight
          className={cn(
            'text-muted-foreground h-3 w-3 shrink-0 transition-transform duration-150',
            isOpen && 'rotate-90'
          )}
        />
        <FileStatusIcon status={file.status} />
        <span className="text-foreground min-w-0 flex-1 truncate text-xs">
          {dirPath ? (
            <>
              <span className="text-muted-foreground">{dirPath}/</span>
              {fileName}
            </>
          ) : (
            fileName
          )}
        </span>
        {file.oldPath ? (
          <span className="text-muted-foreground truncate text-[10px]">
            &larr; {file.oldPath.split('/').pop()}
          </span>
        ) : null}
        <span className="shrink-0 text-[10px]">
          {file.additions > 0 ? <span className="text-green-600">+{file.additions}</span> : null}
          {file.additions > 0 && file.deletions > 0 ? ' ' : null}
          {file.deletions > 0 ? <span className="text-red-600">-{file.deletions}</span> : null}
        </span>
      </button>
      {isOpen && file.hunks.length > 0 ? (
        <div className="border-border overflow-x-auto border-t">
          {file.hunks.map((hunk) => (
            <HunkView key={hunk.header} hunk={hunk} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export interface DiffViewProps {
  fileDiffs: MergeReviewFileDiff[];
}

export function DiffView({ fileDiffs }: DiffViewProps) {
  if (fileDiffs.length === 0) return null;

  return (
    <div className="border-border rounded-lg border">
      <div className="px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <FileText className="text-muted-foreground h-4 w-4" />
          <span className="text-foreground text-xs font-semibold">Changed Files</span>
          <span className="text-muted-foreground text-[10px]">({fileDiffs.length})</span>
        </div>
      </div>
      <div className="border-border border-t">
        {fileDiffs.map((file) => (
          <FileDiffItem key={`${file.status}-${file.path}`} file={file} />
        ))}
      </div>
    </div>
  );
}
