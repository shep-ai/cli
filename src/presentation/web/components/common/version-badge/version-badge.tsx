'use client';

import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface VersionBadgeProps {
  version: string;
  branch?: string;
  commitHash?: string;
  isDev?: boolean;
  packageName?: string;
  description?: string;
  nodeVersion?: string;
  platform?: string;
}

export function VersionBadge({
  version,
  branch,
  commitHash,
  isDev = false,
  packageName = '@shepai/cli',
  description,
  nodeVersion,
  platform,
}: VersionBadgeProps) {
  const showBranch = isDev && branch;
  const shortHash = commitHash?.slice(0, 7);

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={[
          'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] leading-tight font-medium',
          isDev
            ? 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/25'
            : 'bg-muted text-muted-foreground ring-border ring-1',
        ].join(' ')}
        data-testid="version-label"
      >
        {isDev ? (
          <span className="text-[9px] tracking-wider text-cyan-300 uppercase">dev</span>
        ) : null}
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
              {shortHash ? <Row label="Commit" value={shortHash} mono /> : null}
              {nodeVersion ? <Row label="Node.js" value={nodeVersion} /> : null}
              {platform ? <Row label="Platform" value={platform} /> : null}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-[10px]">
      <span className="opacity-60">{label}</span>
      <span
        className={[
          highlight ? 'font-medium text-cyan-400' : '',
          mono || !highlight ? 'font-mono' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </span>
    </div>
  );
}
