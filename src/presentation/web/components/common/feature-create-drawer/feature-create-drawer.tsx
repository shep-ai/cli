'use client';

import { useState, useCallback, useEffect } from 'react';
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
import { CheckboxGroup } from '@/components/ui/checkbox-group';
import { CheckboxGroupItem } from '@/components/ui/checkbox-group-item';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { FileAttachment } from '@shepai/core/infrastructure/services/file-dialog.service';
import type { WorkflowDefaults } from '@/app/actions/get-workflow-defaults';
import { pickFiles } from './pick-files';

export type { FileAttachment } from '@shepai/core/infrastructure/services/file-dialog.service';

export interface FeatureCreatePayload {
  name: string;
  description?: string;
  attachments: FileAttachment[];
  repositoryPath: string;
  approvalGates: {
    allowPrd: boolean;
    allowPlan: boolean;
    allowMerge: boolean;
  };
  push: boolean;
  openPr: boolean;
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
}

export function FeatureCreateDrawer({
  open,
  onClose,
  onSubmit,
  repositoryPath,
  isSubmitting = false,
  workflowDefaults,
}: FeatureCreateDrawerProps) {
  const defaultGates = workflowDefaults?.approvalGates ?? EMPTY_GATES;
  const defaultPush = workflowDefaults?.push ?? false;
  const defaultOpenPr = workflowDefaults?.openPr ?? false;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [approvalGates, setApprovalGates] = useState<Record<string, boolean>>({ ...defaultGates });
  const [push, setPush] = useState(defaultPush);
  const [openPr, setOpenPr] = useState(defaultOpenPr);

  // Sync state when workflowDefaults load asynchronously
  useEffect(() => {
    if (workflowDefaults) {
      setApprovalGates({ ...workflowDefaults.approvalGates });
      setPush(workflowDefaults.push);
      setOpenPr(workflowDefaults.openPr);
    }
  }, [workflowDefaults]);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setAttachments([]);
    setApprovalGates({ ...defaultGates });
    setPush(defaultPush);
    setOpenPr(defaultOpenPr);
  }, [defaultGates, defaultPush, defaultOpenPr]);

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
      const trimmedDescription = description.trim() || undefined;
      onSubmit({
        name: name.trim(),
        description: trimmedDescription,
        attachments,
        repositoryPath,
        approvalGates: {
          allowPrd: approvalGates.allowPrd ?? false,
          allowPlan: approvalGates.allowPlan ?? false,
          allowMerge: approvalGates.allowMerge ?? false,
        },
        push: push || openPr,
        openPr,
      });
    },
    [name, description, attachments, approvalGates, repositoryPath, onSubmit, push, openPr]
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
    <Drawer direction="right" modal={false} handleOnly open={open} onOpenChange={handleOpenChange}>
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

            {/* Auto-approve checkboxes */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs font-semibold tracking-wider">
                APPROVE
              </Label>
              <CheckboxGroup
                label="Autonomous Mode"
                description="YOLO!"
                parentAriaLabel="Auto approve all"
                options={AUTO_APPROVE_OPTIONS}
                value={approvalGates}
                onValueChange={setApprovalGates}
                disabled={isSubmitting}
              />
            </div>

            {/* Git options */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs font-semibold tracking-wider">
                GIT
              </Label>
              <div className="flex flex-col gap-2">
                <CheckboxGroupItem
                  id="push"
                  label="Push"
                  description="Push branch to remote after implementation."
                  checked={push || openPr}
                  onCheckedChange={setPush}
                  disabled={openPr || isSubmitting}
                />
                <CheckboxGroupItem
                  id="open-pr"
                  label="Create PR"
                  description="Open a pull request after pushing."
                  checked={openPr}
                  onCheckedChange={setOpenPr}
                  disabled={isSubmitting}
                />
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
