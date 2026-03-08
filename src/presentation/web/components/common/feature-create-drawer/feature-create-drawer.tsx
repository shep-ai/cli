'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  PlusIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  CodeIcon,
  Trash2Icon,
  ChevronsUpDown,
  CheckIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSoundAction } from '@/hooks/use-sound-action';
import { BaseDrawer } from '@/components/common/base-drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGuardedDrawerClose } from '@/hooks/drawer-close-guard';
import type { FileAttachment } from '@shepai/core/infrastructure/services/file-dialog.service';
import type { WorkflowDefaults } from '@/app/actions/get-workflow-defaults';
import { AgentModelPicker } from '@/components/features/settings/AgentModelPicker';
import { pickFiles } from './pick-files';

export type { FileAttachment } from '@shepai/core/infrastructure/services/file-dialog.service';

/** Minimal feature descriptor for the parent selector. */
export interface ParentFeatureOption {
  id: string;
  name: string;
}

export interface FeatureCreatePayload {
  description: string;
  attachments: FileAttachment[];
  repositoryPath: string;
  approvalGates: {
    allowPrd: boolean;
    allowPlan: boolean;
    allowMerge: boolean;
  };
  push: boolean;
  openPr: boolean;
  parentId?: string;
  /** When true, skip SDLC phases and implement directly from the prompt. */
  fast: boolean;
  /** Optional agent type override for this feature run */
  agentType?: string;
  /** Optional model override for this feature run */
  model?: string;
}

const AUTO_APPROVE_OPTIONS = [
  { id: 'allowPrd', label: 'PRD', description: 'Auto-approve requirements move to planning.' },
  { id: 'allowPlan', label: 'Plan', description: 'Auto-approve planning move to implementation.' },
  { id: 'allowMerge', label: 'Merge', description: 'Auto-approve merge move to Done.' },
];

const EMPTY_GATES: Record<string, boolean> = {
  allowPrd: false,
  allowPlan: false,
  allowMerge: false,
};

export interface FeatureCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FeatureCreatePayload) => void;
  repositoryPath: string;
  isSubmitting?: boolean;
  workflowDefaults?: WorkflowDefaults;
  /** List of existing features available for selection as a parent. */
  features?: ParentFeatureOption[];
  /** Pre-select a parent feature when the drawer opens (e.g. from (+) button on a feature node). */
  initialParentId?: string;
  /** Current global agent type from settings */
  currentAgentType?: string;
  /** Current global model from settings */
  currentModel?: string;
}

