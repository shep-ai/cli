'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Terminal } from 'lucide-react';
import type { LogEntry } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDeploymentLogs } from '@/hooks/use-deployment-logs';

export interface ServerLogViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
}

export interface ServerLogViewerContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: LogEntry[];
  isConnected: boolean;
}

const AUTO_SCROLL_THRESHOLD = 50;

export function ServerLogViewer({ open, onOpenChange, targetId }: ServerLogViewerProps) {
  const { logs, isConnected } = useDeploymentLogs(open ? targetId : null);

  return (
    <ServerLogViewerContent
      open={open}
      onOpenChange={onOpenChange}
      logs={logs}
      isConnected={isConnected}
    />
  );
}

export function ServerLogViewerContent({
  open,
  onOpenChange,
  logs,
  isConnected,
}: ServerLogViewerContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - AUTO_SCROLL_THRESHOLD;
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[calc(100vh-48px)] max-h-[calc(100vh-48px)] w-full max-w-[calc(100vw-48px)] flex-col gap-0 bg-zinc-950 p-0 text-zinc-100 sm:rounded-lg"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-zinc-400" />
            <DialogTitle className="text-sm font-medium text-zinc-100">Server Logs</DialogTitle>
          </div>
          <div className="flex items-center gap-2 pr-8">
            <span
              className={`inline-block h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-zinc-500'}`}
            />
            <span className="text-xs text-zinc-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed"
        >
          {logs.length === 0 ? (
            <p className="text-zinc-500">Waiting for log output...</p>
          ) : (
            logs.map((entry) => (
              <LogLine key={`${entry.timestamp}-${entry.stream}-${entry.line}`} entry={entry} />
            ))
          )}
          {!isConnected && logs.length > 0 && (
            <div className="mt-2 border-t border-zinc-800 pt-2 text-zinc-500">[Server stopped]</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  return (
    <div
      data-stream={entry.stream}
      className={entry.stream === 'stderr' ? 'text-red-400' : 'text-zinc-200'}
    >
      <span className="break-all whitespace-pre-wrap">{entry.line}</span>
    </div>
  );
}
