'use client';

import { useState } from 'react';
import {
  Code2,
  Terminal,
  FolderOpen,
  FileText,
  Copy,
  Check,
  Loader2,
  CircleAlert,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { OpenActionMenuProps } from './config';

const COPY_FEEDBACK_DELAY = 2000;

const tbBtn =
  'text-muted-foreground hover:bg-foreground/8 hover:text-foreground inline-flex size-8 items-center justify-center rounded-[3px] disabled:opacity-40';

function TbIcon({
  loading,
  error,
  icon: Icon,
}: {
  loading?: boolean;
  error?: string | null;
  icon: React.ComponentType<{ className?: string }>;
}) {
  if (loading) return <Loader2 className="size-3.5 animate-spin" />;
  if (error) return <CircleAlert className="text-destructive size-3.5" />;
  return <Icon className="size-4" />;
}

export function OpenActionMenu({
  actions,
  repositoryPath,
  worktreePath,
  showSpecs,
}: OpenActionMenuProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPath = () => {
    void navigator.clipboard.writeText(worktreePath ?? repositoryPath);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_DELAY);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={tbBtn}
              onClick={actions.openInIde}
              disabled={actions.ideLoading}
              aria-label="Open in IDE"
            >
              <TbIcon loading={actions.ideLoading} error={actions.ideError} icon={Code2} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Open in IDE
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={tbBtn}
              onClick={actions.openInShell}
              disabled={actions.shellLoading}
              aria-label="Open terminal"
            >
              <TbIcon loading={actions.shellLoading} error={actions.shellError} icon={Terminal} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Open terminal
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={tbBtn}
              onClick={actions.openFolder}
              disabled={actions.folderLoading}
              aria-label="Open folder"
            >
              <TbIcon
                loading={actions.folderLoading}
                error={actions.folderError}
                icon={FolderOpen}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Open folder
          </TooltipContent>
        </Tooltip>

        {showSpecs ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={tbBtn}
                onClick={actions.openSpecsFolder}
                disabled={actions.specsLoading}
                aria-label="Open specs"
              >
                <TbIcon loading={actions.specsLoading} error={actions.specsError} icon={FileText} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Open specs
            </TooltipContent>
          </Tooltip>
        ) : null}

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={tbBtn} onClick={handleCopyPath} aria-label="Copy path">
              {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {copied ? 'Copied!' : 'Copy path'}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
