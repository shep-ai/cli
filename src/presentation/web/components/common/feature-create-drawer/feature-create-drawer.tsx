'use client';

import { useState, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  XIcon,
  PlusIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  CodeIcon,
  Trash2Icon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { FileAttachment } from '@shepai/core/infrastructure/services/file-dialog.service';
import type { ApprovalGates } from '@shepai/core/domain/generated/output';
import type { CreateFeatureInput } from '@shepai/core/infrastructure/di/use-cases-bridge';
import { pickFiles } from './pick-files';

export type { FileAttachment } from '@shepai/core/infrastructure/services/file-dialog.service';

export type ApprovalMode = 'step-by-step' | 'allow-prd' | 'allow-plan' | 'allow-all';

const APPROVAL_MODES: { value: ApprovalMode; label: string; description: string }[] = [
  {
    value: 'step-by-step',
    label: 'Step-by-step',
    description: 'Pause for review after each phase',
  },
  {
    value: 'allow-prd',
    label: 'Auto-approve PRD',
    description: 'Auto-approve requirements, pause after planning',
  },
  {
    value: 'allow-plan',
    label: 'Auto-approve through plan',
    description: 'Auto-approve requirements and planning, pause at implementation',
  },
  {
    value: 'allow-all',
    label: 'Fully autonomous',
    description: 'Run without any approval pauses',
  },
];

function mapApprovalMode(mode: ApprovalMode): ApprovalGates | undefined {
  switch (mode) {
    case 'step-by-step':
      return { allowPrd: false, allowPlan: false };
    case 'allow-prd':
      return { allowPrd: true, allowPlan: false };
    case 'allow-plan':
      return { allowPrd: true, allowPlan: true };
    case 'allow-all':
      return undefined;
  }
}

function composeUserInput(
  name: string,
  description: string | undefined,
  attachments: FileAttachment[]
): string {
  let userInput = `Feature: ${name}`;

  if (description) {
    userInput += `\n\n${description}`;
  }

  if (attachments.length > 0) {
    const paths = attachments.map((a) => `- ${a.path}`).join('\n');
    userInput += `\n\nAttached files:\n${paths}`;
  }

  return userInput;
}

export interface FeatureCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFeatureInput) => void;
  repositoryPath: string;
  isSubmitting?: boolean;
}

export function FeatureCreateDrawer({
  open,
  onClose,
  onSubmit,
  repositoryPath,
  isSubmitting = false,
}: FeatureCreateDrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('step-by-step');

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setAttachments([]);
    setApprovalMode('step-by-step');
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetForm();
        onClose();
      }
    },
    [onClose, resetForm]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      const userInput = composeUserInput(name.trim(), description.trim() || undefined, attachments);
      const approvalGates = mapApprovalMode(approvalMode);
      onSubmit({
        userInput,
        repositoryPath,
        ...(approvalGates !== undefined && { approvalGates }),
      });
    },
    [name, description, attachments, approvalMode, repositoryPath, onSubmit]
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

  return (
    <Drawer direction="right" modal={false} open={open} onOpenChange={handleOpenChange}>
      <DrawerContent direction="right" className="w-96" showCloseButton={false}>
        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
        >
          <XIcon className="size-4" />
        </button>

        {/* Header */}
        <DrawerHeader>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
            <DrawerTitle>NEW FEATURE</DrawerTitle>
          </div>
          <DrawerDescription asChild>
            <div>
              <Badge variant="secondary">Creating...</Badge>
            </div>
          </DrawerDescription>
        </DrawerHeader>

        <Separator />

        {/* Form body */}
        <div className="flex-1 overflow-y-auto p-4">
          <form id="create-feature-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Feature name */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="feature-name"
                className="text-muted-foreground text-xs font-semibold tracking-wider"
              >
                FEATURE NAME
              </Label>
              <Input
                id="feature-name"
                placeholder="e.g. GitHub OAuth Login"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="feature-description"
                className="text-muted-foreground text-xs font-semibold tracking-wider"
              >
                DESCRIPTION
              </Label>
              <Textarea
                id="feature-description"
                placeholder="Describe what this feature does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={isSubmitting}
              />
            </div>

            {/* Approval mode */}
            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground text-xs font-semibold tracking-wider">
                APPROVAL MODE
              </Label>
              <RadioGroup
                value={approvalMode}
                onValueChange={(v) => setApprovalMode(v as ApprovalMode)}
                disabled={isSubmitting}
              >
                {APPROVAL_MODES.map((mode) => (
                  <div key={mode.value} className="flex items-start gap-2">
                    <RadioGroupItem value={mode.value} id={`approval-${mode.value}`} />
                    <div className="flex flex-col gap-0.5">
                      <Label htmlFor={`approval-${mode.value}`} className="text-sm font-medium">
                        {mode.label}
                      </Label>
                      <p className="text-muted-foreground text-xs">{mode.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
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
        </div>

        {/* Footer */}
        <Separator />
        <DrawerFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="create-feature-form" disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? 'Creating...' : '+ Create Feature'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
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
