'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Terminal, ArrowDown, Code, FileText } from 'lucide-react';
import { EventLogViewer } from './event-log-viewer';

export interface LogTabProps {
  content: string;
  isConnected: boolean;
  error: string | null;
}

type ViewMode = 'structured' | 'raw';

export function LogTab({ content, isConnected, error }: LogTabProps) {
  const { t } = useTranslation('web');
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('structured');

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(isAtBottom);
  }, []);

  const jumpToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAutoScroll(true);
  }, []);

  // Auto-scroll when new content arrives (only if auto-scroll is active)
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content, autoScroll]);

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-600">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8">
        <Terminal className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">{t('logTab.noLogOutput')}</p>
        {isConnected ? (
          <p className="text-muted-foreground text-xs">Waiting for log data...</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="log-tab">
      {/* Status bar */}
      <div className="flex items-center gap-2 border-b px-3 py-1.5">
        <span
          className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-zinc-400'}`}
        />
        <span className="text-muted-foreground text-xs">
          {isConnected ? 'Live' : 'Disconnected'}
        </span>

        {/* View mode toggle */}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('structured')}
            className={`rounded p-1 transition-colors ${
              viewMode === 'structured'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={t('logTab.structuredView')}
          >
            <FileText className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('raw')}
            className={`rounded p-1 transition-colors ${
              viewMode === 'raw'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={t('logTab.rawView')}
          >
            <Code className="h-3.5 w-3.5" />
          </button>

          {!autoScroll ? (
            <button
              type="button"
              onClick={jumpToBottom}
              className="text-muted-foreground hover:text-foreground ms-1 flex items-center gap-1 text-xs"
            >
              <ArrowDown className="h-3 w-3" />
              Jump to bottom
            </button>
          ) : null}
        </div>
      </div>

      {/* Log content */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto ${
          viewMode === 'raw'
            ? 'bg-zinc-950 p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-zinc-300'
            : 'bg-background'
        }`}
      >
        {viewMode === 'structured' ? <EventLogViewer content={content} /> : content}
      </div>
    </div>
  );
}
