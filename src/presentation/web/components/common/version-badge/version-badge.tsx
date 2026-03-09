'use client';

import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface VersionBadgeProps {
  version: string;
  branch?: string;
  isDev?: boolean;
  packageName?: string;
  description?: string;
  nodeVersion?: string;
  platform?: string;
}

export function VersionBadge({
  version,
  branch,
  isDev = false,
  packageName = '@shepai/cli',
  description,
  nodeVersion,
  platform,
}: VersionBadgeProps) {
  const showBranch = isDev && branch;

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={[
          'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] leading-tight font-medium',
          isDev
            ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25'
            : 'bg-muted text-muted-foreground ring-border ring-1',
        ].join(' ')}
        data-testid="version-label"
      >
        <span>v{version}</span>
        {showBranch ? (
          <>
            <span className="text-muted-foreground/50">|</span>
            <span className="max-w-[80px] truncate" title={branch}>
              {branch}
            </span>
          </>
        ) : null}
      </div>

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              aria-label="Build information"
              data-testid="version-info-trigger"
            >
              <Info size={12} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[280px] space-y-1 p-3 text-left">
            <div className="mb-1.5 text-xs font-semibold">{packageName}</div>
            {description ? (
              <div className="text-[10px] leading-snug opacity-70">{description}</div>
            ) : null}
            <div className="border-t border-white/10 pt-1.5">
              <Row label="Version" value={`v${version}`} />
              {isDev ? <Row label="Mode" value="Development" highlight /> : null}
              {branch ? <Row label="Branch" value={branch} /> : null}
              {nodeVersion ? <Row label="Node.js" value={nodeVersion} /> : null}
              {platform ? <Row label="Platform" value={platform} /> : null}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[10px]">
      <span className="opacity-60">{label}</span>
      <span className={highlight ? 'font-medium text-amber-400' : 'font-mono'}>{value}</span>
    </div>
  );
}
