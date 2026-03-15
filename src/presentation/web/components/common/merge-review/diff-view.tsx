'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { FilePlus, FileMinus, FileEdit, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CollapseButton,
  File,
  Folder,
  Tree,
  type TreeViewElement,
} from '@/components/ui/file-tree';
import { DiffCodeBlock } from '@/components/ui/code-block';
import type { MergeReviewFileDiff } from './merge-review-config';

/* ─── Language detection from file extension ─── */

const EXT_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.json': 'json',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'markup',
  '.xml': 'markup',
  '.svg': 'markup',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.toml': 'toml',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.dockerfile': 'docker',
  '.tsp': 'typescript',
};

function getLanguageFromPath(path: string): string {
  const ext = path.includes('.') ? `.${path.split('.').pop()?.toLowerCase()}` : '';
  const basename = path.split('/').pop()?.toLowerCase() ?? '';
  if (basename === 'dockerfile') return 'docker';
  if (basename === 'makefile') return 'makefile';
  return EXT_TO_LANGUAGE[ext] ?? 'text';
}

/* ─── Status config ─── */

const STATUS_CONFIG = {
  added: { icon: FilePlus, label: 'A', className: 'text-green-600' },
  modified: { icon: FileEdit, label: 'M', className: 'text-amber-600' },
  deleted: { icon: FileMinus, label: 'D', className: 'text-red-600' },
  renamed: { icon: FileEdit, label: 'R', className: 'text-blue-600' },
} as const;

function FileStatusIcon({ status }: { status: MergeReviewFileDiff['status'] }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return <Icon className={cn('h-3.5 w-3.5 shrink-0', config.className)} />;
}

/* ─── Build tree structure from flat file paths ─── */

interface TreeNode {
  name: string;
  fullPath: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
}

function buildFileTree(files: MergeReviewFileDiff[]): TreeViewElement[] {
  const root: TreeNode = { name: '', fullPath: '', children: new Map(), isFile: false };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath: parts.slice(0, i + 1).join('/'),
          children: new Map(),
          isFile: isLast,
        });
      }
      current = current.children.get(part)!;
      if (isLast) {
        current.isFile = true;
      }
    }
  }

  function toTreeElements(node: TreeNode): TreeViewElement[] {
    const entries = Array.from(node.children.values());
    // Sort: folders first, then files, both alphabetical
    entries.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    return entries.map((entry) => ({
      id: entry.fullPath,
      name: entry.name,
      isSelectable: true,
      children: entry.children.size > 0 ? toTreeElements(entry) : undefined,
    }));
  }

  // Collapse single-child directories (e.g. "src/components" instead of "src" > "components")
  function collapse(elements: TreeViewElement[]): TreeViewElement[] {
    return elements.map((el) => {
      if (el.children?.length === 1 && el.children[0].children) {
        const child = el.children[0];
        return collapse([
          {
            ...child,
            id: child.id,
            name: `${el.name}/${child.name}`,
          },
        ])[0];
      }
      return {
        ...el,
        children: el.children ? collapse(el.children) : undefined,
      };
    });
  }

  return collapse(toTreeElements(root));
}

function getAllIds(elements: TreeViewElement[]): string[] {
  const ids: string[] = [];
  for (const el of elements) {
    ids.push(el.id);
    if (el.children) {
      ids.push(...getAllIds(el.children));
    }
  }
  return ids;
}

/* ─── File diff card with collapsible DiffCodeBlock ─── */

