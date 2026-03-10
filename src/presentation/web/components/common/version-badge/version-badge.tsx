'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface VersionBadgeProps {
  version: string;
  branch?: string;
  commitHash?: string;
  isDev?: boolean;
  packageName?: string;
  description?: string;
  instancePath?: string;
}

export function VersionBadge({
  version,
  branch,
  commitHash,
  isDev = false,
  packageName = '@shepai/cli',
  description,
  instancePath,
}: VersionBadgeProps) {
  const shortHash = commitHash?.slice(0, 7);

  // In dev mode show "1.92.2-dev", in production show "v1.92.2"
  const displayVersion = isDev ? `${version}-dev` : `v${version}`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="text-muted-foreground/50 hover:text-muted-foreground cursor-default text-[10px] leading-tight transition-colors"
            data-testid="version-label"
          >
            {displayVersion}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[280px] space-y-1 p-3 text-left">
          <div className="mb-1.5 text-xs font-semibold">{packageName}</div>
          {description ? (
            <div className="text-[10px] leading-snug opacity-70">{description}</div>
          ) : null}
          <div className="border-t border-white/10 pt-1.5">
            <Row label="Version" value={displayVersion} />
            {isDev && branch ? <Row label="Branch" value={branch} /> : null}
            {isDev && shortHash ? <Row label="Commit" value={shortHash} mono /> : null}
            {isDev && instancePath ? <Row label="Path" value={instancePath} mono /> : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
