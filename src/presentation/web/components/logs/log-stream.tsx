'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/domain/generated/output';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface LogStreamProps {
  logs: LogEntry[];
  autoScroll: boolean;
}

function getLevelBadgeVariant(level: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (level.toLowerCase()) {
    case 'error':
      return 'destructive';
    case 'warn':
      return 'outline';
    case 'info':
      return 'secondary';
    case 'debug':
      return 'default';
    default:
      return 'default';
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function LogStream({ logs, autoScroll }: LogStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  if (logs.length === 0) {
    return (
      <div className="text-muted-foreground flex h-96 items-center justify-center text-center">
        <div>
          <p className="text-lg font-medium">Waiting for logs...</p>
          <p className="text-sm">New log entries will appear here in real-time</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="log-stream-container"
      className="bg-muted/30 h-[600px] overflow-y-auto rounded-md border p-4"
    >
      <div className="space-y-2 font-mono text-sm">
        {logs.map((log) => (
          <div
            key={log.id}
            className={cn(
              'flex items-start gap-3 rounded-md border p-2 transition-colors',
              log.level === 'error' && 'border-destructive/50 bg-destructive/5',
              log.level === 'warn' && 'border-yellow-500/50 bg-yellow-500/5',
              log.level === 'info' && 'bg-background',
              log.level === 'debug' && 'text-muted-foreground bg-muted/50'
            )}
          >
            <span className="text-muted-foreground shrink-0 text-xs">
              {formatTime(log.timestamp)}
            </span>
            <Badge variant={getLevelBadgeVariant(log.level)} className="shrink-0 text-xs">
              {log.level}
            </Badge>
            <span className="text-muted-foreground shrink-0 text-xs">{log.source}</span>
            <span className="min-w-0 flex-1 break-words">{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
