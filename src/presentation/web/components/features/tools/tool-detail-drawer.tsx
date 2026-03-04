'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Download,
  Rocket,
  Loader2,
  Monitor,
  Terminal,
  GitBranch,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseDrawer } from '@/components/common/base-drawer/base-drawer';
import { useToolInstallStream } from '@/hooks/use-tool-install-stream';
import type { ToolItem } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

export interface ToolDetailDrawerProps {
  tool: ToolItem;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => Promise<void>;
}

const TAG_CONFIG: Record<string, { label: string; icon: typeof Monitor }> = {
  ide: { label: 'IDE', icon: Monitor },
  'cli-agent': { label: 'CLI Agent', icon: Terminal },
  vcs: { label: 'VCS', icon: GitBranch },
  terminal: { label: 'Terminal', icon: Terminal },
};

const AUTO_SCROLL_THRESHOLD = 50;

function StatusBadge({ status }: { status: string }) {
  if (status === 'available') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <Check className="h-3 w-3" />
        Installed
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      Missing
    </span>
  );
}

export function ToolDetailDrawer({ tool, open, onClose, onRefresh }: ToolDetailDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const { logs, status, startInstall } = useToolInstallStream(tool.id);
  const logRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const isInstalled = tool.status.status === 'available';
  const isError = tool.status.status === 'error';
  const canLaunch = isInstalled && Boolean(tool.openDirectory);
  const canInstall = !isInstalled && !isError && tool.autoInstall;

  function handleCopy() {
    if (!tool.installCommand) return;
    void navigator.clipboard.writeText(tool.installCommand).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleLaunch() {
    setIsLaunching(true);
    try {
      await fetch(`/api/tools/${tool.id}/launch`, { method: 'POST' });
    } finally {
      setIsLaunching(false);
    }
  }

  const handleScroll = useCallback(() => {
    const el = logRef.current;
    if (!el) return;
    isAtBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - AUTO_SCROLL_THRESHOLD;
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Refresh tool status after install completes
  useEffect(() => {
    if (status === 'done' && onRefresh) {
      void onRefresh();
    }
  }, [status, onRefresh]);

  const header = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {tool.iconUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={tool.iconUrl} alt="" width={24} height={24} className="shrink-0 dark:invert" />
        ) : (
          <Package className="text-muted-foreground h-6 w-6 shrink-0" />
        )}
        <h2 className="text-base font-bold">{tool.name}</h2>
        <StatusBadge status={tool.status.status} />
      </div>
      <div className="flex items-center gap-1">
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
  );

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      size="sm"
      modal={false}
      header={header}
      data-testid="tool-detail-drawer"
    >
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* Description */}
        <div>
          <p className="text-muted-foreground text-sm">{tool.description}</p>
        </div>

        {/* Install Command */}
        {tool.installCommand ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Install command</span>
            <div className="relative rounded-md bg-zinc-900 text-zinc-100">
              <pre className="overflow-x-auto px-3 py-2.5 pr-16 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
                <code>{tool.installCommand}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1.5 right-1.5 h-7 cursor-pointer px-2 text-zinc-400 hover:text-zinc-100"
                onClick={handleCopy}
                aria-label={copied ? 'Copied!' : 'Copy install command'}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="ml-1 text-[10px]">{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
            </div>
          </div>
        ) : null}

        {/* Action Bar */}
        <div className="flex items-center gap-2">
          {canInstall ? (
            <Button
              size="sm"
              onClick={startInstall}
              disabled={status === 'streaming'}
              aria-label={`Install ${tool.name}`}
              className="cursor-pointer"
            >
              {status === 'streaming' ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              {status === 'streaming' ? 'Installing...' : 'Install'}
            </Button>
          ) : null}
          {canLaunch ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleLaunch()}
              disabled={isLaunching}
              aria-label={`Launch ${tool.name}`}
              className="cursor-pointer"
            >
              {isLaunching ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Rocket className="mr-1.5 h-3.5 w-3.5" />
              )}
              Launch
            </Button>
          ) : null}
        </div>

        {/* Install Log */}
        {(status === 'streaming' || status === 'done' || status === 'error') && logs.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Install log</span>
            <div
              ref={logRef}
              onScroll={handleScroll}
              className="max-h-60 overflow-auto rounded-md bg-zinc-900 p-3 font-mono text-xs leading-relaxed text-zinc-100"
              data-testid="tool-install-log"
            >
              {logs.map((line) => (
                <div key={line} className="break-all whitespace-pre-wrap">
                  {line}
                </div>
              ))}
              {status === 'done' ? (
                <div className="mt-2 border-t border-zinc-700 pt-2 text-emerald-400">
                  Installation complete
                </div>
              ) : null}
              {status === 'error' ? (
                <div className="mt-2 border-t border-zinc-700 pt-2 text-red-400">
                  Installation failed
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Documentation */}
        {tool.documentationUrl ? (
          <Button variant="outline" size="sm" className="w-fit cursor-pointer" asChild>
            <a href={tool.documentationUrl} target="_blank" rel="noopener noreferrer">
              Documentation
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        ) : null}
      </div>
    </BaseDrawer>
  );
}
