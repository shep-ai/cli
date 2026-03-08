'use client';

import * as React from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllAgentModels } from '@/app/actions/get-all-agent-models';
import type { AgentModelGroup } from '@/app/actions/get-all-agent-models';
import { updateAgentAndModel } from '@/app/actions/update-agent-and-model';
import { getAgentTypeIcon } from '@/components/common/feature-node/agent-type-icons';
import { getModelMeta } from '@/lib/model-metadata';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface AgentModelPickerProps {
  initialAgentType: string;
  initialModel: string;
  onAgentModelChange?: (agentType: string, model: string) => void;
  disabled?: boolean;
  className?: string;
  /** 'settings' persists to DB; 'override' only calls onAgentModelChange */
  mode: 'settings' | 'override';
}

export function AgentModelPicker({
  initialAgentType,
  initialModel,
  onAgentModelChange,
  disabled,
  className,
  mode,
}: AgentModelPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [groups, setGroups] = React.useState<AgentModelGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [agentType, setAgentType] = React.useState(initialAgentType);
  const [model, setModel] = React.useState(initialModel);
  const [error, setError] = React.useState<string | null>(null);

  // 0 = agent list visible, 1 = model list visible
  const [level, setLevel] = React.useState(0);
  // Which agent's models to show (kept separate from level for animation)
  const [drillAgent, setDrillAgent] = React.useState<string | null>(null);

  React.useEffect(() => {
    getAllAgentModels()
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  // Reset drill-down when popover closes
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setLevel(0);
        setDrillAgent(null);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const drillInto = (agent: string) => {
    setDrillAgent(agent);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setLevel(1));
    });
  };

  const drillBack = () => {
    setLevel(0);
    setTimeout(() => setDrillAgent(null), 220);
  };

  const handleSelect = async (newAgentType: string, newModel: string) => {
    setOpen(false);

    if (newAgentType === agentType && newModel === model) return;

    if (mode === 'override') {
      setAgentType(newAgentType);
      setModel(newModel);
      onAgentModelChange?.(newAgentType, newModel);
      return;
    }

    // mode === 'settings' — optimistically update, then persist
    const prevAgent = agentType;
    const prevModel = model;
    setAgentType(newAgentType);
    setModel(newModel);
    onAgentModelChange?.(newAgentType, newModel);

    setError(null);
    try {
      const result = await updateAgentAndModel(newAgentType, newModel || null);
      if (!result.ok) {
        // Revert on failure
        setAgentType(prevAgent);
        setModel(prevModel);
        onAgentModelChange?.(prevAgent, prevModel);
        setError(result.error ?? 'Failed to save');
      }
    } catch {
      setAgentType(prevAgent);
      setModel(prevModel);
      onAgentModelChange?.(prevAgent, prevModel);
      setError('Failed to save');
    }
  };

  const isDisabled = (disabled ?? false) || loading;

  const AgentIcon = getAgentTypeIcon(agentType);
  const agentLabel = groups.find((g) => g.agentType === agentType)?.label ?? agentType;
  const modelName = model ? getModelMeta(model).displayName || model : null;

  const activeGroup = drillAgent ? groups.find((g) => g.agentType === drillAgent) : null;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={isDisabled}
            className="w-auto cursor-pointer justify-start font-normal hover:border-violet-300 hover:bg-violet-50/50 dark:hover:border-violet-700 dark:hover:bg-violet-950/30"
          >
            <span className="flex items-center gap-2 truncate">
              <AgentIcon className="h-4 w-4 shrink-0" />
              {loading ? (
                'Loading…'
              ) : (
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">{agentLabel}</span>
                  {modelName ? (
                    <>
                      <span className="text-muted-foreground/50 text-xs">·</span>
                      <span className="text-xs font-medium">{modelName}</span>
                    </>
                  ) : null}
                </span>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) overflow-hidden p-0"
          align="start"
        >
          {/* Sliding container — both panels side by side, translateX controlled by level */}
          <div
            className="flex transition-transform duration-200 ease-in-out"
            style={{ transform: `translateX(${level === 1 ? '-50%' : '0%'})`, width: '200%' }}
          >
            {/* ── Level 1: Agent list ── */}
            <div className="w-1/2 shrink-0">
              <div className="text-muted-foreground border-b px-3 py-2 text-xs font-medium">
                Select agent
              </div>
              {groups.map((group) => {
                const GroupIcon = getAgentTypeIcon(group.agentType);
                const isActive = agentType === group.agentType;
                const hasModels = group.models.length > 0;

                return (
                  <button
                    key={group.agentType}
                    type="button"
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      isActive && 'bg-accent/50'
                    )}
                    onClick={() => {
                      if (hasModels) {
                        drillInto(group.agentType);
                      } else {
                        handleSelect(group.agentType, '');
                      }
                    }}
                  >
                    <GroupIcon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{group.label}</span>
                    {isActive && !hasModels ? (
                      <Check className="text-primary h-3.5 w-3.5 shrink-0" />
                    ) : null}
                    {hasModels ? (
                      <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* ── Level 2: Model list for selected agent ── */}
            <div className="w-1/2 shrink-0">
              {activeGroup ? (
                <>
                  {/* Back header */}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center gap-1.5 border-b px-3 py-2 text-xs font-medium transition-colors"
                    onClick={drillBack}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {activeGroup.label}
                  </button>

                  {/* Model items */}
                  {activeGroup.models.map((m) => {
                    const isSelected = agentType === activeGroup.agentType && model === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          isSelected && 'bg-accent/50'
                        )}
                        onClick={() => handleSelect(activeGroup.agentType, m.id)}
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-sm font-medium">{m.displayName}</span>
                          <span className="text-muted-foreground text-xs">{m.description}</span>
                        </div>
                        {isSelected ? (
                          <Check className="text-primary h-3.5 w-3.5 shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </>
              ) : null}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {Boolean(error) && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
