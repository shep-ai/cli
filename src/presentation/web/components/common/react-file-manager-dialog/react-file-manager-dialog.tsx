'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { FileManagerFile } from '@cubone/react-file-manager';
import type {
  DirectoryEntry,
  DirectoryListResponse,
  ReactFileManagerDialogProps,
} from './react-file-manager-dialog-config';

const FileManager = dynamic(
  () => import('@cubone/react-file-manager').then((mod) => mod.FileManager),
  { ssr: false, loading: () => <FileManagerSkeleton /> }
);

function FileManagerSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
    </div>
  );
}

function toFileManagerFiles(entries: DirectoryEntry[]) {
  // The @cubone/react-file-manager component filters visible files by matching
  // file.path === currentPath + "/" + file.name. Since we dynamically fetch
  // directory contents on each navigation, we present all entries at the
  // FileManager's root level by using path = "/" + name. The real absolute
  // path is preserved in a custom `absolutePath` field for selection/navigation.
  return entries.map((entry) => ({
    name: entry.name,
    isDirectory: true as const,
    path: `/${entry.name}`,
    absolutePath: entry.path,
    updatedAt: entry.updatedAt,
  }));
}

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

export function ReactFileManagerDialog({
  open,
  onOpenChange,
  onSelect,
  initialPath,
}: ReactFileManagerDialogProps) {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const loadDirectory = useCallback(async (dirPath?: string) => {
    setIsLoading(true);
    setSelectedPath(null);
    try {
      const data = await fetchDirectory(dirPath);
      setEntries(data.entries);
      setCurrentPath(data.currentPath);
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
    }
  }, [open, initialPath, loadDirectory]);

  const handleFileOpen = useCallback(
    (file: FileManagerFile) => {
      // Use absolutePath (real filesystem path) for navigation, not the
      // virtual path used by the FileManager tree.
      const realPath = file.absolutePath;
      if (file.isDirectory && realPath) {
        loadDirectory(realPath);
      }
    },
    [loadDirectory]
  );

  const handleSelectionChange = useCallback((files: FileManagerFile[]) => {
    if (files.length === 1 && files[0].isDirectory) {
      const realPath = files[0].absolutePath;
      setSelectedPath(realPath ?? null);
    } else {
      setSelectedPath(null);
    }
  }, []);

  function handleSelect() {
    if (selectedPath) {
      onSelect(selectedPath);
      onOpenChange(false);
    }
  }

  function handleSelectCurrentPath() {
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
        className="flex h-[95dvh] max-w-[95vw] flex-col"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Select Folder</DialogTitle>
          <DialogDescription className="truncate font-mono text-xs">
            {currentPath || 'Loading...'}
          </DialogDescription>
        </DialogHeader>
        <div className="shep-file-manager min-h-0 flex-1 overflow-hidden rounded-md border">
          <FileManager
            key={currentPath}
            files={toFileManagerFiles(entries)}
            isLoading={isLoading}
            height="100%"
            width="100%"
            layout="list"
            enableFilePreview={false}
            permissions={{
              upload: false,
              delete: false,
              create: false,
              download: false,
              copy: false,
              move: false,
              rename: false,
            }}
            onFileOpen={handleFileOpen}
            onSelectionChange={handleSelectionChange}
            onRefresh={() => loadDirectory(currentPath)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSelectCurrentPath} disabled={!currentPath}>
            Select Current Folder
          </Button>
          <Button onClick={handleSelect} disabled={!selectedPath}>
            Select Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
