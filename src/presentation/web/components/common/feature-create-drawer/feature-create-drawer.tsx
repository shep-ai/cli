'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  PaperclipIcon,
  ChevronsUpDown,
  CheckIcon,
  Zap,
  Clock,
  FolderPlus,
  Loader2,
  Github,
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
import { AttachmentChip } from '@/components/common/attachment-chip';
import type { WorkflowDefaults } from '@/app/actions/get-workflow-defaults';
import { AgentModelPicker } from '@/components/features/settings/AgentModelPicker';
import { Separator } from '@/components/ui/separator';
import { pickFolder } from '@/components/common/add-repository-button/pick-folder';
import { ReactFileManagerDialog } from '@/components/common/react-file-manager-dialog';
import { useFeatureFlags } from '@/hooks/feature-flags-context';
import { addRepository } from '@/app/actions/add-repository';
import { GitHubImportDialog } from '@/components/common/github-import-dialog';
import type { Repository } from '@shepai/core/domain/generated/output';
import { pickFiles } from './pick-files';

export type { FileAttachment } from '@shepai/core/infrastructure/services/file-dialog.service';

/** Attachment record for the create form — supports both picker and upload sources. */
export interface FormAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  path: string;
  loading?: boolean;
}

/** Minimal feature descriptor for the parent selector. */
export interface ParentFeatureOption {
  id: string;
  name: string;
}

/** Minimal repository descriptor for the repository selector. */
export interface RepositoryOption {
  id: string;
  name: string;
  path: string;
}

export interface FeatureCreatePayload {
  description: string;
  attachments: FormAttachment[];
  repositoryPath: string;
  approvalGates: {
    allowPrd: boolean;
    allowPlan: boolean;
    allowMerge: boolean;
  };
  push: boolean;
  openPr: boolean;
  ciWatchEnabled: boolean;
  enableEvidence: boolean;
  commitEvidence: boolean;
  parentId?: string;
  /** When true, skip SDLC phases and implement directly from the prompt. */
  fast: boolean;
  /** When true, create the feature in pending state (no agent spawned). */
  pending?: boolean;
  /** Optional agent type override for this feature run */
  agentType?: string;
  /** Optional model override for this feature run */
  model?: string;
  sessionId?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.ico',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.swift',
  '.kt',
  '.html',
  '.css',
  '.scss',
  '.less',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.env',
  '.zip',
  '.tar',
  '.gz',
  '.log',
]);

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
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
  /** List of tracked repositories for selection when repo context is missing. */
  repositories?: RepositoryOption[];
  /** Pre-select a parent feature when the drawer opens (e.g. from (+) button on a feature node). */
  initialParentId?: string;
  /** Current global agent type from settings */
  currentAgentType?: string;
  /** Current global model from settings */
  currentModel?: string;
  /** Pre-fill the description textarea (e.g. from session context) */
  initialDescription?: string;
}

