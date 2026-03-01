'use client';

import { useState, useCallback } from 'react';
import { Bookmark, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SavedView } from '@/hooks/use-saved-views';
import type { FilterState } from '@/hooks/use-filter-state';

export interface SavedViewSelectorProps {
  views: SavedView[];
  currentFilters: FilterState;
  onApplyView: (id: string) => void;
  onSaveView: (name: string, filters: FilterState) => void;
  onDeleteView: (id: string) => void;
  onRenameView: (id: string, newName: string) => void;
}

export function SavedViewSelector({
  views,
  currentFilters,
  onApplyView,
  onSaveView,
  onDeleteView,
}: SavedViewSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setIsSaving(false);
    setSaveName('');
    setPendingDeleteId(null);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) resetState();
    },
    [resetState]
  );

  const handleStartSave = useCallback(() => {
    setIsSaving(true);
    setSaveName('');
  }, []);

  const handleConfirmSave = useCallback(() => {
    if (saveName.trim()) {
      onSaveView(saveName.trim(), currentFilters);
      setIsSaving(false);
      setSaveName('');
      setOpen(false);
    }
  }, [saveName, currentFilters, onSaveView]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setPendingDeleteId(id);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (pendingDeleteId) {
      onDeleteView(pendingDeleteId);
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, onDeleteView]);

  const handleCancelDelete = useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Saved Views">
          <Bookmark className="h-4 w-4" />
          Saved Views
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {views.length === 0 && !isSaving && (
          <div className="text-muted-foreground px-2 py-3 text-center text-sm">No saved views</div>
        )}

        {views.map((view) => (
          <div key={view.id}>
            {pendingDeleteId === view.id ? (
              <div className="flex items-center gap-1 px-2 py-1.5">
                <span className="flex-1 truncate text-sm">Delete &quot;{view.name}&quot;?</span>
                <Button
                  variant="destructive"
                  size="icon-xs"
                  onClick={handleConfirmDelete}
                  aria-label="Confirm"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={handleCancelDelete}
                  aria-label="Cancel"
                >
                  ✕
                </Button>
              </div>
            ) : (
              <DropdownMenuItem
                className="group cursor-pointer justify-between"
                onSelect={() => onApplyView(view.id)}
              >
                <span className="truncate">{view.name}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => handleDeleteClick(e, view.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </DropdownMenuItem>
            )}
          </div>
        ))}

        <DropdownMenuSeparator />

        {isSaving ? (
          <div className="flex items-center gap-1 p-2">
            <Input
              placeholder="View name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleConfirmSave();
                if (e.key === 'Escape') {
                  setIsSaving(false);
                  setSaveName('');
                }
              }}
              className="h-7 text-sm"
              autoFocus
            />
            <Button
              variant="default"
              size="xs"
              onClick={handleConfirmSave}
              disabled={!saveName.trim()}
            >
              Save
            </Button>
          </div>
        ) : (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleStartSave();
            }}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            Save current
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
