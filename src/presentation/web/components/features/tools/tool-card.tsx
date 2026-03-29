'use client';

import { useState, useTransition } from 'react';
import {
  Loader2,
  Rocket,
  Download,
  Monitor,
  Terminal,
  GitBranch,
  CircleX,
  Circle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ToolDetailDrawer } from './tool-detail-drawer';
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
  terminal: { label: 'Terminal', icon: Terminal },
};

export function ToolCard({ tool, onRefresh, className }: ToolCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autoStartInstall, setAutoStartInstall] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isInstalled = tool.status.status === 'available';
  const isError = tool.status.status === 'error';
  const canLaunch = isInstalled && Boolean(tool.openDirectory);

  function handleLaunch(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      await fetch(`/api/tools/${tool.id}/launch`, { method: 'POST' });
    });
  }

  function handleCardClick() {
    setAutoStartInstall(false);
    setDrawerOpen(true);
  }

  function handleInstallClick(e: React.MouseEvent) {
    e.stopPropagation();
    setAutoStartInstall(tool.autoInstall);
    setDrawerOpen(true);
  }

  return (
    <>
      <div
        data-testid="tool-card"
        onClick={handleCardClick}
        className={cn(
          'bg-card group flex h-30 w-full cursor-pointer flex-col rounded-lg border p-3 transition-shadow hover:shadow-md',
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
                  className="text-muted-foreground/70 inline-flex items-center gap-0.5 text-[9px]"
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
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Installed
              </span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                <Circle className="h-3 w-3" />
                Not installed
              </span>
            )}
            {tool.required ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                      Required
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    This tool is required for Shep to function properly
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {isInstalled && canLaunch ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleLaunch}
                disabled={isPending}
                aria-label={`Launch ${tool.name}`}
                data-testid="tool-card-launch-button"
                className="h-7 cursor-pointer rounded-md px-3 text-xs"
              >
                {isPending ? (
                  <Loader2 className="me-1 h-3 w-3 animate-spin" />
                ) : (
                  <Rocket className="me-1 h-3 w-3" />
                )}
                Launch
              </Button>
            ) : !isInstalled && !isError ? (
              <Button
                size="sm"
                variant="default"
                onClick={handleInstallClick}
                aria-label={`Install ${tool.name}`}
                data-testid="tool-card-install-button"
                className="h-7 cursor-pointer rounded-md px-3 text-xs"
              >
                <Download className="me-1 h-3 w-3" />
                Install
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <ToolDetailDrawer
        tool={tool}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefresh={onRefresh}
        autoStart={autoStartInstall}
      />
    </>
  );
}
