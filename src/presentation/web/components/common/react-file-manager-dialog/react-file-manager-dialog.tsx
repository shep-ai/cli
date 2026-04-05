'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Folder, FolderOpen, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  DirectoryEntry,
  DirectoryListResponse,
  ReactFileManagerDialogProps,
} from './react-file-manager-dialog-config';

async function fetchDirectory(dirPath?: string): Promise<DirectoryListResponse> {
  const params = new URLSearchParams();
  if (dirPath) {
    params.set('path', dirPath);
  }
  const res = await fetch(`/api/directory/list?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Failed to load directory' }));
    throw new Error(body.error ?? 'Failed to load directory');
  }
  return res.json();
}

function parseBreadcrumbs(currentPath: string) {
  if (!currentPath) return [];
  const isWindows = /^[a-zA-Z]:/.test(currentPath);
  const separator = isWindows ? '\\' : '/';
  const parts = currentPath.split(/[\\/]/).filter(Boolean);

  const crumbs: { label: string; path: string }[] = [];
  for (let i = 0; i < parts.length; i++) {
    const path = isWindows
      ? parts.slice(0, i + 1).join(separator)
      : separator + parts.slice(0, i + 1).join(separator);
    crumbs.push({ label: parts[i], path });
  }
  return crumbs;
}

const MAX_VISIBLE_CRUMBS = 3;

function AddressBar({
  currentPath,
  isEditing,
  onToggleEdit,
  onNavigate,
}: {
  currentPath: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onNavigate: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(currentPath);

  useEffect(() => {
    setInputValue(currentPath);
  }, [currentPath]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  function handleSubmit() {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onNavigate(trimmed);
    }
  }

  function closeEdit() {
    setInputValue(currentPath);
    onToggleEdit();
  }

  const breadcrumbs = parseBreadcrumbs(currentPath);
  const needsCollapse = breadcrumbs.length > MAX_VISIBLE_CRUMBS;
  const visibleCrumbs = needsCollapse ? breadcrumbs.slice(-MAX_VISIBLE_CRUMBS) : breadcrumbs;

  return (
    <div className="border-b px-4 py-3">
      {/* Title */}
      <h2 className="text-foreground mb-2.5 text-sm font-semibold tracking-[-0.01em]">
        Select Folder
      </h2>

      {/* Address bar */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              closeEdit();
            }
          }}
          onBlur={closeEdit}
          className="bg-muted/60 border-border focus:ring-ring/20 focus:border-ring w-full rounded-lg border px-3 py-2 font-mono text-xs transition-all outline-none focus:ring-2"
          placeholder="Type a path and press Enter..."
          spellCheck={false}
          autoComplete="off"
        />
      ) : (
        <div className="bg-muted/40 flex items-center gap-1 rounded-lg px-2.5 py-2">
          {/* Root */}
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-muted-foreground hover:text-foreground hover:bg-background shrink-0 rounded px-1.5 py-0.5 font-mono text-xs transition-colors"
          >
            /
          </button>

          {/* Collapsed middle */}
          {needsCollapse ? (
            <>
              <ChevronRight className="text-muted-foreground/30 h-3 w-3 shrink-0" />
              <span className="text-muted-foreground/40 font-mono text-xs">...</span>
            </>
          ) : null}

          {/* Visible crumbs */}
          {visibleCrumbs.map((crumb, i) => {
            const isLast = i === visibleCrumbs.length - 1;
            return (
              <span key={crumb.path} className="flex shrink-0 items-center gap-1">
                <ChevronRight className="text-muted-foreground/30 h-3 w-3" />
                {isLast ? (
                  <span className="bg-primary/10 text-primary rounded px-2 py-0.5 font-mono text-xs font-medium">
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate(crumb.path)}
                    className="text-muted-foreground hover:text-foreground hover:bg-background rounded px-1.5 py-0.5 font-mono text-xs transition-colors"
                  >
                    {crumb.label}
                  </button>
                )}
              </span>
            );
          })}

          {/* Edit path button — inside the path row */}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onToggleEdit}
            className="text-muted-foreground/40 hover:text-foreground hover:bg-background shrink-0 rounded p-1 transition-colors"
            aria-label="Edit path"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function ReactFileManagerDialog({
  open,
  onOpenChange,
  onSelect,
  initialPath,
}: ReactFileManagerDialogProps) {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingPath, setIsEditingPath] = useState(false);
  const hasLoadedRef = useRef(false);
  const [renderKey, setRenderKey] = useState(0);

  const loadDirectory = useCallback(async (dirPath?: string) => {
    setIsLoading(true);
    setIsEditingPath(false);
    try {
      const data = await fetchDirectory(dirPath);
      setEntries(data.entries);
      setCurrentPath(data.currentPath);
      setRenderKey((k) => k + 1);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load directory';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadDirectory(initialPath);
    }
    if (!open) {
      hasLoadedRef.current = false;
      setIsEditingPath(false);
    }
  }, [open, initialPath, loadDirectory]);

  function handleNavigate(path: string) {
    loadDirectory(path);
  }

  function handleSelect() {
    if (currentPath) {
      onSelect(currentPath);
      onOpenChange(false);
    }
  }

  function handleCancel() {
    onSelect(null);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCancel();
        }
      }}
    >
      <DialogContent
        className="flex h-[min(520px,85dvh)] w-full max-w-[460px] flex-col gap-0 overflow-hidden p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Select Folder</DialogTitle>
        <DialogDescription className="sr-only">
          Navigate to a folder and select it
        </DialogDescription>

        {/* ── Header with address bar ── */}
        <AddressBar
          currentPath={currentPath}
          isEditing={isEditingPath}
          onToggleEdit={() => setIsEditingPath((v) => !v)}
          onNavigate={handleNavigate}
        />

        {/* ── Folder list ── */}
        <ScrollArea className="min-h-0 flex-1">
          {isLoading && entries.length === 0 ? (
            <div className="space-y-0.5 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={`skeleton-${i}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  style={{ opacity: 1 - i * 0.1 }}
                >
                  <div className="bg-muted h-4 w-4 animate-pulse rounded" />
                  <div
                    className="bg-muted h-3.5 animate-pulse rounded"
                    style={{ width: `${40 + Math.random() * 35}%` }}
                  />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FolderOpen className="text-muted-foreground/25 mb-3 h-10 w-10" />
              <p className="text-muted-foreground/60 text-sm">Empty folder</p>
            </div>
          ) : (
            <div key={renderKey} className="p-2">
              {entries.map((entry, i) => (
                <button
                  key={entry.path}
                  type="button"
                  onClick={() => handleNavigate(entry.path)}
                  className="folder-row group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-[var(--color-primary)]/[0.06] active:scale-[0.997]"
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <Folder className="text-muted-foreground/50 group-hover:text-primary h-[18px] w-[18px] shrink-0 transition-colors" />
                  <span className="text-foreground min-w-0 flex-1 truncate text-[13px] font-medium">
                    {entry.name}
                  </span>
                  <ChevronRight className="text-muted-foreground/0 group-hover:text-muted-foreground/40 h-3.5 w-3.5 shrink-0 transition-all" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* ── Footer ── */}
        <div className="flex items-center gap-2 border-t px-4 py-3">
          <p className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px] leading-none">
            {currentPath || '\u00A0'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-muted-foreground h-8 shrink-0 px-3 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSelect}
            disabled={!currentPath || isLoading}
            className="h-8 shrink-0 px-5 text-xs font-medium"
          >
            {isLoading ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
            Select
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
