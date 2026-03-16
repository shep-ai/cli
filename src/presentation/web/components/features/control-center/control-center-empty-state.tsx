'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Github,
  Plus,
  TerminalSquare,
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

  // Background auth check — runs after agent setup is complete
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
      className={cn('flex flex-col items-center justify-center', className)}
    >
      {/* Glassy container — near full-width */}
      <div className="animate-in fade-in slide-in-from-bottom-2 w-full max-w-3xl rounded-2xl border border-white/30 bg-white/50 px-16 py-14 shadow-lg backdrop-blur-xl duration-300 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col items-center gap-6">
          {/* Page header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Features</h1>
            <p className="text-muted-foreground mt-1 text-base font-light">Control Center</p>
          </div>

          {!agentReady ? (
            /* Step 1: Agent setup */
            <WelcomeAgentSetup onComplete={handleAgentSetupComplete} className="w-full" />
          ) : (
            /* Step 2: Add repository */
            <>
              {/* Background auth status banner */}
              <AgentAuthBanner status={authStatus} onRetry={handleRetryAuth} />

              {/* Repositories section */}
              <div className="flex w-full flex-col items-center gap-4">
                <div className="text-muted-foreground flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  <span className="text-xs font-semibold tracking-widest uppercase">
                    Repositories
                  </span>
                </div>

                {/* Add Repository — prominent CTA */}
                <button
                  type="button"
                  data-testid="empty-state-add-repository"
                  onClick={handlePickerClick}
                  disabled={loading}
                  className="border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed px-5 py-4 transition-all disabled:cursor-wait disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="text-primary h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="text-primary h-5 w-5" />
                  )}
                  <span className="text-sm font-medium">
                    {loading ? 'Opening…' : 'Add Repository'}
                  </span>
                </button>

                {/* Hint */}
                <p className="text-muted-foreground text-xs">
                  Feature will appear on canvas once created
                </p>
              </div>

              {/* CLI section — collapsed by default */}
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => setCliExpanded(!cliExpanded)}
                  className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center justify-center gap-1.5 py-1 transition-colors"
                >
                  <TerminalSquare className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Or use CLI</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform duration-200',
                      cliExpanded && 'rotate-180'
                    )}
                  />
                </button>

                {cliExpanded ? (
                  <div className="animate-in fade-in slide-in-from-top-1 mt-3 duration-200">
                    <div
                      data-testid="cli-code-block"
                      className="relative w-full rounded-lg bg-zinc-900 px-4 py-3 font-mono text-xs text-zinc-300"
                    >
                      <button
                        type="button"
                        data-testid="cli-code-block-copy"
                        onClick={handleCopy}
                        className="absolute top-2.5 right-2.5 cursor-pointer rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                        aria-label="Copy commands"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <div className="space-y-1">
                        {commands.map((cmd) => (
                          <div key={cmd} className="whitespace-nowrap">
                            <span className="text-zinc-500 select-none">$ </span>
                            <span>{cmd}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact auth status banner — shows checking/success/error states */
function AgentAuthBanner({
  status,
  onRetry,
}: {
  status: AgentAuthStatus | null;
  onRetry: () => void;
}) {
  // Still checking — show subtle spinner
  if (!status) {
    return (
      <div className="bg-muted/50 flex w-full items-center gap-2 rounded-md px-3 py-2">
        <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
        <span className="text-muted-foreground text-xs">Checking agent setup…</span>
      </div>
    );
  }

  // All good — compact success
  if (status.installed && status.authenticated) {
    return (
      <div className="animate-in fade-in flex w-full items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs text-emerald-700 dark:text-emerald-300">{status.label} ready</span>
      </div>
    );
  }

  // Not installed
  if (!status.installed) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-md bg-amber-500/10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
            {status.label} not installed
          </span>
        </div>
        {status.binaryName ? (
          <div className="rounded bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-300">
            <span className="text-zinc-500 select-none">$ </span>
            npm install -g {status.binaryName}
          </div>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="self-start text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
        >
          Re-check
        </button>
      </div>
    );
  }

  // Installed but not authenticated
  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-amber-500/10 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
          {status.label} needs authentication
        </span>
      </div>
      {status.authCommand ? (
        <div className="rounded bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-300">
          <span className="text-zinc-500 select-none">$ </span>
          {status.authCommand}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
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
            className="flex items-center gap-1 rounded border border-amber-600/30 px-2 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/10 dark:text-amber-300"
          >
            <Terminal className="h-3 w-3" />
            Open {status.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
        >
          Re-check
        </button>
      </div>
    </div>
  );
}