export function FeatureCreateDrawer({
  open,
  onClose,
  onSubmit,
  repositoryPath,
  isSubmitting = false,
  workflowDefaults,
  features,
  repositories,
  initialParentId,
  currentAgentType,
  currentModel,
  initialDescription,
}: FeatureCreateDrawerProps) {
  const createSound = useSoundAction('create');
  // Validate repositoryPath from URL against active repos — prevents stale URL params
  // from selecting deleted repos after add/delete/re-add cycles.
  // Trust the prop when: repos not loaded yet (undefined), empty list (no repos to check),
  // or the path matches an active repo.
  const validRepoPath = !repositoryPath
    ? ''
    : !repositories ||
        repositories.length === 0 ||
        repositories.some((r) => r.path === repositoryPath)
      ? repositoryPath
      : '';
  const defaultGates = workflowDefaults?.approvalGates ?? EMPTY_GATES;
  const defaultPush = workflowDefaults?.push ?? false;
  const defaultOpenPr = workflowDefaults?.openPr ?? false;
  const defaultCiWatch = workflowDefaults?.ciWatchEnabled !== false;
  const defaultEnableEvidence = workflowDefaults?.enableEvidence ?? false;
  const defaultCommitEvidence = workflowDefaults?.commitEvidence ?? false;

  const [description, setDescription] = useState(initialDescription ?? '');

  // Sync description when initialDescription prop changes (e.g. from session context)
  useEffect(() => {
    if (initialDescription) {
      setDescription(initialDescription);
    }
  }, [initialDescription]);

  const [attachments, setAttachments] = useState<FormAttachment[]>([]);
  const [approvalGates, setApprovalGates] = useState<Record<string, boolean>>({ ...defaultGates });
  const [push, setPush] = useState(defaultPush);
  const [openPr, setOpenPr] = useState(defaultOpenPr);
  const [ciWatchEnabled, setCiWatchEnabled] = useState(workflowDefaults?.ciWatchEnabled !== false);
  const [enableEvidence, setEnableEvidence] = useState(defaultEnableEvidence);
  const [commitEvidence, setCommitEvidence] = useState(defaultCommitEvidence);
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [fast, setFast] = useState(false);
  const [pending, setPending] = useState(false);
  const [overrideAgent, setOverrideAgent] = useState<string | undefined>(undefined);
  const [overrideModel, setOverrideModel] = useState<string | undefined>(undefined);
  const [selectedRepoPath, setSelectedRepoPath] = useState<string | undefined>(
    validRepoPath || undefined
  );
  const [localRepos, setLocalRepos] = useState<RepositoryOption[]>(repositories ?? []);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPromptFocused, setIsPromptFocused] = useState(false);

  // Stable sessionId per mount — used for upload dedup grouping
  const sessionIdRef = useRef(crypto.randomUUID());
  const dragCounterRef = useRef(0);
  const promptContainerRef = useRef<HTMLDivElement>(null);

  // Sync state when workflowDefaults load asynchronously
  useEffect(() => {
    if (workflowDefaults) {
      setApprovalGates({ ...workflowDefaults.approvalGates });
      setPush(workflowDefaults.push);
      setOpenPr(workflowDefaults.openPr);
      setCiWatchEnabled(workflowDefaults.ciWatchEnabled !== false);
      setEnableEvidence(workflowDefaults.enableEvidence);
      setCommitEvidence(workflowDefaults.commitEvidence);
    }
  }, [workflowDefaults]);

  // Sync localRepos when repositories prop changes
  useEffect(() => {
    setLocalRepos(repositories ?? []);
  }, [repositories]);

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
    setCiWatchEnabled(defaultCiWatch);
    setEnableEvidence(defaultEnableEvidence);
    setCommitEvidence(defaultCommitEvidence);
    setParentId(undefined);
    setSelectedRepoPath(validRepoPath || undefined);
    setLocalRepos(repositories ?? []);
    setFast(false);
    setPending(false);
    setOverrideAgent(undefined);
    setOverrideModel(undefined);
    setUploadError(null);
    dragCounterRef.current = 0;
    setIsDragOver(false);
  }, [
    defaultGates,
    defaultPush,
    defaultOpenPr,
    defaultEnableEvidence,
    defaultCiWatch,
    defaultCommitEvidence,
    validRepoPath,
    repositories,
  ]);

  // Track whether the form has unsaved data
  const isDirty = description.trim() !== '' || attachments.length > 0;

  // Shared close guard — shows confirmation when dirty, prevents navigation
  const { attemptClose } = useGuardedDrawerClose({ open, isDirty, onClose, onReset: resetForm });

  /** Validate and upload files from drop or paste. */
  const handleFiles = useCallback(async (fileList: File[]) => {
    setUploadError(null);

    for (const file of fileList) {
      // Client-side size validation
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`"${file.name}" exceeds 10 MB limit`);
        return;
      }
      // Client-side extension validation
      const ext = getExtension(file.name);
      if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
        setUploadError(`File type "${ext}" is not allowed`);
        return;
      }
    }

    for (const file of fileList) {
      const tempId = crypto.randomUUID();

      // Optimistic loading placeholder
      setAttachments((prev) => [
        ...prev,
        {
          id: tempId,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          path: '',
          loading: true,
        },
      ]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', sessionIdRef.current);

        const res = await fetch('/api/attachments/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Upload failed' }));
          // Remove loading placeholder on error
          setAttachments((prev) => prev.filter((a) => a.id !== tempId));
          setUploadError(body.error ?? 'Upload failed');
          return;
        }

        const uploaded = await res.json();
        // Server dedup may return the same path for identical content — drop the duplicate.
        setAttachments((prev) => {
          const isDupe = prev.some((a) => a.id !== tempId && a.path === uploaded.path);
          if (isDupe) return prev.filter((a) => a.id !== tempId);
          return prev.map((a) =>
            a.id === tempId ? { ...uploaded, id: tempId, loading: false } : a
          );
        });
      } catch {
        setAttachments((prev) => prev.filter((a) => a.id !== tempId));
        setUploadError('Upload failed');
      }
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!description.trim()) return;
      const effectiveRepoPath = selectedRepoPath ?? validRepoPath;
      if (!effectiveRepoPath) return;
      createSound.play();
      onSubmit({
        description: description.trim(),
        attachments: attachments.filter((a) => !a.loading),
        repositoryPath: effectiveRepoPath,
        approvalGates: {
          allowPrd: approvalGates.allowPrd ?? false,
          allowPlan: approvalGates.allowPlan ?? false,
          allowMerge: approvalGates.allowMerge ?? false,
        },
        push: push || openPr,
        openPr,
        ciWatchEnabled,
        enableEvidence,
        commitEvidence,
        fast,
        ...(pending ? { pending } : {}),
        ...(overrideAgent ? { agentType: overrideAgent } : {}),
        ...(overrideModel ? { model: overrideModel } : {}),
        ...(parentId ? { parentId } : {}),
        sessionId: sessionIdRef.current,
      });
      resetForm();
    },
    [
      description,
      attachments,
      approvalGates,
      selectedRepoPath,
      validRepoPath,
      onSubmit,
      push,
      openPr,
      enableEvidence,
      ciWatchEnabled,
      commitEvidence,
      fast,
      pending,
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
      if (!files) return;

      for (const file of files) {
        const tempId = crypto.randomUUID();

        setAttachments((prev) => [
          ...prev,
          {
            id: tempId,
            name: file.name,
            size: file.size,
            mimeType: 'application/octet-stream',
            path: '',
            loading: true,
          },
        ]);

        try {
          const res = await fetch('/api/attachments/upload-from-path', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: file.path, sessionId: sessionIdRef.current }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({ error: 'Upload failed' }));
            setAttachments((prev) => prev.filter((a) => a.id !== tempId));
            setUploadError(body.error ?? 'Upload failed');
            return;
          }

          const uploaded = await res.json();
          setAttachments((prev) => {
            const isDupe = prev.some((a) => a.id !== tempId && a.path === uploaded.path);
            if (isDupe) return prev.filter((a) => a.id !== tempId);
            return prev.map((a) =>
              a.id === tempId ? { ...uploaded, id: tempId, loading: false } : a
            );
          });
        } catch {
          setAttachments((prev) => prev.filter((a) => a.id !== tempId));
          setUploadError('Upload failed');
        }
      }
    } catch {
      // Native dialog failed — silently ignore (user can retry)
    }
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const formRef = useRef<HTMLFormElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }, []);

  const handlePromptFocus = useCallback(() => {
    setIsPromptFocused(true);
  }, []);

  const handlePromptBlur = useCallback(() => {
    // Defer the check so focus has time to settle on the new target.
    // This correctly handles Radix portals (e.g. AgentModelPicker popover) that
    // render outside the container DOM but are logically part of the prompt area.
    setTimeout(() => {
      const withinContainer = promptContainerRef.current?.contains(document.activeElement);
      const pickerPopoverOpen =
        promptContainerRef.current?.querySelector('[aria-expanded="true"]') !== null;
      if (!withinContainer && !pickerPopoverOpen) {
        setIsPromptFocused(false);
      }
    }, 0);
  }, []);

  const hasFeatures = features && features.length > 0;
  const needsRepo = !validRepoPath && !selectedRepoPath;
  const showRepoSelector = !validRepoPath && repositories !== undefined;

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
            disabled={!description.trim() || isSubmitting || needsRepo}
          >
            {isSubmitting ? 'Creating...' : '+ Create Feature'}
          </Button>
        </div>
      }
    >
      {/* Form body */}
      <div className="overflow-y-auto p-4">
        <TooltipProvider delayDuration={400}>
          <form
            ref={formRef}
            id="create-feature-form"
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            className="flex flex-col gap-4"
          >
            {/* Repository selector (only when opened from sidebar without repo context) */}
            {showRepoSelector ? (
              <div className="flex flex-col gap-1.5" data-testid="repo-selector-section">
                <Label className="text-muted-foreground text-xs font-semibold tracking-wider">
                  REPOSITORY
                </Label>
                <RepositoryCombobox
                  repositories={localRepos}
                  value={selectedRepoPath}
                  onChange={setSelectedRepoPath}
                  onAddRepository={(repo) => {
                    setLocalRepos((prev) => [...prev, repo]);
                    setSelectedRepoPath(repo.path);
                  }}
                  disabled={isSubmitting}
                />
              </div>
            ) : validRepoPath ? (
              <div className="flex flex-col gap-1.5" data-testid="repo-readonly-section">
                <Label className="text-muted-foreground text-xs font-semibold tracking-wider">
                  REPOSITORY
                </Label>
                <p className="text-sm" data-testid="repo-readonly-label">
                  {repositories?.find((r) => r.path === validRepoPath)?.name ??
                    validRepoPath.split('/').pop()}
                </p>
              </div>
            ) : null}

            {/* Description + inline controls with drop zone */}
            <div
              role="region"
              aria-label="File drop zone"
              data-drag-over={isDragOver ? 'true' : 'false'}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={cn(
                'flex flex-col gap-1.5 rounded-md border-2 border-transparent p-1 transition-colors',
                isDragOver && 'border-primary/50 bg-primary/5'
              )}
            >
              <Label
                htmlFor="feature-description"
                className="text-muted-foreground text-xs font-semibold tracking-wider"
              >
                DESCRIBE YOUR FEATURE
              </Label>
              <div
                ref={promptContainerRef}
                onFocus={handlePromptFocus}
                onBlur={handlePromptBlur}
                className={cn(
                  'border-input flex h-56 flex-col overflow-hidden rounded-md border shadow-xs transition-[color,box-shadow]',
                  isPromptFocused && 'ring-ring/50 border-ring ring-[3px]'
                )}
              >
                <Textarea
                  id="feature-description"
                  placeholder="e.g. Add GitHub OAuth login with callback handling and token refresh..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onPaste={handlePaste}
                  required
                  disabled={isSubmitting}
                  className="min-h-0 flex-1 resize-none rounded-none border-0 shadow-none focus-visible:ring-0"
                />
                {/* Inline attachment chips — between textarea and controls */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
                    {attachments.map((file) => (
                      <AttachmentChip
                        key={file.id}
                        name={file.name}
                        size={file.size}
                        mimeType={file.mimeType}
                        path={file.path}
                        onRemove={() => handleRemoveFile(file.id)}
                        disabled={isSubmitting}
                        loading={file.loading}
                      />
                    ))}
                  </div>
                )}
                {uploadError ? (
                  <p className="text-destructive px-3 pb-2 text-xs">{uploadError}</p>
                ) : null}
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
                          id="pending-mode"
                          checked={pending}
                          onCheckedChange={setPending}
                          disabled={isSubmitting}
                        />
                        <Label
                          htmlFor="pending-mode"
                          className="flex cursor-pointer items-center gap-1 text-sm font-medium"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Pending
                        </Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Create without starting — start manually later.
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-pointer items-center gap-2">
                        <Switch
                          id="fast-mode"
                          checked={fast}
                          onCheckedChange={setFast}
                          disabled={isSubmitting}
                        />
                        <Label
                          htmlFor="fast-mode"
                          className="flex cursor-pointer items-center gap-1 text-sm font-medium"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Fast Mode
                        </Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Skip SDLC phases and implement directly from your prompt.
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleAddFiles}
                        disabled={isSubmitting}
                        aria-label="Attach files"
                        className="text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors"
                      >
                        <PaperclipIcon className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Attach files</TooltipContent>
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

              {/* Evidence row */}
              <div className="border-input flex items-center gap-4 rounded-md border px-3 py-2.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground w-16 shrink-0 cursor-default text-xs font-semibold tracking-wider">
                      EVIDENCE
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Collect and attach evidence after implementation.
                  </TooltipContent>
                </Tooltip>
                <div className="flex flex-1 items-center gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-pointer items-center gap-1.5">
                        <Switch
                          id="enable-evidence"
                          size="sm"
                          checked={enableEvidence}
                          onCheckedChange={(v) => {
                            setEnableEvidence(v);
                            if (!v) setCommitEvidence(false);
                          }}
                          disabled={isSubmitting}
                        />
                        <Label
                          htmlFor="enable-evidence"
                          className="cursor-pointer text-xs font-medium"
                        >
                          Collect
                        </Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Capture screenshots and artifacts after implementation.
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-pointer items-center gap-1.5">
                        <Switch
                          id="commit-evidence"
                          size="sm"
                          checked={commitEvidence}
                          onCheckedChange={setCommitEvidence}
                          disabled={isSubmitting || !enableEvidence || !openPr}
                        />
                        <Label
                          htmlFor="commit-evidence"
                          className={cn(
                            'cursor-pointer text-xs font-medium',
                            (!enableEvidence || !openPr) && 'opacity-50'
                          )}
                        >
                          Add to PR
                        </Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {!openPr
                        ? 'Requires PR to be enabled'
                        : !enableEvidence
                          ? 'Requires evidence collection to be enabled'
                          : 'Include evidence in the pull request body.'}
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                          onCheckedChange={(v) => {
                            setOpenPr(v);
                            if (!v) setCommitEvidence(false);
                          }}
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-pointer items-center gap-1.5">
                        <Switch
                          id="ci-watch"
                          size="sm"
                          checked={ciWatchEnabled}
                          onCheckedChange={setCiWatchEnabled}
                          disabled={isSubmitting}
                        />
                        <Label htmlFor="ci-watch" className="cursor-pointer text-xs font-medium">
                          Watch
                        </Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Watch CI and auto-fix after push.</TooltipContent>
                  </Tooltip>
                </div>
              </div>
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
 * RepositoryCombobox — searchable dropdown for repository selection
 * ------------------------------------------------------------------------- */

