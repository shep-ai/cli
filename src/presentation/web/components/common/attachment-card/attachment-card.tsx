import type { LucideIcon } from 'lucide-react';
import { FileIcon, FileTextIcon, ImageIcon, CodeIcon, Trash2Icon, Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface AttachmentCardProps {
  name: string;
  size: number;
  mimeType: string;
  onRemove: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Optional secondary text shown below the filename (e.g. file path). */
  subtitle?: string;
}

export function AttachmentCard({
  name,
  size,
  mimeType: _mimeType,
  onRemove,
  loading = false,
  disabled = false,
  subtitle,
}: AttachmentCardProps) {
  const ext = getExtension(name);
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
        <span className="truncate text-sm font-medium">{name}</span>
        {subtitle ? (
          <span className="text-muted-foreground truncate text-xs">{subtitle}</span>
        ) : null}
        <span className="text-muted-foreground text-xs">
          {loading ? 'Uploading...' : formatFileSize(size)}
        </span>
      </div>
      {loading ? (
        <Loader2Icon className="text-muted-foreground h-4 w-4 animate-spin" />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${name}`}
        >
          <Trash2Icon className="h-3 w-3" />
        </Button>
      )}
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

export function getFileIcon(ext: string): LucideIcon {
  if (IMAGE_EXTS.has(ext)) return ImageIcon;
  if (ext === '.pdf') return FileTextIcon;
  if (CODE_EXTS.has(ext)) return CodeIcon;
  return FileIcon;
}

export function getFileIconColor(ext: string): string {
  if (ext === '.pdf') return 'bg-red-50 text-red-600';
  if (IMAGE_EXTS.has(ext)) return 'bg-blue-50 text-blue-600';
  if (CODE_EXTS.has(ext)) return 'bg-emerald-50 text-emerald-600';
  return 'bg-gray-50 text-gray-600';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
