'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Check, CheckIcon, ChevronsUpDown, GitBranch, Loader2 } from 'lucide-react';
import { BaseDrawer } from '@/components/common/base-drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { RepositoryOption } from '@/components/common/feature-create-drawer/feature-create-drawer';

export interface AdoptBranchDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (branchName: string, repositoryPath: string) => void;
  isSubmitting?: boolean;
  error?: string;
  /** Available repositories for the repository selector */
  repositories?: RepositoryOption[];
  /** Currently selected repository path */
  selectedRepositoryPath?: string;
  /** Callback when user selects a different repository */
  onRepositoryChange?: (repositoryPath: string) => void;
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
  repositories = [],
  selectedRepositoryPath,
  onRepositoryChange,
  branches = [],
  branchesLoading = false,
}: AdoptBranchDrawerProps) {
  const [branchName, setBranchName] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [repoOpen, setRepoOpen] = useState(false);
  const [repoQuery, setRepoQuery] = useState('');
  const repoInputRef = useRef<HTMLInputElement>(null);

  const selectedRepo = repositories.find((r) => r.path === selectedRepositoryPath);
  const hasRepo = !!selectedRepositoryPath;

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setBranchName('');
      setInputValue('');
      setComboboxOpen(false);
      setRepoOpen(false);
      setRepoQuery('');
    }
  }, [open]);

  // Reset branch selection when repository changes
  useEffect(() => {
    setBranchName('');
    setInputValue('');
  }, [selectedRepositoryPath]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = branchName.trim();
      if (!trimmed || !selectedRepositoryPath || isSubmitting) return;
      onSubmit(trimmed, selectedRepositoryPath);
    },
    [branchName, selectedRepositoryPath, isSubmitting, onSubmit]
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

  const handleRepoSelect = useCallback(
    (path: string) => {
      onRepositoryChange?.(path);
      setRepoOpen(false);
      setRepoQuery('');
    },
    [onRepositoryChange]
  );

  const filteredBranches = branches.filter((b) =>
    b.toLowerCase().includes(inputValue.toLowerCase())
  );

  const filteredRepos = repoQuery.trim()
    ? repositories.filter(
        (r) =>
          r.name.toLowerCase().includes(repoQuery.toLowerCase()) ||
          r.path.toLowerCase().includes(repoQuery.toLowerCase())
      )
    : repositories;

  useEffect(() => {
    if (repoOpen) {
      setTimeout(() => repoInputRef.current?.focus(), 0);
    } else {
      setRepoQuery('');
    }
  }, [repoOpen]);

  const isDisabled = !branchName.trim() || !selectedRepositoryPath || isSubmitting;

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
            {/* Repository selector */}
            <div className="flex flex-col gap-2">
              <Label>Repository</Label>
              <Popover open={repoOpen} onOpenChange={setRepoOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    role="combobox"
                    aria-expanded={repoOpen}
                    aria-label="Repository"
                    disabled={isSubmitting}
                    data-testid="adopt-repo-combobox"
                    className={cn(
                      'border-input bg-background ring-offset-background focus:ring-ring flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                      !selectedRepo && 'text-muted-foreground'
                    )}
                  >
                    <span className="truncate">
                      {selectedRepo ? selectedRepo.name : 'Select repository...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 p-0"
                  align="start"
                  data-testid="adopt-repo-combobox-content"
                >
                  <div className="flex flex-col">
                    <div className="border-b p-2">
                      <Input
                        ref={repoInputRef}
                        placeholder="Search repositories..."
                        value={repoQuery}
                        onChange={(e) => setRepoQuery(e.target.value)}
                        className="h-8 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                        data-testid="adopt-repo-search"
                      />
                    </div>
                    <div
                      className="max-h-48 overflow-y-auto py-1"
                      role="listbox"
                      aria-label="Repositories"
                    >
                      {filteredRepos.length === 0 ? (
                        <p className="text-muted-foreground px-3 py-2 text-sm">
                          No repositories found.
                        </p>
                      ) : (
                        filteredRepos.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            role="option"
                            aria-selected={selectedRepositoryPath === r.path}
                            onClick={() => handleRepoSelect(r.path)}
                            className={cn(
                              'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 px-3 py-2 text-sm',
                              selectedRepositoryPath === r.path && 'bg-accent/50'
                            )}
                            data-testid={`adopt-repo-option-${r.id}`}
                          >
                            <CheckIcon
                              className={cn(
                                'h-4 w-4 shrink-0',
                                selectedRepositoryPath !== r.path && 'invisible'
                              )}
                            />
                            <span className="flex flex-col items-start truncate">
                              <span className="truncate">{r.name}</span>
                              <span className="text-muted-foreground truncate text-xs">
                                {r.path}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <p className="text-muted-foreground text-xs">
                Select the repository that contains the branch you want to adopt.
              </p>
            </div>

            {/* Branch selector */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="branch-name">Branch name</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    disabled={isSubmitting || !hasRepo}
                    className="w-full justify-between font-normal"
                    data-testid="adopt-branch-input"
                  >
                    <span className="truncate">
                      {!hasRepo
                        ? 'Select a repository first...'
                        : branchesLoading
                          ? 'Loading branches...'
                          : branchName || 'Select a branch...'}
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
                {hasRepo
                  ? 'Select a branch from the dropdown or type to search. Local and remote branches are shown.'
                  : 'Please select a repository above to see available branches.'}
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