export function FeatureCreateDrawer({
  open,
  onClose,
  onSubmit,
  repositoryPath,
  isSubmitting = false,
  workflowDefaults,
  features,
  initialParentId,
  currentAgentType,
  currentModel,
}: FeatureCreateDrawerProps) {
  const createSound = useSoundAction('create');
  const defaultGates = workflowDefaults?.approvalGates ?? EMPTY_GATES;
  const defaultPush = workflowDefaults?.push ?? false;
  const defaultOpenPr = workflowDefaults?.openPr ?? false;

  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [approvalGates, setApprovalGates] = useState<Record<string, boolean>>({ ...defaultGates });
  const [push, setPush] = useState(defaultPush);
  const [openPr, setOpenPr] = useState(defaultOpenPr);
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [fast, setFast] = useState(false);
  const [overrideAgent, setOverrideAgent] = useState<string | undefined>(undefined);
  const [overrideModel, setOverrideModel] = useState<string | undefined>(undefined);

  // Sync state when workflowDefaults load asynchronously
  useEffect(() => {
    if (workflowDefaults) {
      setApprovalGates({ ...workflowDefaults.approvalGates });
      setPush(workflowDefaults.push);
      setOpenPr(workflowDefaults.openPr);
    }
  }, [workflowDefaults]);

  // Pre-select parent when initialParentId changes (e.g. (+) button on feature node)
  useEffect(() => {
    if (open && initialParentId) {
      setParentId(initialParentId);
    }
  }, [open, initialParentId]);

  const resetForm = useCallback(() => {
    setDescription('');
    setAttachments([]);
    setApprovalGates({ ...defaultGates });
    setPush(defaultPush);
    setOpenPr(defaultOpenPr);
    setParentId(undefined);
    setFast(false);
    setOverrideAgent(undefined);
    setOverrideModel(undefined);
  }, [defaultGates, defaultPush, defaultOpenPr]);

  // Track whether the form has unsaved data
  const isDirty = description.trim() !== '' || attachments.length > 0;

  // Shared close guard — shows confirmation when dirty, prevents navigation
  const { attemptClose } = useGuardedDrawerClose({ open, isDirty, onClose, onReset: resetForm });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!description.trim()) return;
      createSound.play();
      onSubmit({
        description: description.trim(),
        attachments,
        repositoryPath,
        approvalGates: {
          allowPrd: approvalGates.allowPrd ?? false,
          allowPlan: approvalGates.allowPlan ?? false,
          allowMerge: approvalGates.allowMerge ?? false,
        },
        push: push || openPr,
        openPr,
        fast,
        ...(overrideAgent ? { agentType: overrideAgent } : {}),
        ...(overrideModel ? { model: overrideModel } : {}),
        ...(parentId ? { parentId } : {}),
      });
      resetForm();
    },
    [
      description,
      attachments,
      approvalGates,
      repositoryPath,
      onSubmit,
      push,
      openPr,
      fast,
      overrideAgent,
      overrideModel,
      parentId,
      createSound,
      resetForm,
    ]
  );

  const handleAddFiles = useCallback(async () => {
    try {
      const files = await pickFiles();
      if (files) {
        setAttachments((prev) => [...prev, ...files]);
      }
    } catch {
      // Native dialog failed — silently ignore (user can retry)
    }
  }, []);

  const handleRemoveFile = useCallback((path: string) => {
    setAttachments((prev) => prev.filter((f) => f.path !== path));
  }, []);

  const hasFeatures = features && features.length > 0;

  return (
    <BaseDrawer
      open={open}
      onClose={attemptClose}
      size="md"
      modal={false}
      dismissOnOutsideClick
      data-testid="feature-create-drawer"
      header={
        <>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
            <DrawerTitle>NEW FEATURE</DrawerTitle>
          </div>
          {isSubmitting ? (
            <DrawerDescription asChild>
              <div>
                <Badge variant="secondary">Creating...</Badge>
              </div>
            </DrawerDescription>
          ) : null}
        </>
      }
      footer={
        <div className="flex flex-row justify-end gap-2">
          <Button variant="outline" onClick={attemptClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-feature-form"
            disabled={!description.trim() || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : '+ Create Feature'}
          </Button>
        </div>
      }
    >
      {/* Form body */}
      <div className="overflow-y-auto p-4">
        <TooltipProvider delayDuration={400}>
          <form id="create-feature-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Description + inline controls */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="feature-description"
                className="text-muted-foreground text-xs font-semibold tracking-wider"
              >
                DESCRIBE YOUR FEATURE
              </Label>
              <div className="border-input focus-within:ring-ring/50 focus-within:border-ring overflow-hidden rounded-md border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
                <Textarea
                  id="feature-description"
                  placeholder="e.g. Add GitHub OAuth login with callback handling and token refresh..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={7}
                  required
                  disabled={isSubmitting}
                  className="field-sizing-fixed min-h-42! resize-none rounded-none border-0 shadow-none focus-visible:ring-0"
                />
                <div className="border-input flex items-center gap-3 border-t px-3 py-1.5">
                  <AgentModelPicker
                    initialAgentType={overrideAgent ?? currentAgentType ?? 'claude-code'}
                    initialModel={overrideModel ?? currentModel ?? 'claude-sonnet-4-6'}
                    mode="override"
                    onAgentModelChange={(agent, model) => {
                      setOverrideAgent(agent);
                      setOverrideModel(model);
                    }}
                    disabled={isSubmitting}
                    className="w-55"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="ml-auto flex cursor-pointer items-center gap-2">
                        <Switch
                          id="fast-mode"
                          checked={fast}
                          onCheckedChange={setFast}
                          disabled={isSubmitting}
                        />
                        <Label htmlFor="fast-mode" className="cursor-pointer text-sm font-medium">
                          Fast Mode
                        </Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Skip SDLC phases and implement directly from your prompt.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Parent feature selector (only when opened from a feature node) */}
            {hasFeatures && initialParentId !== undefined ? (
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="parent-feature"
                  className="text-muted-foreground text-xs font-semibold tracking-wider"
                >
                  PARENT FEATURE
                </Label>
                <ParentFeatureCombobox
                  features={features}
                  value={parentId}
                  onChange={setParentId}
                  disabled={isSubmitting}
                />
              </div>
            ) : null}

            {/* Approve + Git — compact switch groups */}
            <div className="flex flex-col gap-2">
              {/* Approve row */}
              <div className="border-input flex items-center gap-4 rounded-md border px-3 py-2.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground w-16 shrink-0 cursor-default text-xs font-semibold tracking-wider">
                      APPROVE
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Auto-approve phase transitions without manual review.
                  </TooltipContent>
                </Tooltip>
                <div className="flex flex-1 items-center gap-4">
                  {AUTO_APPROVE_OPTIONS.map((opt) => (
                    <Tooltip key={opt.id}>
                      <TooltipTrigger asChild>
                        <div className="flex cursor-pointer items-center gap-1.5">
                          <Switch
                            id={`approve-${opt.id}`}
                            size="sm"
                            checked={approvalGates[opt.id] ?? false}
                            onCheckedChange={(v) =>
                              setApprovalGates((prev) => ({ ...prev, [opt.id]: v }))
                            }
                            disabled={
                              isSubmitting ||
                              (fast && (opt.id === 'allowPrd' || opt.id === 'allowPlan'))
                            }
                          />
                          <Label
                            htmlFor={`approve-${opt.id}`}
                            className="cursor-pointer text-xs font-medium"
                          >
                            {opt.label}
                          </Label>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {fast && (opt.id === 'allowPrd' || opt.id === 'allowPlan')
                          ? 'Skipped in Fast Mode'
                          : opt.description}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                {/* Select all shortcut */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        const allOn = AUTO_APPROVE_OPTIONS.every((o) => approvalGates[o.id]);
                        const next: Record<string, boolean> = {};
                        for (const o of AUTO_APPROVE_OPTIONS) next[o.id] = !allOn;
                        setApprovalGates(next);
                      }}
                      disabled={isSubmitting}
                      className={cn(
                        'text-muted-foreground hover:text-foreground cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase transition-colors',
                        AUTO_APPROVE_OPTIONS.every((o) => approvalGates[o.id]) && 'text-primary'
                      )}
                    >
                      All
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Toggle all approval gates</TooltipContent>
                </Tooltip>
              </div>

              {/* Git row */}
              <div className="border-input flex items-center gap-4 rounded-md border px-3 py-2.5">
                <span className="text-muted-foreground w-16 shrink-0 text-xs font-semibold tracking-wider">
                  GIT
                </span>
                <div className="flex flex-1 items-center gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-pointer items-center gap-1.5">
                        <Switch
                          id="push"
                          size="sm"
                          checked={push || openPr}
                          onCheckedChange={(v) => {
                            setPush(v);
                            if (!v && openPr) setOpenPr(false);
                          }}
                          disabled={isSubmitting}
                        />
                        <Label htmlFor="push" className="cursor-pointer text-xs font-medium">
                          Push
                        </Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Push branch to remote after implementation.
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-pointer items-center gap-1.5">
                        <Switch
                          id="open-pr"
                          size="sm"
                          checked={openPr}
                          onCheckedChange={setOpenPr}
                          disabled={isSubmitting}
                        />
                        <Label htmlFor="open-pr" className="cursor-pointer text-xs font-medium">
                          PR
                        </Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Open a pull request after pushing.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs font-semibold tracking-wider">
                  ATTACHMENTS
                  {attachments.length > 0 && (
                    <span className="text-muted-foreground/60 ml-1.5">({attachments.length})</span>
                  )}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleAddFiles}
                  disabled={isSubmitting}
                >
                  <PlusIcon className="size-3" />
                  Add Files
                </Button>
              </div>

              {attachments.length > 0 && (
                <div className="flex flex-col gap-2">
                  {attachments.map((file) => (
                    <AttachmentCard
                      key={file.path}
                      file={file}
                      onRemove={() => handleRemoveFile(file.path)}
                      disabled={isSubmitting}
                    />
                  ))}
                </div>
              )}
            </div>
          </form>
        </TooltipProvider>
      </div>
    </BaseDrawer>
  );
}

