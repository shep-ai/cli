'use client';

import { useState } from 'react';
import {
  Code2,
  Terminal,
  FolderOpen,
  ChevronDown,
  Copy,
  Check,
  Loader2,
  CircleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { OpenActionMenuProps } from './config';

const COPY_FEEDBACK_DELAY = 2000;

export function OpenActionMenu({ actions, repositoryPath, showSpecs }: OpenActionMenuProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPath = () => {
    void navigator.clipboard.writeText(repositoryPath);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_DELAY);
  };

  const anyLoading = actions.ideLoading || actions.shellLoading || actions.specsLoading;
  const anyError = actions.ideError ?? actions.shellError ?? actions.specsError;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={anyLoading}>
          {anyLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : anyError ? (
            <CircleAlert className="text-destructive size-4" />
          ) : (
            <FolderOpen className="size-4" />
          )}
          Open
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Open in</DropdownMenuLabel>

        <DropdownMenuItem
          onClick={actions.openInIde}
          disabled={actions.ideLoading}
          className="gap-2"
        >
          {actions.ideLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : actions.ideError ? (
            <CircleAlert className="text-destructive size-4" />
          ) : (
            <Code2 className="size-4" />
          )}
          IDE
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={actions.openInShell}
          disabled={actions.shellLoading}
          className="gap-2"
        >
          {actions.shellLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : actions.shellError ? (
            <CircleAlert className="text-destructive size-4" />
          ) : (
            <Terminal className="size-4" />
          )}
          Terminal
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={actions.openSpecsFolder}
          disabled={actions.specsLoading || !showSpecs}
          className="gap-2"
        >
          {actions.specsLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : actions.specsError ? (
            <CircleAlert className="text-destructive size-4" />
          ) : (
            <FolderOpen className="size-4" />
          )}
          Specs Folder
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCopyPath} className="gap-2">
          {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
          {copied ? 'Copied!' : 'Copy path'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
