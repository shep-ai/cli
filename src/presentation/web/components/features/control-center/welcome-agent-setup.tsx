'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, ChevronLeft, Loader2, Bot } from 'lucide-react';
import { getAllAgentModels } from '@/app/actions/get-all-agent-models';
import type { AgentModelGroup } from '@/app/actions/get-all-agent-models';
import { updateAgentAndModel } from '@/app/actions/update-agent-and-model';
import { getAgentTypeIcon } from '@/components/common/feature-node/agent-type-icons';
import { getModelMeta } from '@/lib/model-metadata';
import { cn } from '@/lib/utils';

export interface WelcomeAgentSetupProps {
  onComplete: () => void;
  className?: string;
}

type SetupStep = 'select-agent' | 'select-model';

const STEPS: SetupStep[] = ['select-agent', 'select-model'];

/** Fixed width for the wizard content area to prevent layout jumps */
const WIZARD_WIDTH = 'w-72';

export function WelcomeAgentSetup({ onComplete, className }: WelcomeAgentSetupProps) {
  const [groups, setGroups] = useState<AgentModelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<SetupStep>('select-agent');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
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

  /** Save agent+model selection and complete the wizard */
  const saveAndComplete = useCallback(
    async (agentType: string, model: string | null) => {
      setSaving(true);
      try {
        await updateAgentAndModel(agentType, model);
        onComplete();
      } finally {
        setSaving(false);
      }
    },
    [onComplete]
  );

  const handleAgentSelect = useCallback(
    (agentType: string) => {
      const group = groups.find((g) => g.agentType === agentType);
      if (group && group.models.length > 0) {
        transitionTo('select-model', () => {
          setSelectedAgent(agentType);
        });
      } else {
        // No models — save immediately
        saveAndComplete(agentType, null);
      }
    },
    [groups, transitionTo, saveAndComplete]
  );

  const handleModelSelect = useCallback(
    (model: string) => {
      if (!selectedAgent) return;
      saveAndComplete(selectedAgent, model);
    },
    [selectedAgent, saveAndComplete]
  );

  const handleBack = useCallback(() => {
    if (step === 'select-model') {
      transitionTo('select-agent', () => {
        setSelectedAgent(null);
      });
    }
  }, [step, transitionTo]);

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
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex w-full items-center gap-1">
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
                  disabled={saving}
                  data-testid={`agent-option-${group.agentType}`}
                  className="border-border hover:border-foreground/40 flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-dashed px-4 py-2.5 transition-colors disabled:opacity-50"
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
              disabled={saving}
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
                    disabled={saving}
                    data-testid={`model-option-${m.id}`}
                    className="border-border hover:border-foreground/40 flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-dashed px-4 py-2.5 text-left transition-colors disabled:opacity-50"
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
      </div>
    </div>
  );
}