/* ---------------------------------------------------------------------------
 * ParentFeatureCombobox — searchable dropdown for parent feature selection
 * ------------------------------------------------------------------------- */

interface ParentFeatureComboboxProps {
  features: ParentFeatureOption[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
}

function ParentFeatureCombobox({
  features,
  value,
  onChange,
  disabled,
}: ParentFeatureComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedFeature = features.find((f) => f.id === value);

  const filtered = query.trim()
    ? features.filter(
        (f) =>
          f.name.toLowerCase().includes(query.toLowerCase()) ||
          f.id.toLowerCase().includes(query.toLowerCase())
      )
    : features;

  const handleSelect = useCallback(
    (id: string | undefined) => {
      onChange(id);
      setOpen(false);
      setQuery('');
    },
    [onChange]
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id="parent-feature"
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Parent Feature"
          disabled={disabled}
          data-testid="parent-feature-combobox"
          className={cn(
            'border-input bg-background ring-offset-background focus:ring-ring flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            !selectedFeature && 'text-muted-foreground'
          )}
        >
          <span className="truncate">
            {selectedFeature
              ? `${selectedFeature.name} (${selectedFeature.id.slice(0, 8)})`
              : 'Select parent feature...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        data-testid="parent-feature-combobox-content"
      >
        <div className="flex flex-col">
          {/* Search input */}
          <div className="border-b p-2">
            <Input
              ref={inputRef}
              placeholder="Search features..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
              data-testid="parent-feature-search"
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto py-1" role="listbox" aria-label="Features">
            {/* No parent option */}
            <button
              type="button"
              role="option"
              aria-selected={value === undefined}
              onClick={() => handleSelect(undefined)}
              className={cn(
                'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 px-3 py-2 text-sm',
                value === undefined && 'bg-accent/50'
              )}
              data-testid="parent-feature-option-none"
            >
              <CheckIcon className={cn('h-4 w-4 shrink-0', value !== undefined && 'invisible')} />
              <span className="text-muted-foreground italic">No parent</span>
            </button>

            {filtered.length === 0 && query ? (
              <p className="text-muted-foreground px-3 py-2 text-sm">No features found.</p>
            ) : (
              filtered.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="option"
                  aria-selected={value === f.id}
                  onClick={() => handleSelect(f.id)}
                  className={cn(
                    'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 px-3 py-2 text-sm',
                    value === f.id && 'bg-accent/50'
                  )}
                  data-testid={`parent-feature-option-${f.id}`}
                >
                  <CheckIcon className={cn('h-4 w-4 shrink-0', value !== f.id && 'invisible')} />
                  <span className="truncate">
                    {f.name}{' '}
                    <span className="text-muted-foreground font-mono text-xs">
                      ({f.id.slice(0, 8)})
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------------------------------------------------------------------
 * Private sub-components & utilities
 * ------------------------------------------------------------------------- */

function AttachmentCard({
  file,
  onRemove,
  disabled,
}: {
  file: FileAttachment;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const ext = getExtension(file.name);
  const Icon = getFileIcon(ext);
  const iconColorClass = getFileIconColor(ext);

  return (
    <div className="flex items-center gap-3 rounded-md border p-2">
      <div
        className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded', iconColorClass)}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{file.name}</span>
        <span className="text-muted-foreground truncate text-xs">{file.path}</span>
        <span className="text-muted-foreground text-xs">{formatFileSize(file.size)}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${file.name}`}
      >
        <Trash2Icon className="h-3 w-3" />
      </Button>
    </div>
  );
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']);
const CODE_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.html',
  '.css',
  '.md',
]);

function getFileIcon(ext: string): LucideIcon {
  if (IMAGE_EXTS.has(ext)) return ImageIcon;
  if (ext === '.pdf') return FileTextIcon;
  if (CODE_EXTS.has(ext)) return CodeIcon;
  return FileIcon;
}

function getFileIconColor(ext: string): string {
  if (ext === '.pdf') return 'bg-red-50 text-red-600';
  if (IMAGE_EXTS.has(ext)) return 'bg-blue-50 text-blue-600';
  if (CODE_EXTS.has(ext)) return 'bg-emerald-50 text-emerald-600';
  return 'bg-gray-50 text-gray-600';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