export interface RepositoryComboboxProps {
  repositories: RepositoryOption[];
  value: string | undefined;
  onChange: (path: string | undefined) => void;
  onAddRepository?: (repo: RepositoryOption) => void;
  disabled?: boolean;
}

export function RepositoryCombobox({
  repositories,
  value,
  onChange,
  onAddRepository,
  disabled,
}: RepositoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [showGitHubImport, setShowGitHubImport] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { reactFileManager: useReactFileManager, githubImport } = useFeatureFlags();

  const selectedRepo = repositories.find((r) => r.path === value);

  const filtered = query.trim()
    ? repositories.filter(
        (r) =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.path.toLowerCase().includes(query.toLowerCase())
      )
    : repositories;

  const handleSelect = useCallback(
    (path: string | undefined) => {
      onChange(path);
      setOpen(false);
      setQuery('');
    },
    [onChange]
  );

  const addRepoFromPath = useCallback(
    async (folderPath: string) => {
      const result = await addRepository({ path: folderPath });
      if (result.error) {
        setAddError(result.error);
        setIsAdding(false);
        return;
      }
      if (result.repository) {
        const newRepo: RepositoryOption = {
          id: result.repository.id,
          name: result.repository.name,
          path: result.repository.path,
        };
        onAddRepository?.(newRepo);
        onChange(newRepo.path);
        setOpen(false);
        setQuery('');
      }
    },
    [onAddRepository, onChange]
  );

  const handleAddRepository = useCallback(async () => {
    if (isAdding) return;

    if (useReactFileManager) {
      setShowReactPicker(true);
      return;
    }

    setIsAdding(true);
    setAddError(null);
    try {
      const folderPath = await pickFolder();
      if (!folderPath) {
        setIsAdding(false);
        return;
      }
      await addRepoFromPath(folderPath);
    } catch {
      // Native picker failed — fall back to React file manager
      setShowReactPicker(true);
    } finally {
      setIsAdding(false);
    }
  }, [isAdding, useReactFileManager, addRepoFromPath]);

  const handleGitHubImportComplete = useCallback(
    (repository: Repository) => {
      const newRepo: RepositoryOption = {
        id: repository.id,
        name: repository.name,
        path: repository.path,
      };
      onAddRepository?.(newRepo);
      onChange(newRepo.path);
      setOpen(false);
      setQuery('');
      setShowGitHubImport(false);
    },
    [onAddRepository, onChange]
  );

  const handleReactPickerSelect = useCallback(
    async (path: string | null) => {
      setShowReactPicker(false);
      if (!path) return;
      setIsAdding(true);
      setAddError(null);
      try {
        await addRepoFromPath(path);
      } catch (err: unknown) {
        setAddError(err instanceof Error ? err.message : 'Failed to add repository');
      } finally {
        setIsAdding(false);
      }
    },
    [addRepoFromPath]
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [open]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label="Repository"
            disabled={disabled}
            data-testid="repository-combobox"
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
          data-testid="repository-combobox-content"
        >
          <div className="flex flex-col">
            {/* Search input */}
            <div className="border-b p-2">
              <Input
                ref={inputRef}
                placeholder="Search repositories..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                data-testid="repository-search"
              />
            </div>

            {/* Options list */}
            <div className="max-h-48 overflow-y-auto py-1" role="listbox" aria-label="Repositories">
              {filtered.length === 0 ? (
                <p
                  className="text-muted-foreground px-3 py-2 text-sm"
                  data-testid="repository-empty"
                >
                  No repositories found.
                </p>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={value === r.path}
                    onClick={() => handleSelect(r.path)}
                    className={cn(
                      'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 px-3 py-2 text-sm',
                      value === r.path && 'bg-accent/50'
                    )}
                    data-testid={`repository-option-${r.id}`}
                  >
                    <CheckIcon
                      className={cn('h-4 w-4 shrink-0', value !== r.path && 'invisible')}
                    />
                    <span className="flex flex-col items-start truncate">
                      <span className="truncate">{r.name}</span>
                      <span className="text-muted-foreground truncate text-xs">{r.path}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Actions — pinned outside scroll area */}
            <Separator />
            {githubImport ? (
              <button
                type="button"
                onClick={() => setShowGitHubImport(true)}
                className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 px-3 py-2 text-sm"
                data-testid="import-github-item"
              >
                <Github className="h-4 w-4 shrink-0" />
                <span>Import from GitHub...</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleAddRepository}
              disabled={isAdding}
              className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 px-3 py-2 text-sm"
              data-testid="add-repository-item"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <FolderPlus className="h-4 w-4 shrink-0" />
              )}
              <span>Add new repository...</span>
            </button>
            {addError ? (
              <p className="px-3 pb-2 text-xs text-red-500" data-testid="add-repository-error">
                {addError}
              </p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
      <ReactFileManagerDialog
        open={showReactPicker}
        onOpenChange={(isOpen) => {
          if (!isOpen) setShowReactPicker(false);
        }}
        onSelect={handleReactPickerSelect}
      />
      <GitHubImportDialog
        open={showGitHubImport}
        onOpenChange={setShowGitHubImport}
        onImportComplete={handleGitHubImportComplete}
      />
    </>
  );
}
