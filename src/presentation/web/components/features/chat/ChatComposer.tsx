'use client';

import { useCallback, useRef } from 'react';
import { ComposerPrimitive, ThreadPrimitive } from '@assistant-ui/react';
import { SendHorizontal, CircleStop, Paperclip, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttachmentChip } from '@/components/common/attachment-chip';
import type { FormAttachment } from '@/hooks/use-attachments';

export interface ChatComposerProps {
  attachments: FormAttachment[];
  isDragOver: boolean;
  uploadError: string | null;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onRemoveAttachment: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
  onPickFiles: () => void;
}

export function ChatComposer({
  attachments,
  isDragOver,
  uploadError,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onPaste,
  onRemoveAttachment,
  onNotesChange,
  onPickFiles,
}: ChatComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <ComposerPrimitive.Root
      className={cn(
        'flex flex-col border-t transition-colors',
        isDragOver && 'border-primary/50 bg-primary/5'
      )}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Attachment chips */}
      {attachments.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2">
          {attachments.map((file) => (
            <AttachmentChip
              key={file.id}
              name={file.name}
              size={file.size}
              mimeType={file.mimeType}
              path={file.path}
              onRemove={() => onRemoveAttachment(file.id)}
              loading={file.loading}
              notes={file.notes}
              onNotesChange={(notes) => onNotesChange(file.id, notes)}
            />
          ))}
        </div>
      ) : null}

      {/* Upload error */}
      {uploadError ? (
        <div className="text-destructive px-3 pt-1 text-xs">{uploadError}</div>
      ) : null}

      {/* Input row */}
      <div className="flex items-end gap-2 p-3">
        {/* Attachment buttons */}
        <div className="mb-0.5 flex items-center gap-0.5">
          <ComposerPrimitive.AddAttachment asChild>
            <button
              type="button"
              title="Upload file"
              className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
          </ComposerPrimitive.AddAttachment>
          <button
            type="button"
            title="Browse files"
            onClick={onPickFiles}
            className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Text input */}
        <ComposerPrimitive.Input
          ref={inputRef}
          rows={1}
          autoFocus
          placeholder="Write a message..."
          onPaste={onPaste}
          className={cn(
            'bg-muted min-h-[40px] flex-1 resize-none rounded-xl border-0 px-4 py-2.5 text-sm',
            'focus:ring-ring/30 focus:ring-2 focus:outline-none',
            'placeholder:text-muted-foreground/60',
            'max-h-40 overflow-y-auto'
          )}
        />

        {/* Send / Cancel */}
        <ComposerAction />
      </div>

      {/* Drag overlay hint */}
      {isDragOver ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-primary/5">
          <span className="text-primary text-sm font-medium">Drop files here</span>
        </div>
      ) : null}
    </ComposerPrimitive.Root>
  );
}

function ComposerAction() {
  return (
    <>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send
          className={cn(
            'bg-primary text-primary-foreground inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl',
            'hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-30',
            'transition-colors'
          )}
        >
          <SendHorizontal className="size-4" />
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel
          className={cn(
            'bg-destructive/10 text-destructive inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl',
            'hover:bg-destructive/20',
            'transition-colors'
          )}
        >
          <CircleStop className="size-4" />
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </>
  );
}
