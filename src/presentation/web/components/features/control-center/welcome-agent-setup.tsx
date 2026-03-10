'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Download,
  Loader2,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react';
import { getAllAgentModels } from '@/app/actions/get-all-agent-models';
import type { AgentModelGroup } from '@/app/actions/get-all-agent-models';
import { checkAgentTool } from '@/app/actions/check-agent-tool';
import type { AgentToolStatus } from '@/app/actions/check-agent-tool';
import { updateAgentAndModel } from '@/app/actions/update-agent-and-model';
import { getAgentTypeIcon } from '@/components/common/feature-node/agent-type-icons';
import { getModelMeta } from '@/lib/model-metadata';
import { useToolInstallStream } from '@/hooks/use-tool-install-stream';
import { cn } from '@/lib/utils';

export interface WelcomeAgentSetupProps {
  onComplete: () => void;
  className?: string;
}

type SetupStep = 'select-agent' | 'select-model' | 'check-tool';

export function WelcomeAgentSetup({ onComplete, className }: WelcomeAgentSetupProps) {
  const [groups, setGroups] = useState<AgentModelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<SetupStep>('select-agent');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [toolStatus, setToolStatus] = useState<AgentToolStatus | null>(null);
  const [checkingTool, setCheckingTool] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load available agents
  useEffect(() => {
    getAllAgentModels()
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  const activeGroup = selectedAgent ? groups.find((g) => g.agentType === selectedAgent) : null;

  const handleAgentSelect = useCallback(
    (agentType: string) => {
      const group = groups.find((g) => g.agentType === agentType);
      setSelectedAgent(agentType);
      if (group && group.models.length > 0) {
        setStep('select-model');
      } else {
        // Agent without models — go straight to tool check
        setSelectedModel('');
        setStep('check-tool');
      }
    },
    [groups]
  );

  const handleModelSelect = useCallback((model: string) => {
    setSelectedModel(model);
    setStep('check-tool');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'select-model') {
      setSelectedAgent(null);
      setStep('select-agent');
    } else if (step === 'check-tool') {
      if (activeGroup && activeGroup.models.length > 0) {
        setSelectedModel(null);
        setStep('select-model');
      } else {
        setSelectedAgent(null);
        setStep('select-agent');
      }
    }
  }, [step, activeGroup]);

  // Check tool status when entering check-tool step
  useEffect(() => {
    if (step !== 'check-tool' || !selectedAgent) return;

    setCheckingTool(true);
    checkAgentTool(selectedAgent)
      .then(setToolStatus)
      .finally(() => setCheckingTool(false));
  }, [step, selectedAgent]);

  const handleConfirm = useCallback(async () => {
    if (!selectedAgent) return;
    setSaving(true);
    try {
      await updateAgentAndModel(selectedAgent, selectedModel ?? null);
      onComplete();
    } finally {
      setSaving(false);
    }
  }, [selectedAgent, selectedModel, onComplete]);

  if (loading) {
    return (
      <div
        data-testid="welcome-agent-setup"
        className={cn(
          'bg-card flex flex-col items-center justify-center gap-3 rounded-xl border p-8',
          className
        )}
      >
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        <p className="text-muted-foreground text-sm">Loading agents...</p>
      </div>
    );
  }

  return (
    <div
      data-testid="welcome-agent-setup"
      className={cn('bg-card w-full max-w-md rounded-xl border shadow-sm', className)}
    >
      {/* Header */}
      <div className="border-b px-5 py-4">
        <h2 className="text-sm font-bold">Set up your AI agent</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {step === 'select-agent' && 'Choose the coding agent you want to use'}
          {step === 'select-model' && 'Pick a model for your agent'}
          {step === 'check-tool' && 'Verifying tool availability'}
        </p>
        {/* Step indicator */}
        <div className="mt-3 flex items-center gap-1.5">
          {['select-agent', 'select-model', 'check-tool'].map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i <= ['select-agent', 'select-model', 'check-tool'].indexOf(step)
                  ? 'bg-primary'
                  : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-2">
        {/* Step 1: Agent selection */}
        {step === 'select-agent' && (
          <div data-testid="agent-list">
            {groups.map((group) => {
              const GroupIcon = getAgentTypeIcon(group.agentType);
              return (
                <button
                  key={group.agentType}
                  type="button"
                  data-testid={`agent-option-${group.agentType}`}
                  className="hover:bg-accent flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                  onClick={() => handleAgentSelect(group.agentType)}
                >
                  <GroupIcon className="h-5 w-5 shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{group.label}</span>
                    {group.models.length > 0 && (
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {group.models.length} model{group.models.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="text-muted-foreground h-4 w-4" />
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Model selection */}
        {step === 'select-model' && activeGroup ? (
          <div data-testid="model-list">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground mb-1 flex w-full cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
              onClick={handleBack}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to agents
            </button>
            {activeGroup.models.map((m) => {
              const meta = getModelMeta(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  data-testid={`model-option-${m.id}`}
                  className="hover:bg-accent flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                  onClick={() => handleModelSelect(m.id)}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{meta.displayName || m.displayName}</span>
                    <span className="text-muted-foreground text-xs">
                      {meta.description || m.description}
                    </span>
                  </div>
                  <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Step 3: Tool check */}
        {step === 'check-tool' && (
          <ToolCheckStep
            toolStatus={toolStatus}
            checking={checkingTool}
            saving={saving}
            onConfirm={handleConfirm}
            onBack={handleBack}
            onToolInstalled={() => {
              // Re-check tool after install
              if (selectedAgent) {
                setCheckingTool(true);
                checkAgentTool(selectedAgent)
                  .then(setToolStatus)
                  .finally(() => setCheckingTool(false));
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

/** Sub-component for the tool verification step */
function ToolCheckStep({
  toolStatus,
  checking,
  saving,
  onConfirm,
  onBack,
  onToolInstalled,
}: {
  toolStatus: AgentToolStatus | null;
  checking: boolean;
  saving: boolean;
  onConfirm: () => void;
  onBack: () => void;
  onToolInstalled: () => void;
}) {
  if (checking || !toolStatus) {
    return (
      <div className="flex flex-col items-center gap-3 px-3 py-6">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        <p className="text-muted-foreground text-sm">Checking tool availability...</p>
      </div>
    );
  }

  // Agent doesn't require a tool (e.g., dev/demo)
  if (!toolStatus.toolId) {
    return (
      <div className="flex flex-col gap-3 px-3 py-4">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">No additional tools required</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
            onClick={onBack}
          >
            <ChevronLeft className="mr-0.5 inline h-3.5 w-3.5" />
            Back
          </button>
          <button
            type="button"
            data-testid="agent-setup-confirm"
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 ml-auto flex cursor-pointer items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
            onClick={onConfirm}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (toolStatus.installed) {
    return (
      <div className="flex flex-col gap-3 px-3 py-4">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">
            {toolStatus.tool?.name ?? toolStatus.toolId} is installed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
            onClick={onBack}
          >
            <ChevronLeft className="mr-0.5 inline h-3.5 w-3.5" />
            Back
          </button>
          <button
            type="button"
            data-testid="agent-setup-confirm"
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 ml-auto flex cursor-pointer items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
            onClick={onConfirm}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Tool not installed — show install option
  return (
    <ToolInstallInline
      toolStatus={toolStatus}
      saving={saving}
      onConfirm={onConfirm}
      onBack={onBack}
      onInstalled={onToolInstalled}
    />
  );
}

/** Inline tool installer for the welcome wizard */
function ToolInstallInline({
  toolStatus,
  saving,
  onConfirm,
  onBack,
  onInstalled,
}: {
  toolStatus: AgentToolStatus;
  saving: boolean;
  onConfirm: () => void;
  onBack: () => void;
  onInstalled: () => void;
}) {
  const toolId = toolStatus.toolId ?? '';
  const { logs, status, startInstall } = useToolInstallStream(toolId);

  const isInstallDone = status === 'done';
  const isInstallError = status === 'error';

  useEffect(() => {
    if (isInstallDone) {
      onInstalled();
    }
  }, [isInstallDone, onInstalled]);

  return (
    <div className="flex flex-col gap-3 px-3 py-4">
      <div className="flex items-center gap-2">
        {isInstallDone ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : isInstallError ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : (
          <Circle className="text-muted-foreground h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {toolStatus.tool?.name ?? toolId}{' '}
          {isInstallDone
            ? 'installed successfully'
            : isInstallError
              ? 'installation failed'
              : 'is not installed'}
        </span>
      </div>

      {/* Install command info */}
      {toolStatus.tool?.installCommand && status === 'idle' ? (
        <div className="rounded-md bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100">
          <span className="text-zinc-500 select-none">$ </span>
          {toolStatus.tool.installCommand}
        </div>
      ) : null}

      {/* Install log */}
      {(status === 'streaming' || isInstallDone || isInstallError) && logs.length > 0 ? (
        <div className="max-h-32 overflow-auto rounded-md bg-zinc-900 p-2 font-mono text-[11px] leading-relaxed text-zinc-300">
          {logs.map((line, idx) => (
            // eslint-disable-next-line react/no-array-index-key -- logs are append-only, never reorder
            <div key={idx} className="break-all whitespace-pre-wrap">
              {line}
            </div>
          ))}
          {isInstallDone ? (
            <div className="mt-1 text-emerald-400">Installation complete</div>
          ) : null}
          {isInstallError ? (
            <div className="mt-1 text-red-400">Installation failed — try installing manually</div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
          onClick={onBack}
        >
          <ChevronLeft className="mr-0.5 inline h-3.5 w-3.5" />
          Back
        </button>
        <div className="ml-auto flex items-center gap-2">
          {!isInstallDone && toolStatus.tool?.autoInstall ? (
            <button
              type="button"
              data-testid="agent-setup-install"
              disabled={status === 'streaming'}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
              onClick={startInstall}
            >
              {status === 'streaming' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {status === 'streaming' ? 'Installing...' : 'Install'}
            </button>
          ) : null}
          {isInstallDone ? (
            <button
              type="button"
              data-testid="agent-setup-confirm"
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
              onClick={onConfirm}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Continue
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
