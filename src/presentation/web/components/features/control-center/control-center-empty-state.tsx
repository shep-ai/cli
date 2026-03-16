'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  FolderOpen,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Terminal,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { pickFolder } from '@/components/common/add-repository-button/pick-folder';
import { isAgentSetupComplete } from '@/app/actions/agent-setup-flag';
import { checkAgentAuth } from '@/app/actions/check-agent-auth';
import type { AgentAuthStatus } from '@/app/actions/check-agent-auth';
import { WelcomeAgentSetup } from './welcome-agent-setup';

export interface ControlCenterEmptyStateProps {
  onRepositorySelect?: (path: string) => void;
  className?: string;
}

const commands = ['cd ~/my-repo', 'shep feat new "sleek dashboard"'];

export function ControlCenterEmptyState({
  onRepositorySelect,
  className,
}: ControlCenterEmptyStateProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agentReady, setAgentReady] = useState<boolean | null>(null);
  const [authStatus, setAuthStatus] = useState<AgentAuthStatus | null>(null);
  const [cliExpanded, setCliExpanded] = useState(false);

  useEffect(() => {
    isAgentSetupComplete().then((done) => {
      setAgentReady(done);
    });
  }, []);

  useEffect(() => {
    if (!agentReady) return;
    checkAgentAuth().then(setAuthStatus);
  }, [agentReady]);

  async function handlePickerClick() {
    if (loading) return;
    setLoading(true);
    try {
      const path = await pickFolder();
      if (path) {
        onRepositorySelect?.(path);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(commands.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleAgentSetupComplete = useCallback(() => {
    setAgentReady(true);
  }, []);

  const handleRetryAuth = useCallback(() => {
    setAuthStatus(null);
    checkAgentAuth().then(setAuthStatus);
  }, []);

  if (agentReady === null) return null;

  return (
    <div
      data-testid="control-center-empty-state"
      className={cn(
        'relative flex h-full w-full flex-col items-center justify-center px-8',
        className
      )}
    >
      {/* Vertically centered content */}
      {!agentReady ? (
        /* Agent setup wizard — owns its own hero */
        <WelcomeAgentSetup onComplete={handleAgentSetupComplete} />
      ) : (
        /* Repository step — fade in to match wizard transitions */
        <div className="animate-in fade-in flex w-full max-w-md flex-col items-center duration-300">
          <h1 className="text-foreground/90 text-center text-5xl font-extralight tracking-tight">
            Add a project
          </h1>
          <p className="text-muted-foreground mt-3 text-center text-lg leading-relaxed font-light">
            Add your project folder to unlock feature creation.
            <br />
            Describe what you need — Shep handles the rest.
          </p>

          {/* Auth status */}
          <div className="mt-8">
            <AgentAuthBanner status={authStatus} onRetry={handleRetryAuth} />
          </div>
          {/* Primary CTA */}
          <button
            type="button"
            data-testid="empty-state-add-repository"
            onClick={handlePickerClick}
            disabled={loading}
            className="bg-foreground text-background hover:bg-foreground/90 mt-10 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl px-6 py-4 text-base font-medium shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98] disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FolderOpen className="h-5 w-5" />
            )}
            {loading ? 'Opening…' : 'Choose a Folder'}
          </button>

          {/* Subtitle under CTA */}
          <p className="text-muted-foreground/60 mt-3 text-center text-sm">
            Any folder works — git will be initialized automatically if needed.
          </p>
        </div>
      )}

      {/* CLI toggle — anchored to bottom, doesn't shift centered content */}
      {agentReady ? (
        <div
          className="absolute bottom-8 flex flex-col items-center"
          style={{
            animationDelay: '400ms',
            animationDuration: '600ms',
            animationFillMode: 'both',
          }}
        >
          <button
            type="button"
            onClick={() => setCliExpanded(!cliExpanded)}
            className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 transition-colors duration-200"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span className="text-sm">or use the CLI</span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                cliExpanded ? '' : 'rotate-180'
              )}
            />
          </button>

          {cliExpanded ? (
            <div className="animate-in fade-in slide-in-from-top-1 mt-3 w-80 duration-200">
              <div
                data-testid="cli-code-block"
                className="relative rounded-xl bg-zinc-900 px-5 py-4 font-mono text-[13px] leading-relaxed text-zinc-400"
              >
                <button
                  type="button"
                  data-testid="cli-code-block-copy"
                  onClick={handleCopy}
                  className="absolute top-3 right-3 cursor-pointer rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                  aria-label="Copy commands"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <div className="space-y-1">
                  {commands.map((cmd) => (
                    <div key={cmd} className="whitespace-nowrap">
                      <span className="text-zinc-600 select-none">$ </span>
                      <span className="text-zinc-300">{cmd}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Inline status pill — minimal, no background box */
function AgentAuthBanner({
  status,
  onRetry,
}: {
  status: AgentAuthStatus | null;
  onRetry: () => void;
}) {
  if (!status) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="text-muted-foreground/50 h-3.5 w-3.5 animate-spin" />
        <span className="text-muted-foreground/50 text-sm">Checking setup…</span>
      </div>
    );
  }

  if (status.installed && status.authenticated) {
    return (
      <div className="animate-in fade-in flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span className="text-sm text-emerald-600 dark:text-emerald-400">{status.label} ready</span>
      </div>
    );
  }

  if (!status.installed) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            {status.label} not installed
          </span>
        </div>
        {status.binaryName ? (
          <code className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            npm install -g {status.binaryName}
          </code>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-amber-600 underline underline-offset-2 hover:text-amber-800 dark:text-amber-400"
        >
          Re-check
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {status.label} needs authentication
        </span>
      </div>
      {status.authCommand ? (
        <code className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {status.authCommand}
        </code>
      ) : null}
      <div className="flex items-center gap-3">
        {status.binaryName ? (
          <button
            type="button"
            data-testid="auth-banner-open-terminal"
            onClick={async () => {
              try {
                const toolId =
                  status.agentType === 'claude-code' ? 'claude-code' : status.agentType;
                await fetch(`/api/tools/${toolId}/launch`, { method: 'POST' });
              } catch {
                // best effort
              }
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-600 underline underline-offset-2 hover:text-amber-800 dark:text-amber-400"
          >
            <Terminal className="h-3 w-3" />
            Open {status.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-amber-600 underline underline-offset-2 hover:text-amber-800 dark:text-amber-400"
        >
          Re-check
        </button>
      </div>
    </div>
  );
}
