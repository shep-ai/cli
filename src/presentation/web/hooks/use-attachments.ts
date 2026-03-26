'use client';

import { useState, useCallback, useRef } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** Minimal set of known-safe extensions (same as feature-create-drawer). */
const ALLOWED_EXTENSIONS = new Set([
  'txt',
  'md',
  'csv',
  'json',
  'yaml',
  'yml',
  'xml',
  'html',
  'css',
  'js',
  'ts',
  'jsx',
  'tsx',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'swift',
  'sh',
  'bash',
  'zsh',
  'fish',
  'ps1',
  'bat',
  'cmd',
  'sql',
  'graphql',
  'proto',
  'toml',
  'ini',
  'cfg',
  'conf',
  'env',
  'dockerfile',
  'makefile',
  'cmake',
  'gradle',
  'sbt',
  'lock',
  'sum',
  'mod',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'webp',
  'bmp',
  'ico',
  'avif',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'zip',
  'tar',
  'gz',
  'bz2',
  'xz',
  '7z',
  'rar',
  'log',
  'diff',
  'patch',
]);

function getExtension(filename: string): string | null {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(idx + 1).toLowerCase() : null;
}

export interface FormAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  path: string;
  loading?: boolean;
  notes?: string;
}

export function useAttachments() {
  const [attachments, setAttachments] = useState<FormAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const sessionIdRef = useRef(crypto.randomUUID());

  const handleFiles = useCallback(async (fileList: File[]) => {
    setUploadError(null);

    for (const file of fileList) {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`"${file.name}" exceeds 10 MB limit`);
        return;
      }
      const ext = getExtension(file.name);
      if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
        setUploadError(`File type "${ext}" is not allowed`);
        return;
      }
    }

    for (const file of fileList) {
      const tempId = crypto.randomUUID();

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
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragOver(false);
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
      if (files.length > 0) void handleFiles(files);
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
        void handleFiles(files);
      }
    },
    [handleFiles]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateNotes = useCallback((id: string, notes: string) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, notes } : a)));
  }, []);

  const addAttachment = useCallback((file: Omit<FormAttachment, 'loading'>) => {
    setAttachments((prev) => {
      const isDupe = prev.some((a) => a.path === file.path);
      if (isDupe) return prev;
      return [...prev, { ...file, loading: false }];
    });
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
    setUploadError(null);
  }, []);

  const completedAttachments = attachments.filter((a) => !a.loading);

  return {
    attachments,
    completedAttachments,
    uploadError,
    isDragOver,
    handleFiles,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handlePaste,
    addAttachment,
    removeAttachment,
    updateNotes,
    clearAttachments,
  };
}
