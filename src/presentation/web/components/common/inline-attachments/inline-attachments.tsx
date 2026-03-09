/* eslint-disable @next/next/no-img-element -- Local file preview requires raw <img>, not next/image */
'use client';

import { useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from 'radix-ui';
import { DownloadIcon, ImageOff } from 'lucide-react';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']);

function isImagePath(path: string): boolean {
  const dot = path.lastIndexOf('.');
  return dot >= 0 && IMAGE_EXTS.has(path.slice(dot).toLowerCase());
}

function previewUrl(path: string): string {
  const ext = path.lastIndexOf('.') >= 0 ? path.slice(path.lastIndexOf('.')) : '';
  const mimeGuess = isImagePath(path) ? `image/${ext.slice(1).replace('jpg', 'jpeg')}` : '';
  const params = new URLSearchParams({ path, ...(mimeGuess && { mimeType: mimeGuess }) });
  return `/api/attachments/preview?${params.toString()}`;
}

function getFilename(path: string): string {
  return path.split('/').pop() ?? path;
}

/** Regex matching `@/absolute/path` attachment references in text. */
const ATTACHMENT_REF_RE = /(?:^|\s)@(\/[^\s]+)/g;

export interface InlineAttachmentsProps {
  /** Text that may contain `@/path/to/file` attachment references. */
  text: string;
  /** Additional attachment paths to render (e.g. from rejection feedback). */
  attachmentPaths?: string[];
}

interface TextSegment {
  type: 'text';
  value: string;
}

interface AttachmentSegment {
  type: 'attachment';
  path: string;
}

type Segment = TextSegment | AttachmentSegment;

/** Parse text into segments of plain text and attachment references. */
export function parseAttachmentRefs(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(ATTACHMENT_REF_RE)) {
    const fullMatchStart = match.index;
    // The path capture starts after the optional leading whitespace
    const leadingWs = match[0].length - match[0].trimStart().length;
    const refStart = fullMatchStart + leadingWs;

    // Add text before this reference (including leading whitespace)
    if (refStart > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, refStart) });
    }

    segments.push({ type: 'attachment', path: match[1] });
    lastIndex = fullMatchStart + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

export function InlineAttachments({ text, attachmentPaths }: InlineAttachmentsProps) {
  const segments = parseAttachmentRefs(text);
  const hasInlineAttachments = segments.some((s) => s.type === 'attachment');
  const extraPaths = attachmentPaths?.filter(Boolean) ?? [];

  if (!hasInlineAttachments && extraPaths.length === 0) {
    return <span className="text-sm leading-relaxed">{text}</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      {segments.map((segment) => {
        if (segment.type === 'text') {
          const trimmed = segment.value.trim();
          if (!trimmed) return null;
          return (
            <span key={`text-${trimmed.slice(0, 40)}`} className="text-sm leading-relaxed">
              {trimmed}
            </span>
          );
        }
        return <AttachmentPreview key={`att-${segment.path}`} path={segment.path} />;
      })}
      {extraPaths.map((path) => (
        <AttachmentPreview key={`extra-${path}`} path={path} />
      ))}
    </div>
  );
}

function AttachmentPreview({ path }: { path: string }) {
  const filename = getFilename(path);
  const [loadError, setLoadError] = useState(false);

  if (isImagePath(path)) {
    if (loadError) {
      return (
        <div
          data-testid="inline-attachment-image-error"
          className="text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <ImageOff className="h-4 w-4 shrink-0" />
          <span className="truncate">{filename}</span>
        </div>
      );
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
          <img
            src={previewUrl(path)}
            alt={filename}
            data-testid="inline-attachment-image"
            onError={() => setLoadError(true)}
            className="max-h-48 max-w-full cursor-pointer rounded-md border object-contain transition-opacity hover:opacity-80"
          />
        </DialogTrigger>
        <DialogContent className="max-w-3xl gap-0 overflow-hidden border-0 p-0 [&>button:last-child]:!cursor-pointer [&>button:last-child]:!rounded-full [&>button:last-child]:!bg-black/70 [&>button:last-child]:!p-1.5 [&>button:last-child]:!text-white [&>button:last-child]:!opacity-100 [&>button:last-child]:!shadow-lg [&>button:last-child]:!backdrop-blur-md [&>button:last-child]:hover:!bg-black/90">
          <VisuallyHidden.Root>
            <DialogTitle>Preview: {filename}</DialogTitle>
          </VisuallyHidden.Root>
          <div className="relative bg-black/90">
            <img
              src={previewUrl(path)}
              alt={filename}
              className="h-auto max-h-[70vh] w-full object-contain"
            />
          </div>
          <div className="bg-background flex items-center gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{filename}</span>
            </div>
            <a
              href={previewUrl(path)}
              download={filename}
              className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer rounded p-1.5 transition-colors"
              aria-label={`Download ${filename}`}
            >
              <DownloadIcon className="h-4 w-4" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <a
      href={previewUrl(path)}
      download={filename}
      data-testid="inline-attachment-file"
      className="text-primary text-sm underline underline-offset-2"
    >
      {filename}
    </a>
  );
}
