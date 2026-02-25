'use client';

import { useState, useTransition } from 'react';
import {
  ExternalLink,
  Loader2,
  Rocket,
  Download,
  Monitor,
  Terminal,
  GitBranch,
  CircleX,
  Check,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InstallInstructions } from './install-instructions';
import type { ToolItem } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

export interface ToolCardProps {
  tool: ToolItem;
  onRefresh?: () => Promise<void>;
  className?: string;
}

const TAG_CONFIG: Record<string, { label: string; icon: typeof Monitor }> = {
  ide: { label: 'IDE', icon: Monitor },
  'cli-agent': { label: 'CLI Agent', icon: Terminal },
  vcs: { label: 'VCS', icon: GitBranch },
};

export function ToolCard({ tool, onRefresh, className }: ToolCardProps) {
  const [installDrawerOpen, setInstallDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isInstalled = tool.status.status === 'available';
  const isError = tool.status.status === 'error';
  const canLaunch = isInstalled && Boolean(tool.openDirectory);

  function handleLaunch() {
    startTransition(async () => {
      await fetch(`/api/tools/${tool.id}/launch`, { method: 'POST' });
    });
  }

  function handleAutoInstall() {
    startTransition(async () => {
      const res = await fetch(`/api/tools/${tool.id}/install`, { method: 'POST' });
      if (res.ok && onRefresh) {
        await onRefresh();
      }
    });
  }

  return (
    <>
      <div
        data-testid="tool-card"
        className={cn(
          'bg-card group flex h-30 w-full flex-col rounded-lg border p-3 shadow-sm transition-shadow hover:shadow-md',
          className
        )}
      >
        {/* Top row: icon + name left, tag badges right */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {tool.iconUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={tool.iconUrl}
                alt=""
                width={20}
                height={20}
                className="shrink-0 dark:invert"
              />
            ) : (
              <Package className="text-muted-foreground h-5 w-5 shrink-0" />
            )}
            <h3 data-testid="tool-card-name" className="truncate text-sm font-bold">
              {tool.name}
            </h3>
          </div>
          <div data-testid="tool-card-tags" className="flex shrink-0 items-center gap-1">
            {tool.tags.map((tag) => {
              const config = TAG_CONFIG[tag] ?? { label: tag, icon: Monitor };
              const TagIcon = config.icon;
              return (
                <span
                  key={tag}
                  className="bg-muted text-muted-foreground inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium"
                >
                  <TagIcon className="h-2.5 w-2.5" />
                  {config.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <p data-testid="tool-card-summary" className="text-muted-foreground mt-1 truncate text-xs">
          {tool.summary}
        </p>

        {/* Bottom section — pushed to bottom */}
        <div className="mt-auto flex items-center justify-between pt-3">
          {/* Status text */}
          <div className="flex items-center gap-2">
            {isError && tool.status.status === 'error' ? (
              <span
                className="flex items-center gap-1 truncate text-[10px] text-red-600 dark:text-red-400"
                title={tool.status.errorMessage}
              >
                <CircleX className="h-3 w-3 shrink-0" />
                {tool.status.errorMessage ?? 'Error'}
              </span>
            ) : isInstalled ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" />
                Installed
              </span>
            ) : (
              <span className="text-muted-foreground text-[10px]">Not installed</span>
            )}
            {tool.required ? (
              <span className="text-muted-foreground text-[10px] italic">Required</span>
            ) : null}
          </div>

          {/* Action button */}
          {isInstalled && canLaunch ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLaunch}
              disabled={isPending}
              aria-label={`Launch ${tool.name}`}
              data-testid="tool-card-launch-button"
              className="hover:bg-primary hover:text-primary-foreground h-7 cursor-pointer rounded-md px-3 text-xs"
            >
              {isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Rocket className="mr-1 h-3 w-3" />
              )}
              Launch
            </Button>
          ) : !isInstalled && !isError && tool.autoInstall ? (
            <Button
              size="sm"
              onClick={handleAutoInstall}
              disabled={isPending}
              aria-label={`Install ${tool.name}`}
              data-testid="tool-card-install-button"
              className="h-7 cursor-pointer rounded-md px-3 text-xs"
            >
              {isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Download className="mr-1 h-3 w-3" />
              )}
              {isPending ? 'Installing…' : 'Install'}
            </Button>
          ) : !isInstalled && !isError ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInstallDrawerOpen(true)}
              aria-label={`View install instructions for ${tool.name}`}
              data-testid="tool-card-manual-install-button"
              className="h-7 cursor-pointer rounded-md px-3 text-xs"
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Install
            </Button>
          ) : null}
        </div>
      </div>

      <InstallInstructions
        tool={tool}
        open={installDrawerOpen}
        onOpenChange={setInstallDrawerOpen}
      />
    </>
  );
}
