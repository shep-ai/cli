'use client';

import { useRef, useState, useCallback } from 'react';
import { Github, Plus, TerminalSquare, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ControlCenterEmptyStateProps {
  onRepositorySelect?: (path: string) => void;
  className?: string;
}

const commands = ['cd ~/my-repo', 'shep feat new "create modern, sleek dashboards"'];

export function ControlCenterEmptyState({
  onRepositorySelect,
  className,
}: ControlCenterEmptyStateProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  function handlePickerClick() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      const folderPath = files[0].webkitRelativePath.split('/')[0];
      onRepositorySelect?.(folderPath);
    }
    e.target.value = '';
  }

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(commands.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div
      data-testid="control-center-empty-state"
      className={cn('relative h-full w-full', className)}
    >
      {/* Dotted grid background */}
      <div className="absolute inset-0 [background-image:radial-gradient(circle,_var(--color-border)_1px,_transparent_1px)] [background-size:24px_24px]" />

      {/* Page header */}
      <div className="absolute top-8 left-8 z-10">
        <h1 className="text-4xl font-bold tracking-tight">Features</h1>
        <p className="text-muted-foreground text-3xl font-light">Control Center</p>
      </div>

      {/* Centered content */}
      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="flex max-w-lg flex-col items-center gap-6">
          {/* Repositories label */}
          <div className="text-muted-foreground flex items-center gap-2">
            <Github className="h-4 w-4" />
            <span className="text-xs font-semibold tracking-widest uppercase">Repositories</span>
          </div>

          {/* Add Repository button */}
          <button
            type="button"
            data-testid="empty-state-add-repository"
            onClick={handlePickerClick}
            className="border-muted-foreground/30 hover:border-primary hover:text-primary flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-8 py-4 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">Add Repository</span>
          </button>

          <input
            ref={inputRef}
            type="file"
            data-testid="empty-state-repository-input"
            className="hidden"
            onChange={handleFileChange}
            /* @ts-expect-error -- webkitdirectory is non-standard but widely supported */
            webkitdirectory=""
          />

          {/* CLI divider */}
          <div className="text-muted-foreground flex items-center gap-3">
            <div className="bg-border h-px w-16" />
            <div className="flex items-center gap-1.5">
              <TerminalSquare className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold tracking-widest uppercase">
                Or start from the command line
              </span>
            </div>
            <div className="bg-border h-px w-16" />
          </div>

          {/* Code block */}
          <div
            data-testid="cli-code-block"
            className="relative w-full rounded-lg bg-zinc-900 px-5 py-4 font-mono text-sm text-zinc-100"
          >
            <button
              type="button"
              data-testid="cli-code-block-copy"
              onClick={handleCopy}
              className="absolute top-3 right-3 cursor-pointer rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Copy commands"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <div className="space-y-1">
              {commands.map((cmd) => (
                <div key={cmd}>
                  <span className="text-zinc-500 select-none">$ </span>
                  <span>{cmd}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hint */}
          <p className="text-muted-foreground text-sm">
            Feature will appear on canvas once created
          </p>
        </div>
      </div>
    </div>
  );
}
