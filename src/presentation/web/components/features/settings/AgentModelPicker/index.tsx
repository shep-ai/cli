'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { getAllAgentModels } from '@/app/actions/get-all-agent-models';
import type { AgentModelGroup } from '@/app/actions/get-all-agent-models';
import { updateAgentAndModel } from '@/app/actions/update-agent-and-model';
import { getAgentTypeIcon } from '@/components/common/feature-node/agent-type-icons';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
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
  const [saving, setSaving] = React.useState(false);
  const [agentType, setAgentType] = React.useState(initialAgentType);
  const [model, setModel] = React.useState(initialModel);
  const [search, setSearch] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getAllAgentModels()
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    setAgentType(initialAgentType);
    setModel(initialModel);
  }, [initialAgentType, initialModel]);

  const handleSelect = async (newAgentType: string, newModel: string) => {
    setOpen(false);
    setSearch('');

    if (newAgentType === agentType && newModel === model) return;

    if (mode === 'override') {
      setAgentType(newAgentType);
      setModel(newModel);
      onAgentModelChange?.(newAgentType, newModel);
      return;
    }

    // mode === 'settings' — persist to DB
    setSaving(true);
    setError(null);
    try {
      const result = await updateAgentAndModel(newAgentType, newModel || null);
      if (result.ok) {
        setAgentType(newAgentType);
        setModel(newModel);
        onAgentModelChange?.(newAgentType, newModel);
      } else {
        setError(result.error ?? 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = (disabled ?? false) || loading || saving;

  const AgentIcon = getAgentTypeIcon(agentType);

  // Filter groups by search query
  const query = search.toLowerCase();
  const filteredGroups = groups
    .map((g) => {
      if (!query) return g;
      const matchingModels = g.models.filter((m) => m.toLowerCase().includes(query));
      const labelMatches = g.label.toLowerCase().includes(query);
      if (labelMatches) return g; // show all models if agent name matches
      if (matchingModels.length > 0) return { ...g, models: matchingModels };
      return null;
    })
    .filter((g): g is AgentModelGroup => g !== null);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={isDisabled}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 truncate">
              <AgentIcon className="h-4 w-4 shrink-0" />
              {loading ? 'Loading…' : saving ? 'Saving…' : model || agentType}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search agents & models…"
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            />
            <CommandList>
              {!loading && filteredGroups.length === 0 && (
                <CommandEmpty>No matching agents or models.</CommandEmpty>
              )}
              {filteredGroups.map((group, idx) => {
                const GroupIcon = getAgentTypeIcon(group.agentType);
                const hasModels = group.models.length > 0;

                return (
                  <React.Fragment key={group.agentType}>
                    {idx > 0 && <CommandSeparator />}
                    <CommandGroup>
                      {hasModels ? (
                        <>
                          {/* Agent group header — not clickable */}
                          <div className="text-muted-foreground flex items-center gap-2 px-2 py-1.5 text-xs font-semibold">
                            <GroupIcon className="h-4 w-4 shrink-0" />
                            {group.label}
                          </div>
                          {group.models.map((m) => {
                            const isSelected = agentType === group.agentType && model === m;
                            return (
                              <CommandItem
                                key={m}
                                selected={isSelected}
                                onClick={() => handleSelect(group.agentType, m)}
                                className="pl-8"
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4 shrink-0',
                                    isSelected ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {m}
                              </CommandItem>
                            );
                          })}
                        </>
                      ) : (
                        /* Agent with no models — clickable as agent-only */
                        <CommandItem
                          selected={agentType === group.agentType}
                          onClick={() => handleSelect(group.agentType, '')}
                        >
                          <GroupIcon className="mr-2 h-4 w-4 shrink-0" />
                          {group.label}
                          {agentType === group.agentType && (
                            <Check className="ml-auto h-4 w-4 shrink-0" />
                          )}
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </React.Fragment>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {Boolean(error) && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
