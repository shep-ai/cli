'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNpmVersionCheck } from '@/hooks/use-npm-version-check';
import { useCliUpgrade } from '@/hooks/use-cli-upgrade';

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
  const { latest, updateAvailable } = useNpmVersionCheck(version);
  const { status: upgradeStatus, startUpgrade } = useCliUpgrade();

  // In dev mode show "1.92.2-dev", in production show "v1.92.2"
  const displayVersion = isDev ? `${version}-dev` : `v${version}`;

  const isUpgrading = upgradeStatus === 'upgrading';
  const didUpgrade = upgradeStatus === 'upgraded';
  const upgradeError = upgradeStatus === 'error';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="text-muted-foreground/80 hover:text-muted-foreground relative cursor-default text-[11px] leading-tight transition-colors"
            data-testid="version-label"
          >
            {displayVersion}
            {updateAvailable && !didUpgrade ? (
              <span
                className="absolute -top-0.5 -right-1.5 size-1.5 rounded-full bg-emerald-400"
                data-testid="update-dot"
              />
            ) : null}
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
            {latest ? (
              <Row label="Latest" value={`v${latest}`} highlight={updateAvailable} />
            ) : null}
          </div>
          {didUpgrade ? (
            <div className="border-t border-white/10 pt-1.5">
              <span
                className="text-[10px] font-medium text-emerald-400"
                data-testid="upgrade-success"
              >
                Upgraded successfully — restart to apply
              </span>
            </div>
          ) : upgradeError ? (
            <div className="border-t border-white/10 pt-1.5">
              <span className="text-[10px] font-medium text-red-400" data-testid="upgrade-error">
                Upgrade failed
              </span>
            </div>
          ) : updateAvailable ? (
            <div className="border-t border-white/10 pt-1.5">
              <button
                type="button"
                onClick={startUpgrade}
                disabled={isUpgrading}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 transition-colors hover:text-emerald-300 disabled:opacity-50"
                data-testid="upgrade-button"
              >
                {isUpgrading ? 'Upgrading...' : `Upgrade to v${latest}`}
              </button>
            </div>
          ) : null}
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
          highlight ? 'font-medium text-emerald-400' : '',
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
