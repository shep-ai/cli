'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { PaperclipIcon, Send, ChevronLeft, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSoundAction } from '@/hooks/use-sound-action';
import { AttachmentChip } from '@/components/common/attachment-chip';
import { pickFiles } from '@/components/common/feature-create-drawer/pick-files';
import type { DrawerActionBarProps, RejectAttachment } from './drawer-action-bar-config';

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

export function DrawerActionBar({
  onReject,
  onApprove,
  approveLabel,
  approveVariant = 'default',
  revisionPlaceholder,
  isProcessing = false,
  isRejecting = false,
  children,
  chatInput: controlledChatInput,
  onChatInputChange,
}: DrawerActionBarProps) {
  const isWarning = approveVariant === 'warning';
  const ApproveIcon = isWarning ? AlertTriangle : Check;
  const accentBg = isWarning ? 'bg-orange-500/85' : 'bg-blue-500/85';
  const accentBorder = isWarning ? 'border-orange-400/60' : 'border-blue-400/60';
  const [internalChatInput, setInternalChatInput] = useState('');
  const chatInput = controlledChatInput ?? internalChatInput;
  const setChatInput = onChatInputChange ?? setInternalChatInput;
  const approveSound = useSoundAction('approve');
  const disabled = isProcessing || isRejecting;

  const [attachments, setAttachments] = useState<RejectAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const hasText = chatInput.trim().length > 0;
  const approveExpanded = hasText ? hoverExpanded || (ctrlHeld && shiftHeld) : !hoverExpanded;
  const rejectHighlighted = hasText ? ctrlHeld && !shiftHeld : false;
  const dragCounterRef = useRef(0);
  const sessionIdRef = useRef(crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);

  // Track Ctrl/Meta + Shift keys for button state
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Control' || e.key === 'Meta') setCtrlHeld(true);
      if (e.key === 'Shift') setShiftHeld(true);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'Control' || e.key === 'Meta') setCtrlHeld(false);
      if (e.key === 'Shift') setShiftHeld(false);
    }
    function onBlur() {
      setCtrlHeld(false);
      setShiftHeld(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

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
      if (files.length > 0) handleFiles(files);
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

  const handleAddFiles = useCallback(async () => {
    try {
      const files = await pickFiles();
      if (files) {
        setAttachments((prev) => {
          const existingPaths = new Set(prev.map((f) => f.path));
          const unique = files
            .filter((f) => !existingPaths.has(f.path))
            .map(
              (f): RejectAttachment => ({
                id: crypto.randomUUID(),
                name: f.name,
                size: f.size,
                mimeType: 'application/octet-stream',
                path: f.path,
              })
            );
          return unique.length > 0 ? [...prev, ...unique] : prev;
        });
      }
    } catch {
      // Native dialog failed — silently ignore
    }
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearForm = useCallback(() => {
    setChatInput('');
    setAttachments([]);
    setUploadError(null);
  }, [setChatInput]);

  function handleFormSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const text = chatInput.trim();

    if (approveExpanded) {
      // Approve mode
      approveSound.play();
      onApprove();
      clearForm();
    } else {
      // Reject mode — text required
      if (!text || !onReject) return;
      onReject(
        text,
        attachments.filter((a) => !a.loading)
      );
      clearForm();
    }
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      // Ctrl+Shift+Enter = approve, Ctrl+Enter = reject
      formRef.current?.requestSubmit();
    }
  }, []);

  const modKey =
    typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent) ? '⌘' : 'Ctrl';

  return (
    <div className="border-border shrink-0 border-t">
      {children}
      {onReject ? (
        <TooltipProvider delayDuration={400}>
          <form ref={formRef} onSubmit={handleFormSubmit} className="p-3">
            <div
              role="region"
              aria-label="File drop zone"
              data-drag-over={isDragOver ? 'true' : 'false'}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={cn(
                'rounded-md border-2 border-transparent transition-colors',
                isDragOver && 'border-primary/50 bg-primary/5'
              )}
            >
              <div className="border-input focus-within:ring-ring/50 focus-within:border-ring flex flex-col overflow-hidden rounded-md border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
                <Textarea
                  placeholder={revisionPlaceholder ?? 'Ask AI to revise...'}
                  aria-label={revisionPlaceholder ?? 'Ask AI to revise...'}
                  disabled={disabled}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  rows={1}
                  className="max-h-[35dvh] min-h-9 flex-1 resize-none overflow-y-auto rounded-none border-0 py-2 shadow-none focus-visible:ring-0"
                  data-testid="drawer-chat-input"
                />
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
                        disabled={disabled}
                        loading={file.loading}
                      />
                    ))}
                  </div>
                )}
                {uploadError ? (
                  <p className="text-destructive px-3 pb-2 text-xs">{uploadError}</p>
                ) : null}
                <div className="border-input flex items-center gap-2 border-t px-3 py-1.5">
                  <span className="text-muted-foreground flex-1 truncate text-[11px]">
                    <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">
                      {modKey}+Enter
                    </kbd>{' '}
                    {hasText ? 'reject' : 'approve'}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleAddFiles}
                        disabled={disabled}
                        aria-label="Attach files"
                        className="text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors"
                      >
                        <PaperclipIcon className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Attach files</TooltipContent>
                  </Tooltip>

                  {/* Single action button: Approve when empty, Reject when text present */}
                  <div onMouseLeave={() => setHoverExpanded(false)}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="submit"
                          disabled={disabled}
                          data-testid="drawer-action-submit"
                          className={cn(
                            'relative flex h-9 min-w-[12rem] cursor-pointer items-center overflow-hidden rounded-md border pr-10 pl-4 text-sm font-medium whitespace-nowrap transition-colors',
                            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                            approveExpanded
                              ? `${accentBorder} text-white`
                              : rejectHighlighted
                                ? 'border-primary bg-muted ring-primary/30 shadow-sm ring-1'
                                : 'border-border bg-muted/50 hover:bg-muted shadow-sm'
                          )}
                        >
                          {/* Accent fill — slides in from right */}
                          <div
                            className={cn(
                              'pointer-events-none absolute inset-0 transition-transform duration-300 ease-in-out',
                              accentBg
                            )}
                            style={{
                              transform: approveExpanded ? 'translateX(0)' : 'translateX(100%)',
                            }}
                          />
                          {/* Reject content */}
                          <span
                            className={cn(
                              'absolute inset-0 z-10 flex items-center justify-center gap-2 pr-8 transition-opacity duration-300',
                              approveExpanded ? 'opacity-0' : 'opacity-100'
                            )}
                          >
                            <Send className="h-4 w-4 shrink-0" />
                            Reject
                          </span>
                          {/* Approve content — overlaid, centered */}
                          <span
                            className={cn(
                              'absolute inset-0 z-10 flex items-center justify-center gap-2 text-white transition-opacity duration-300',
                              approveExpanded ? 'opacity-100' : 'opacity-0'
                            )}
                          >
                            <ApproveIcon className="h-4 w-4 shrink-0" />
                            {approveLabel}
                          </span>
                          {/* Arrow indicator — hover trigger to toggle between modes */}
                          <span
                            className={cn(
                              `border-input/60 absolute inset-y-0 right-0 z-20 flex w-8 cursor-pointer items-center justify-center rounded-r-[5px] border-l ${accentBg} transition-opacity duration-300`,
                              !hasText && !hoverExpanded && 'pointer-events-none opacity-0'
                            )}
                            onMouseEnter={() => setHoverExpanded(true)}
                          >
                            <ChevronLeft className="h-4 w-4 text-white" />
                          </span>
                        </button>
                      </TooltipTrigger>
                      {!isWarning ? (
                        <TooltipContent side="top">
                          {approveExpanded ? approveLabel : 'Send revision feedback'}
                        </TooltipContent>
                      ) : null}
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </TooltipProvider>
      ) : (
        <div className="flex items-center gap-2 px-4 pb-4">
          <Button
            type="button"
            className="flex-1"
            disabled={disabled}
            onClick={() => {
              approveSound.play();
              onApprove();
            }}
          >
            {approveLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
