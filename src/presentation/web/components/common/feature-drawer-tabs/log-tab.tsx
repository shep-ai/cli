'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { AlertCircle, Terminal, ArrowDown } from 'lucide-react';

export interface LogTabProps {
  content: string;
  isConnected: boolean;
  error: string | null;
}

export function LogTab({ content, isConnected, error }: LogTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

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
        <p className="text-muted-foreground text-sm">No log output yet</p>
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
        {!autoScroll ? (
          <button
            type="button"
            onClick={jumpToBottom}
            className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1 text-xs"
          >
            <ArrowDown className="h-3 w-3" />
            Jump to bottom
          </button>
        ) : null}
      </div>
      {/* Log content */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-zinc-950 p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-zinc-300"
      >
        {content}
      </div>
    </div>
  );
}
