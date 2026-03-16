'use client';

import { Code, Globe, Terminal, Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AnalysisSummary } from '@/hooks/use-deploy-action';

export interface CacheSummaryProps {
  summary: AnalysisSummary;
  onEdit: () => void;
  onReAnalyze: () => void;
  reAnalyzing?: boolean;
}

export function CacheSummary({ summary, onEdit, onReAnalyze, reAnalyzing }: CacheSummaryProps) {
  return (
    <div data-testid="cache-summary" className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <Code className="h-3 w-3" />
          {summary.language}
          {summary.framework ? ` / ${summary.framework}` : null}
        </span>
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <Terminal className="h-3 w-3" />
          {summary.commandCount} {summary.commandCount === 1 ? 'command' : 'commands'}
        </span>
        {summary.ports && summary.ports.length > 0 ? (
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {summary.ports.join(', ')}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="xs" onClick={onEdit} aria-label="Edit config">
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={onReAnalyze}
          disabled={reAnalyzing}
          aria-label="Re-analyze"
        >
          <RefreshCw className={`h-3 w-3 ${reAnalyzing ? 'animate-spin' : ''}`} />
          Re-analyze
        </Button>
      </div>
    </div>
  );
}
