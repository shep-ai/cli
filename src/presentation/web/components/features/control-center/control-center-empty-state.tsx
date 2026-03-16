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
      {/* Glassy container */}
      <div className="animate-in fade-in slide-in-from-bottom-2 w-96 rounded-2xl border border-white/30 bg-white/50 px-8 py-8 shadow-lg backdrop-blur-xl duration-300 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col items-center gap-4">
          {/* Page header — inside card */}
          <div className="mb-2 text-center">
            <h1 className="text-xl font-bold tracking-tight">Features</h1>
            <p className="text-muted-foreground text-sm font-light">Control Center</p>
          </div>

          {!agentReady ? (
            /* Step 1: Agent setup */
            <WelcomeAgentSetup onComplete={handleAgentSetupComplete} className="w-full" />
          ) : (
            /* Step 2: Add repository (shown immediately after agent is configured) */
            <>
              {/* Background auth status banner */}
              <AgentAuthBanner status={authStatus} onRetry={handleRetryAuth} />

              {/* Repositories label */}
              <div className="text-muted-foreground flex items-center gap-2">
                <Github className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold tracking-widest uppercase">
                  Repositories
                </span>
              </div>

              {/* Add Repository button */}
              <button
                type="button"
                data-testid="empty-state-add-repository"
                onClick={handlePickerClick}
                disabled={loading}
                className="border-border hover:border-foreground/40 flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-dashed px-4 py-2.5 transition-colors disabled:cursor-wait disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="text-muted-foreground h-4 w-4" />
                )}
                <span className="text-xs font-medium">
                  {loading ? 'Opening…' : 'Add Repository'}
                </span>
              </button>

              {/* CLI divider */}
              <div className="text-muted-foreground flex items-center gap-2">
                <div className="bg-border h-px w-10" />
                <div className="flex items-center gap-1">
                  <TerminalSquare className="h-3 w-3" />
                  <span className="text-[10px] font-semibold tracking-widest uppercase">
                    Or via CLI
                  </span>
                </div>
                <div className="bg-border h-px w-10" />
              </div>

              {/* Code block */}
              <div
                data-testid="cli-code-block"
                className="relative w-full rounded-md bg-zinc-900 px-3 py-2 font-mono text-[11px] text-zinc-300"
              >
                <button
                  type="button"
                  data-testid="cli-code-block-copy"
                  onClick={handleCopy}
                  className="absolute top-2 right-2 cursor-pointer rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                  aria-label="Copy commands"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
                <div className="space-y-0.5">
                  {commands.map((cmd) => (
                    <div key={cmd} className="whitespace-nowrap">
                      <span className="text-zinc-500 select-none">$ </span>
                      <span>{cmd}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hint */}
              <p className="text-muted-foreground text-[10px]">
                Feature will appear on canvas once created
              </p>
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
      <div className="bg-muted/50 flex w-full items-center gap-2 rounded-md px-3 py-1.5">
        <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
        <span className="text-muted-foreground text-[10px]">Checking agent setup…</span>
      </div>
    );
  }

  // All good — compact success, auto-fades
  if (status.installed && status.authenticated) {
    return (
      <div className="animate-in fade-in flex w-full items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-1.5">
        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
          {status.label} ready
        </span>
      </div>
    );
  }

  // Not installed
  if (!status.installed) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-md bg-amber-500/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
            {status.label} not installed
          </span>
        </div>
        {status.installCommand ? (
          <div className="rounded bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-300">
            <span className="text-zinc-500 select-none">$ </span>
            {status.installCommand}
          </div>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="self-start text-[10px] font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
        >
          Re-check
        </button>
      </div>
    );
  }

  // Installed but not authenticated
  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-amber-500/10 px-3 py-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
        <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
          {status.label} needs authentication
        </span>
      </div>
      {status.authCommand ? (
        <div className="rounded bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-300">
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
            className="flex items-center gap-1 rounded border border-amber-600/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-500/10 dark:text-amber-300"
          >
            <Terminal className="h-2.5 w-2.5" />
            Open {status.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="text-[10px] font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
        >
          Re-check
        </button>
      </div>
    </div>
  );
}
