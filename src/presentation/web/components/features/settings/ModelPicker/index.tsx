'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { getSupportedModels } from '@/app/actions/get-supported-models';
import { updateModel } from '@/app/actions/update-model';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ModelPickerProps {
  /** Current model identifier shown as the initial selection */
  initialModel: string;
  /** Optional callback notified when the model is successfully persisted */
  onModelChange?: (model: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * ModelPicker
 *
 * A combobox that lets the user choose the default LLM model. On mount it
 * calls the `getSupportedModels` server action to populate suggestions for
 * the currently configured agent; the user may also type any free-text model
 * identifier. On selection the new value is persisted via `updateModel`.
 */
export function ModelPicker({
  initialModel,
  onModelChange,
  disabled,
  className,
}: ModelPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [models, setModels] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [value, setValue] = React.useState(initialModel);
  const [inputValue, setInputValue] = React.useState(initialModel);
  const [error, setError] = React.useState<string | null>(null);

  // Load advertised models on mount
  React.useEffect(() => {
    getSupportedModels()
      .then(setModels)
      .finally(() => setLoading(false));
  }, []);

  // Keep local state in sync when initialModel prop changes
  React.useEffect(() => {
    setValue(initialModel);
    setInputValue(initialModel);
  }, [initialModel]);

  const filteredModels = models.filter((m) => m.toLowerCase().includes(inputValue.toLowerCase()));

  const handleSelect = async (model: string) => {
    setOpen(false);
    await persist(model);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (!open) setOpen(true);
  };

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setOpen(false);
      await persist(inputValue);
    }
    if (e.key === 'Escape') {
      setOpen(false);
      // Revert input to last saved value
      setInputValue(value);
    }
  };

  const persist = async (model: string) => {
    if (!model.trim() || model === value) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateModel(model);
      if (result.ok) {
        setValue(model);
        onModelChange?.(model);
      } else {
        setError(result.error ?? 'Failed to save model');
        setInputValue(value); // revert
      }
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = (disabled ?? false) || loading || saving;

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
            <span className="truncate">
              {loading ? 'Loading models…' : saving ? 'Saving…' : (value ?? 'Select model…')}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search or type a model ID…"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
            />
            <CommandList>
              {!loading && filteredModels.length === 0 && (
                <CommandEmpty>
                  {models.length === 0
                    ? 'No models advertised for this agent.'
                    : 'No match — press Enter to use this value.'}
                </CommandEmpty>
              )}
              {filteredModels.length > 0 && (
                <CommandGroup>
                  {filteredModels.map((model) => (
                    <CommandItem
                      key={model}
                      selected={model === value}
                      onClick={() => handleSelect(model)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          model === value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {model}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {Boolean(error) && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
