'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, GitBranch, Loader2 } from 'lucide-react';
import { BaseDrawer } from '@/components/common/base-drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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

export interface AdoptBranchDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (branchName: string) => void;
  isSubmitting?: boolean;
  error?: string;
  /** Available branch names for the combobox dropdown */
  branches?: string[];
  /** Whether branches are still loading */
  branchesLoading?: boolean;
}

export function AdoptBranchDrawer({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  error,
  branches = [],
  branchesLoading = false,
}: AdoptBranchDrawerProps) {
  const [branchName, setBranchName] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setBranchName('');
      setInputValue('');
      setComboboxOpen(false);
    }
  }, [open]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = branchName.trim();
      if (!trimmed || isSubmitting) return;
      onSubmit(trimmed);
    },
    [branchName, isSubmitting, onSubmit]
  );

  const handleClose = useCallback(() => {
    setBranchName('');
    setInputValue('');
    onClose();
  }, [onClose]);

  const handleSelect = useCallback((branch: string) => {
    setBranchName(branch);
    setInputValue(branch);
    setComboboxOpen(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      if (!comboboxOpen) setComboboxOpen(true);
    },
    [comboboxOpen]
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (trimmed) {
          setBranchName(trimmed);
          setComboboxOpen(false);
        }
      }
      if (e.key === 'Escape') {
        setComboboxOpen(false);
        setInputValue(branchName);
      }
    },
    [inputValue, branchName]
  );

  const filteredBranches = branches.filter((b) =>
    b.toLowerCase().includes(inputValue.toLowerCase())
  );

  const isDisabled = !branchName.trim() || isSubmitting;

  const header = (
    <div>
      <DrawerTitle className="flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        Adopt Branch
      </DrawerTitle>
      <DrawerDescription className="text-muted-foreground text-sm">
        Import an existing git branch into Shep&apos;s feature tracking
      </DrawerDescription>
    </div>
  );

  return (
    <BaseDrawer
      open={open}
      onClose={handleClose}
      size="sm"
      modal={false}
      header={header}
      data-testid="adopt-branch-drawer"
    >
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="branch-name">Branch name</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    disabled={isSubmitting}
                    className="w-full justify-between font-normal"
                    data-testid="adopt-branch-input"
                  >
                    <span className="truncate">
                      {branchesLoading ? 'Loading branches...' : branchName || 'Select a branch...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      ref={inputRef}
                      placeholder="Search branches..."
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleInputKeyDown}
                      data-testid="adopt-branch-search"
                    />
                    <CommandList>
                      {!branchesLoading && filteredBranches.length === 0 && (
                        <CommandEmpty>
                          {branches.length === 0
                            ? 'No branches found.'
                            : inputValue
                              ? 'No match — press Enter to use this value.'
                              : 'No branches available.'}
                        </CommandEmpty>
                      )}
                      {branchesLoading ? (
                        <CommandEmpty>
                          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                        </CommandEmpty>
                      ) : null}
                      {filteredBranches.length > 0 && (
                        <CommandGroup>
                          {filteredBranches.map((branch) => (
                            <CommandItem
                              key={branch}
                              selected={branch === branchName}
                              onClick={() => handleSelect(branch)}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  branch === branchName ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <GitBranch className="mr-2 h-3 w-3 opacity-50" />
                              {branch}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-muted-foreground text-xs">
                Select a branch from the dropdown or type to search. Local and remote branches are
                shown.
              </p>
            </div>

            {error ? (
              <p className="text-destructive text-sm" data-testid="adopt-branch-error">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isDisabled}
              className="flex-1"
              data-testid="adopt-branch-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adopting...
                </>
              ) : (
                'Adopt Branch'
              )}
            </Button>
          </div>
        </div>
      </form>
    </BaseDrawer>
  );
}
