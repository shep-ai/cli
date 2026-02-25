'use client';

import { useState, useTransition } from 'react';
import { ExternalLink, Loader2, Rocket, Download } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InstallInstructions } from './install-instructions';
import type { ToolItem } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

export interface ToolCardProps {
  tool: ToolItem;
  onRefresh?: () => Promise<void>;
  className?: string;
}

const tagLabels: Record<string, string> = {
  ide: 'IDE',
  'cli-agent': 'CLI Agent',
};

export function ToolCard({ tool, onRefresh, className }: ToolCardProps) {
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isInstalled = tool.status.status === 'available';
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
      <Card data-testid="tool-card" className={cn('flex flex-col', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle data-testid="tool-card-name" className="text-base">
                {tool.name}
              </CardTitle>
              <p data-testid="tool-card-summary" className="text-muted-foreground mt-0.5 text-sm">
                {tool.summary}
              </p>
            </div>
            <Badge
              data-testid="tool-card-status"
              variant={isInstalled ? 'default' : 'secondary'}
              className={cn(
                'shrink-0 text-xs',
                isInstalled
                  ? 'bg-emerald-500 text-white hover:bg-emerald-500'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
              )}
            >
              {isInstalled ? 'Installed' : 'Missing'}
            </Badge>
          </div>

          <div data-testid="tool-card-tags" className="mt-2 flex flex-wrap gap-1.5">
            {tool.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tagLabels[tag] ?? tag}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-3">
          <p
            data-testid="tool-card-description"
            className="text-muted-foreground line-clamp-3 text-sm"
          >
            {tool.description}
          </p>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center gap-2">
          {canLaunch ? (
            <Button
              size="sm"
              variant="default"
              onClick={handleLaunch}
              disabled={isPending}
              aria-label={`Launch ${tool.name}`}
              data-testid="tool-card-launch-button"
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Rocket className="mr-1.5 h-3.5 w-3.5" />
              )}
              Launch
            </Button>
          ) : null}

          {!isInstalled && tool.autoInstall ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAutoInstall}
              disabled={isPending}
              aria-label={`Install ${tool.name}`}
              data-testid="tool-card-install-button"
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isPending ? 'Installing…' : 'Install'}
            </Button>
          ) : null}

          {!isInstalled && !tool.autoInstall && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInstallDialogOpen(true)}
              aria-label={`View install instructions for ${tool.name}`}
              data-testid="tool-card-manual-install-button"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Install
            </Button>
          )}
        </CardFooter>
      </Card>

      <InstallInstructions
        tool={tool}
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
      />
    </>
  );
}
