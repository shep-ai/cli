'use client';

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

type CodeBlockProps = {
  language: string;
  filename: string;
  highlightLines?: number[];
} & (
  | {
      code: string;
      tabs?: never;
    }
  | {
      code?: never;
      tabs: {
        name: string;
        code: string;
        language?: string;
        highlightLines?: number[];
      }[];
    }
);

export function CodeBlock({
  language,
  filename,
  code,
  highlightLines = [],
  tabs = [],
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);

  const tabsExist = tabs.length > 0;

  const copyToClipboard = async () => {
    const textToCopy = tabsExist ? tabs[activeTab].code : code;
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeCode = tabsExist ? tabs[activeTab].code : code;
  const activeLanguage = tabsExist ? (tabs[activeTab].language ?? language) : language;
  const activeHighlightLines = tabsExist ? (tabs[activeTab].highlightLines ?? []) : highlightLines;

  return (
    <div className={cn('relative w-full rounded-lg bg-slate-950 p-4 font-mono text-sm')}>
      <div className="flex flex-col gap-2">
        {tabsExist ? (
          <div className="flex overflow-x-auto">
            {tabs.map((tab, index) => (
              <button
                key={tab.name}
                type="button"
                onClick={() => setActiveTab(index)}
                className={cn(
                  'px-3 py-2 font-sans text-xs transition-colors',
                  activeTab === index ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                {tab.name}
              </button>
            ))}
          </div>
        ) : null}
        {!tabsExist && filename ? (
          <div className="flex items-center justify-between py-2">
            <div className="text-xs text-zinc-400">{filename}</div>
            <button
              type="button"
              onClick={copyToClipboard}
              className="flex items-center gap-1 font-sans text-xs text-zinc-400 transition-colors hover:text-zinc-200"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : null}
      </div>
      <SyntaxHighlighter
        language={activeLanguage}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: 0,
          background: 'transparent',
          fontSize: '0.8125rem',
        }}
        wrapLines={true}
        showLineNumbers={true}
        lineProps={(lineNumber) => ({
          style: {
            backgroundColor: activeHighlightLines.includes(lineNumber)
              ? 'rgba(255,255,255,0.1)'
              : 'transparent',
            display: 'block',
            width: '100%',
          },
        })}
        PreTag="div"
      >
        {String(activeCode)}
      </SyntaxHighlighter>
    </div>
  );
}

/* ─── Diff-aware code block for unified diff rendering ─── */

export type DiffLineType = 'added' | 'removed' | 'context';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldNumber?: number;
  newNumber?: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffCodeBlockProps {
  language: string;
  filename: string;
  hunks: DiffHunk[];
}

const DIFF_LINE_BG: Record<DiffLineType, string> = {
  added: 'rgba(34, 197, 94, 0.12)',
  removed: 'rgba(239, 68, 68, 0.12)',
  context: 'transparent',
};

export function DiffCodeBlock({ language, filename, hunks }: DiffCodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const allLines = React.useMemo(() => {
    const result: { line: DiffLine; hunkHeader?: string }[] = [];
    for (const hunk of hunks) {
      result.push({ line: { type: 'context', content: '' }, hunkHeader: hunk.header });
      for (const line of hunk.lines) {
        result.push({ line });
      }
    }
    return result;
  }, [hunks]);

  const codeString = React.useMemo(
    () =>
      allLines
        .map((entry) => {
          if (entry.hunkHeader != null) return entry.hunkHeader;
          return entry.line.content || ' ';
        })
        .join('\n'),
    [allLines]
  );

  const copyToClipboard = async () => {
    const text = hunks.flatMap((h) => h.lines.map((l) => l.content)).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (hunks.length === 0) {
    return (
      <div className="rounded-lg bg-slate-950 px-4 py-6 text-center font-mono text-xs text-zinc-500">
        No diff content available
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-slate-950 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="text-xs text-zinc-400">{filename}</div>
        <button
          type="button"
          onClick={copyToClipboard}
          className="flex items-center gap-1 font-sans text-xs text-zinc-400 transition-colors hover:text-zinc-200"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      {/* Diff lines */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '0.5rem 0',
            background: 'transparent',
            fontSize: '0.75rem',
            lineHeight: '1.25rem',
          }}
          wrapLines={true}
          showLineNumbers={false}
          lineProps={(lineNumber) => {
            const idx = lineNumber - 1;
            const entry = allLines[idx];
            if (!entry) return { style: { display: 'block', width: '100%' } };

            if (entry.hunkHeader != null) {
              return {
                style: {
                  display: 'block',
                  width: '100%',
                  backgroundColor: 'rgba(100, 100, 200, 0.08)',
                  color: 'rgb(148, 163, 184)',
                  fontStyle: 'italic',
                  padding: '0 1rem',
                },
              };
            }

            return {
              style: {
                display: 'block',
                width: '100%',
                backgroundColor: DIFF_LINE_BG[entry.line.type],
                padding: '0 1rem',
              },
            };
          }}
          PreTag="div"
          CodeTag="div"
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
