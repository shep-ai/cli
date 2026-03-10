'use client';

import { useState, useCallback } from 'react';
import { Github, Plus, TerminalSquare, Copy, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pickFolder } from '@/components/common/add-repository-button/pick-folder';
import { WelcomeAgentSetup } from './welcome-agent-setup';

const AGENT_CONFIGURED_KEY = 'shep:agent-configured';

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
  const [agentReady, setAgentReady] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AGENT_CONFIGURED_KEY) === 'true';
  });

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
    localStorage.setItem(AGENT_CONFIGURED_KEY, 'true');
    setAgentReady(true);
  }, []);

  return (
    <div
      data-testid="control-center-empty-state"
      className={cn('relative h-full w-full', className)}
    >
      {/* Dotted grid background */}
      <div className="absolute inset-0 [background-image:radial-gradient(circle,_var(--color-border)_1px,_transparent_1px)] [background-size:24px_24px]" />

      {/* Page header */}
      <div className="absolute top-8 left-8 z-10">
        <h1 className="text-4xl font-bold tracking-tight">Features</h1>
        <p className="text-muted-foreground text-3xl font-light">Control Center</p>
      </div>

      {/* Centered content */}
      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="flex w-72 flex-col items-center gap-4">
          {!agentReady ? (
            /* Step 1: Agent setup */
            <WelcomeAgentSetup onComplete={handleAgentSetupComplete} />
          ) : (
            /* Step 2: Add repository (shown after agent is configured) */
            <>
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
