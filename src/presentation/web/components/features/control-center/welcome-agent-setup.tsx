'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Download,
  Loader2,
  CheckCircle2,
  Circle,
  AlertCircle,
  Bot,
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

const STEPS: SetupStep[] = ['select-agent', 'select-model', 'check-tool'];

/** Fixed width for the wizard content area to prevent layout jumps */
const WIZARD_WIDTH = 'w-72';

export function WelcomeAgentSetup({ onComplete, className }: WelcomeAgentSetupProps) {
  const [groups, setGroups] = useState<AgentModelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<SetupStep>('select-agent');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [toolStatus, setToolStatus] = useState<AgentToolStatus | null>(null);
  const [checkingTool, setCheckingTool] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    getAllAgentModels()
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  const activeGroup = selectedAgent ? groups.find((g) => g.agentType === selectedAgent) : null;

  /** Animate step transition: fade out → change step → fade in */
  const transitionTo = useCallback((nextStep: SetupStep, setup?: () => void) => {
    setTransitioning(true);
    setVisible(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setup?.();
      setStep(nextStep);
      // Small delay to let React render the new content before fading in
      requestAnimationFrame(() => {
        setVisible(true);
        setTransitioning(false);
      });
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleAgentSelect = useCallback(
    (agentType: string) => {
      const group = groups.find((g) => g.agentType === agentType);
      if (group && group.models.length > 0) {
        transitionTo('select-model', () => {
          setSelectedAgent(agentType);
        });
      } else {
        transitionTo('check-tool', () => {
          setSelectedAgent(agentType);
          setSelectedModel('');
        });
      }
    },
    [groups, transitionTo]
  );

  const handleModelSelect = useCallback(
    (model: string) => {
      transitionTo('check-tool', () => {
        setSelectedModel(model);
      });
    },
    [transitionTo]
  );

  const handleBack = useCallback(() => {
    if (step === 'select-model') {
      transitionTo('select-agent', () => {
        setSelectedAgent(null);
      });
    } else if (step === 'check-tool') {
      if (activeGroup && activeGroup.models.length > 0) {
        transitionTo('select-model', () => {
          setSelectedModel(null);
        });
      } else {
        transitionTo('select-agent', () => {
          setSelectedAgent(null);
        });
      }
    }
  }, [step, activeGroup, transitionTo]);

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
        className={cn('flex flex-col items-center justify-center gap-3', className)}
      >
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        <p className="text-muted-foreground text-xs">Loading agents…</p>
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div
      data-testid="welcome-agent-setup"
      className={cn('flex flex-col items-center gap-4', WIZARD_WIDTH, className)}
    >
      {/* Section header */}
      <div className="flex flex-col items-center gap-1">
        <div className="text-muted-foreground flex items-center gap-2">
          {step === 'select-agent' && (
            <>
              <Bot className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold tracking-widest uppercase">
                Choose your agent
              </span>
            </>
          )}
          {step === 'select-model' && activeGroup
            ? (() => {
                const AgentIcon = getAgentTypeIcon(activeGroup.agentType);
                return (
                  <>
                    <AgentIcon className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold tracking-widest uppercase">
                      {activeGroup.label} — Pick a model
                    </span>
                  </>
                );
              })()
            : null}
          {step === 'check-tool' && (
            <>
              <Bot className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold tracking-widest uppercase">
                Verifying setup
              </span>
            </>
          )}
        </div>
      </div>

      {/* Step indicator — fixed width */}
      <div className="flex w-32 items-center gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              'h-0.5 flex-1 rounded-full transition-colors duration-300',
              i <= stepIndex ? 'bg-foreground/60' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Step content — fixed dimensions, fade transition */}
      <div
        className={cn(
          'flex w-full flex-col items-center transition-opacity duration-150',
          visible && !transitioning ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Step 1: Agent selection */}
        {step === 'select-agent' && (
          <div data-testid="agent-list" className="flex w-full flex-col gap-1.5">
            {groups.map((group) => {
              const GroupIcon = getAgentTypeIcon(group.agentType);
              return (
                <button
                  key={group.agentType}
                  type="button"
                  data-testid={`agent-option-${group.agentType}`}
                  className="border-border hover:border-foreground/40 flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-dashed px-4 py-2.5 transition-colors"
                  onClick={() => handleAgentSelect(group.agentType)}
                >
                  <GroupIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left text-xs font-medium">{group.label}</span>
                  <ChevronRight className="text-muted-foreground h-3 w-3" />
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Model selection */}
        {step === 'select-model' && activeGroup ? (
          <div data-testid="model-list" className="flex w-full flex-col gap-1.5">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground mb-0.5 flex cursor-pointer items-center gap-1 self-start text-[10px] font-medium transition-colors"
              onClick={handleBack}
            >
              <ChevronLeft className="h-3 w-3" />
              Back
            </button>
            <div className="flex max-h-48 w-full flex-col gap-1.5 overflow-y-auto">
              {activeGroup.models.map((m) => {
                const meta = getModelMeta(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`model-option-${m.id}`}
                    className="border-border hover:border-foreground/40 flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-dashed px-4 py-2.5 text-left transition-colors"
                    onClick={() => handleModelSelect(m.id)}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-xs font-medium">
                        {meta.displayName || m.displayName}
                      </span>
                      <span className="text-muted-foreground text-[10px] leading-tight">
                        {meta.description || m.description}
                      </span>
                    </div>
                    <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
                  </button>
                );
              })}
            </div>
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
      <div className="flex flex-col items-center gap-2 py-4">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        <p className="text-muted-foreground text-[10px]">Checking tool availability…</p>
      </div>
    );
  }

  // Agent doesn't require a tool (e.g., dev/demo)
  if (!toolStatus.toolId) {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="text-muted-foreground flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="text-xs">No additional tools required</span>
        </div>
        <ConfirmRow saving={saving} onConfirm={onConfirm} onBack={onBack} />
      </div>
    );
  }

  if (toolStatus.installed) {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="text-muted-foreground flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="text-xs">{toolStatus.tool?.name ?? toolStatus.toolId} is installed</span>
        </div>
        <ConfirmRow saving={saving} onConfirm={onConfirm} onBack={onBack} />
      </div>
    );
  }

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

/** Shared back + continue row */
function ConfirmRow({
  saving,
  onConfirm,
  onBack,
}: {
  saving: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] transition-colors"
        onClick={onBack}
      >
        <ChevronLeft className="mr-0.5 inline h-3 w-3" />
        Back
      </button>
      <button
        type="button"
        data-testid="agent-setup-confirm"
        disabled={saving}
        className="border-border hover:border-foreground/40 flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
        onClick={onConfirm}
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        Continue
      </button>
    </div>
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
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex items-center gap-1.5">
        {isInstallDone ? (
          <CheckCircle2 className="text-muted-foreground h-3.5 w-3.5" />
        ) : isInstallError ? (
          <AlertCircle className="text-destructive h-3.5 w-3.5" />
        ) : (
          <Circle className="text-muted-foreground h-3.5 w-3.5" />
        )}
        <span className="text-xs">
          {toolStatus.tool?.name ?? toolId}{' '}
          {isInstallDone ? 'installed' : isInstallError ? 'install failed' : 'is not installed'}
        </span>
      </div>

      {/* Install command info */}
      {toolStatus.tool?.installCommand && status === 'idle' ? (
        <div className="w-full rounded-md bg-zinc-900 px-3 py-2 font-mono text-[11px] text-zinc-300">
          <span className="text-zinc-500 select-none">$ </span>
          {toolStatus.tool.installCommand}
        </div>
      ) : null}

      {/* Install log */}
      {(status === 'streaming' || isInstallDone || isInstallError) && logs.length > 0 ? (
        <div className="max-h-28 w-full overflow-auto rounded-md bg-zinc-900 px-3 py-2 font-mono text-[10px] leading-relaxed text-zinc-400">
          {logs.map((line, idx) => (
            // eslint-disable-next-line react/no-array-index-key -- logs are append-only, never reorder
            <div key={idx} className="break-all whitespace-pre-wrap">
              {line}
            </div>
          ))}
          {isInstallDone ? (
            <div className="text-muted-foreground mt-1">Installation complete</div>
          ) : null}
          {isInstallError ? (
            <div className="text-destructive mt-1">Installation failed — try manually</div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] transition-colors"
          onClick={onBack}
        >
          <ChevronLeft className="mr-0.5 inline h-3 w-3" />
          Back
        </button>
        {!isInstallDone && toolStatus.tool?.autoInstall ? (
          <button
            type="button"
            data-testid="agent-setup-install"
            disabled={status === 'streaming'}
            className="border-border hover:border-foreground/40 flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
            onClick={startInstall}
          >
            {status === 'streaming' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            {status === 'streaming' ? 'Installing…' : 'Install'}
          </button>
        ) : null}
        {isInstallDone ? (
          <button
            type="button"
            data-testid="agent-setup-confirm"
            disabled={saving}
            className="border-border hover:border-foreground/40 flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
            onClick={onConfirm}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Continue
          </button>
        ) : null}
      </div>
    </div>
  );
}