function FileDiffCard({
  file,
  isExpanded,
  onToggle,
  innerRef,
}: {
  file: MergeReviewFileDiff;
  isExpanded: boolean;
  onToggle: () => void;
  innerRef: (el: HTMLDivElement | null) => void;
}) {
  const fileName = file.path.split('/').pop() ?? file.path;
  const dirPath = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '';
  const language = getLanguageFromPath(file.path);

  return (
    <div ref={innerRef} className="border-border border-b last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0 transition-transform duration-150" />
        )}
        <FileStatusIcon status={file.status} />
        <span className="text-foreground min-w-0 flex-1 truncate font-mono text-xs">
          {dirPath ? (
            <>
              <span className="text-muted-foreground">{dirPath}/</span>
              {fileName}
            </>
          ) : (
            fileName
          )}
        </span>
        {file.oldPath ? (
          <span className="text-muted-foreground truncate text-[10px]">
            &larr; {file.oldPath.split('/').pop()}
          </span>
        ) : null}
        <span className="shrink-0 text-[10px]">
          {file.additions > 0 ? <span className="text-green-600">+{file.additions}</span> : null}
          {file.additions > 0 && file.deletions > 0 ? ' ' : null}
          {file.deletions > 0 ? <span className="text-red-600">-{file.deletions}</span> : null}
        </span>
      </button>
      {isExpanded && file.hunks.length > 0 ? (
        <div className="px-2 pb-2">
          <DiffCodeBlock language={language} filename={file.path} hunks={file.hunks} />
        </div>
      ) : null}
    </div>
  );
}

/* ─── Render tree nodes recursively ─── */

function renderTreeNodes(
  elements: TreeViewElement[],
  fileMap: Map<string, MergeReviewFileDiff>
): React.ReactNode {
  return elements.map((el) => {
    if (el.children && el.children.length > 0) {
      return (
        <Folder key={el.id} element={el.name} value={el.id}>
          {renderTreeNodes(el.children, fileMap)}
        </Folder>
      );
    }

    const fileDiff = fileMap.get(el.id);
    const status = fileDiff?.status ?? 'modified';

    return (
      <File key={el.id} value={el.id} fileIcon={<FileStatusIcon status={status} />}>
        <span className="text-xs">{el.name}</span>
        {fileDiff ? (
          <span className="ml-auto shrink-0 pl-2 text-[10px]">
            {fileDiff.additions > 0 ? (
              <span className="text-green-600">+{fileDiff.additions}</span>
            ) : null}
            {fileDiff.additions > 0 && fileDiff.deletions > 0 ? ' ' : null}
            {fileDiff.deletions > 0 ? (
              <span className="text-red-600">-{fileDiff.deletions}</span>
            ) : null}
          </span>
        ) : null}
      </File>
    );
  });
}

/* ─── Main DiffView component ─── */

export interface DiffViewProps {
  fileDiffs: MergeReviewFileDiff[];
}

export function DiffView({ fileDiffs }: DiffViewProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const fileRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const fileMap = useMemo(() => new Map(fileDiffs.map((f) => [f.path, f])), [fileDiffs]);

  const treeElements = useMemo(() => buildFileTree(fileDiffs), [fileDiffs]);
  const allTreeIds = useMemo(() => getAllIds(treeElements), [treeElements]);

  const handleFileSelect = useCallback(
    (fileId: string) => {
      // If the selected ID corresponds to a file (not a folder), expand it and scroll to it
      if (fileMap.has(fileId)) {
        setExpandedFiles((prev) => {
          const next = new Set(prev);
          next.add(fileId);
          return next;
        });
        // Scroll into view after render
        requestAnimationFrame(() => {
          const el = fileRefs.current.get(fileId);
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    },
    [fileMap]
  );

  const toggleFile = useCallback((path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  if (fileDiffs.length === 0) return null;

  return (
    <div className="border-border rounded-lg border">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground h-4 w-4" />
          <span className="text-foreground text-xs font-semibold">Changed Files</span>
          <span className="text-muted-foreground text-[10px]">({fileDiffs.length})</span>
        </div>
      </div>

      {/* File Tree */}
      <div className="border-border border-t px-2 py-2">
        <Tree
          className="max-h-48 overflow-hidden rounded-md"
          initialExpandedItems={allTreeIds}
          elements={treeElements}
          onSelect={handleFileSelect}
          sort="none"
        >
          {renderTreeNodes(treeElements, fileMap)}
          <CollapseButton elements={treeElements} className="mt-1" />
        </Tree>
      </div>

      {/* File Diffs */}
      <div className="border-border border-t">
        {fileDiffs.map((file) => (
          <FileDiffCard
            key={`${file.status}-${file.path}`}
            file={file}
            isExpanded={expandedFiles.has(file.path)}
            onToggle={() => toggleFile(file.path)}
            innerRef={(el) => {
              fileRefs.current.set(file.path, el);
            }}
          />
        ))}
      </div>
    </div>
  );
}
