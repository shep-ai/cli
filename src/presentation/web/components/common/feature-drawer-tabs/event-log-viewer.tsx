'use client';

import { useMemo } from 'react';
import {
  FileText,
  Terminal,
  MessageSquare,
  CheckCircle2,
  Coins,
  Server,
  FileCode,
} from 'lucide-react';
import {
  parseLogContent,
  parseToolCall,
  parseResultMessage,
  parseTokensMessage,
  type ParsedLogLine,
} from '@/lib/parse-log-line';

/* ---------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------- */

export interface EventLogViewerProps {
  content: string;
}

export function EventLogViewer({ content }: EventLogViewerProps) {
  const lines = useMemo(() => parseLogContent(content), [content]);

  if (lines.length === 0) return null;

  return (
    <div className="flex flex-col">
      {lines.map((line) => (
        <LogLineRow key={line.id} line={line} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Line router
 * ------------------------------------------------------------------------- */

function LogLineRow({ line }: { line: ParsedLogLine }) {
  switch (line.tag) {
    case 'tool':
      return <ToolCallRow line={line} />;
    case 'text':
      return <TextRow line={line} />;
    case 'result':
      return <ResultRow line={line} />;
    case 'tokens':
      return <TokensRow line={line} />;
    case 'worker':
      return <WorkerRow line={line} />;
    case 'info':
      return <InfoRow line={line} />;
    case 'raw':
    default:
      return <RawRow line={line} />;
  }
}

/* ---------------------------------------------------------------------------
 * Shared helpers
 * ------------------------------------------------------------------------- */

function Timestamp({ value }: { value: string | null }) {
  if (!value) return null;
  const time = value.replace(/^.*T/, '').replace('Z', '');
  return (
    <span className="text-muted-foreground/60 w-20 shrink-0 font-mono text-[10px]">{time}</span>
  );
}

function PhaseBadge({ phase }: { phase: string | null }) {
  if (!phase) return null;
  return (
    <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium">
      {phase}
    </span>
  );
}

/* ---------------------------------------------------------------------------
 * Event-specific rows
 * ------------------------------------------------------------------------- */

function ToolCallRow({ line }: { line: ParsedLogLine }) {
  const { toolName, args } = parseToolCall(line.message);

  // Try to extract a key detail from args for common tools
  const detail = getToolDetail(toolName, args);

  return (
    <div className="hover:bg-muted/50 flex items-start gap-2 border-b border-transparent px-3 py-1.5 transition-colors">
      <Timestamp value={line.timestamp} />
      <PhaseBadge phase={line.phase} />
      <div className="flex min-w-0 flex-1 items-start gap-1.5">
        <ToolIcon toolName={toolName} />
        <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
          {toolName}
        </span>
        {detail ? (
          <span className="text-muted-foreground min-w-0 truncate font-mono text-xs">{detail}</span>
        ) : null}
      </div>
    </div>
  );
}

function ToolIcon({ toolName }: { toolName: string }) {
  const lower = toolName.toLowerCase();
  if (lower === 'bash') return <Terminal className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" />;
  if (lower === 'read' || lower === 'glob' || lower === 'grep')
    return <FileText className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" />;
  if (lower === 'write' || lower === 'edit')
    return <FileCode className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" />;
  return <Terminal className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" />;
}

function getToolDetail(toolName: string, args: string): string | null {
  try {
    const parsed = JSON.parse(args);
    if (toolName === 'Read' && parsed.file_path) return parsed.file_path;
    if (toolName === 'Write' && parsed.file_path) return parsed.file_path;
    if (toolName === 'Edit' && parsed.file_path) return parsed.file_path;
    if (toolName === 'Glob' && parsed.pattern) return parsed.pattern;
    if (toolName === 'Grep' && parsed.pattern) return parsed.pattern;
    if (toolName === 'Bash' && parsed.command) {
      const cmd = parsed.command as string;
      return cmd.length > 80 ? `${cmd.slice(0, 80)}...` : cmd;
    }
    if (toolName === 'Task' && parsed.description) return parsed.description;
  } catch {
    // Not JSON — show truncated raw args
    if (args.length > 0) return args.length > 80 ? `${args.slice(0, 80)}...` : args;
  }
  return null;
}

function TextRow({ line }: { line: ParsedLogLine }) {
  return (
    <div className="hover:bg-muted/50 flex items-start gap-2 px-3 py-1.5 transition-colors">
      <Timestamp value={line.timestamp} />
      <PhaseBadge phase={line.phase} />
      <div className="flex min-w-0 flex-1 items-start gap-1.5">
        <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
        <span className="text-foreground/80 min-w-0 text-xs leading-relaxed">{line.message}</span>
      </div>
    </div>
  );
}

function ResultRow({ line }: { line: ParsedLogLine }) {
  const { chars } = parseResultMessage(line.message);
  return (
    <div className="hover:bg-muted/50 flex items-start gap-2 px-3 py-1.5 transition-colors">
      <Timestamp value={line.timestamp} />
      <PhaseBadge phase={line.phase} />
      <div className="flex min-w-0 flex-1 items-start gap-1.5">
        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          Result: {chars.toLocaleString()} chars
        </span>
      </div>
    </div>
  );
}

function TokensRow({ line }: { line: ParsedLogLine }) {
  const { inputTokens, outputTokens } = parseTokensMessage(line.message);
  return (
    <div className="hover:bg-muted/50 flex items-start gap-2 px-3 py-1.5 transition-colors">
      <Timestamp value={line.timestamp} />
      <PhaseBadge phase={line.phase} />
      <div className="flex min-w-0 flex-1 items-start gap-1.5">
        <Coins className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
        <span className="text-muted-foreground text-xs">
          <span className="text-amber-600 dark:text-amber-400">{inputTokens.toLocaleString()}</span>
          {' in / '}
          <span className="text-amber-600 dark:text-amber-400">
            {outputTokens.toLocaleString()}
          </span>
          {' out'}
        </span>
      </div>
    </div>
  );
}

function WorkerRow({ line }: { line: ParsedLogLine }) {
  return (
    <div className="hover:bg-muted/50 flex items-start gap-2 bg-zinc-50 px-3 py-1.5 transition-colors dark:bg-zinc-900/50">
      <Timestamp value={line.timestamp} />
      <div className="flex min-w-0 flex-1 items-start gap-1.5">
        <Server className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />
        <span className="text-muted-foreground text-xs font-medium">{line.message}</span>
      </div>
    </div>
  );
}

function InfoRow({ line }: { line: ParsedLogLine }) {
  return (
    <div className="hover:bg-muted/50 flex items-start gap-2 px-3 py-1.5 transition-colors">
      <Timestamp value={line.timestamp} />
      <PhaseBadge phase={line.phase} />
      <span className="text-muted-foreground min-w-0 text-xs">{line.message}</span>
    </div>
  );
}

function RawRow({ line }: { line: ParsedLogLine }) {
  return (
    <div className="px-3 py-0.5">
      <span className="text-muted-foreground/70 font-mono text-[11px] break-all whitespace-pre-wrap">
        {line.raw}
      </span>
    </div>
  );
}
