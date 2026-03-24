'use client';

import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Viewport } from '@xyflow/react';
import {
  Plus,
  FolderPlus,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export interface CanvasToolbarProps {
  showArchived: boolean;
  onToggleArchived: () => void;
  onAddFeature: () => void;
  onAddRepository: () => void;
  addingRepo?: boolean;
  onResetViewport?: () => Viewport;
  /** Extra action buttons (adopt branch, github import, etc.) */
  extraActions?: React.ReactNode;
}

export function CanvasToolbar({
  showArchived,
  onToggleArchived,
  onAddFeature,
  onAddRepository,
  addingRepo,
  onResetViewport,
  extraActions,
}: CanvasToolbarProps) {
  const { zoomIn, zoomOut, fitView, setViewport } = useReactFlow();

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 400, padding: 0.3 });
  }, [fitView]);

  const handleReset = useCallback(() => {
    if (onResetViewport) {
      const viewport = onResetViewport();
      setViewport(viewport, { duration: 400 });
    }
  }, [onResetViewport, setViewport]);

  return (
    <div className="flex items-center gap-1 rounded-xl border bg-background px-2 py-1.5 shadow-md dark:bg-neutral-900">
      {/* Create actions */}
      <ToolbarButton onClick={onAddFeature} title="New Feature" label="New">
        <Plus className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={onAddRepository}
        title="Add Repository"
        label="Repo"
        disabled={addingRepo}
      >
        <FolderPlus className="h-4 w-4" />
      </ToolbarButton>
      {extraActions}

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* View controls */}
      <ToolbarButton
        onClick={onToggleArchived}
        title={showArchived ? 'Hide archived' : 'Show archived'}
        active={showArchived}
      >
        {showArchived ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Zoom controls */}
      <ToolbarButton onClick={handleZoomOut} title="Zoom out">
        <ZoomOut className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={handleZoomIn} title="Zoom in">
        <ZoomIn className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={handleFitView} title="Fit view">
        <Maximize className="h-4 w-4" />
      </ToolbarButton>
      {onResetViewport ? (
        <ToolbarButton onClick={handleReset} title="Reset view">
          <RotateCcw className="h-4 w-4" />
        </ToolbarButton>
      ) : null}
    </div>
  );
}

// ── Internal button ──────────────────────────────────────────────────────

function ToolbarButton({
  children,
  onClick,
  title,
  label,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  label?: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-50',
        active
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground'
      )}
    >
      {children}
      {label ? <span>{label}</span> : null}
    </button>
  );
}
