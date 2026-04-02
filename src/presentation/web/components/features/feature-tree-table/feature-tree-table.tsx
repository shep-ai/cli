'use client';

import { useEffect, useRef, useCallback } from 'react';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import type { ColumnDefinition, CellComponent, RowComponent } from 'tabulator-tables';
import { cn } from '@/lib/utils';
import type { FeatureStatus } from '@/components/common/feature-status-config';
import './feature-tree-table.css';

export interface FeatureTreeRow {
  id: string;
  name: string;
  status: FeatureStatus;
  lifecycle: string;
  branch: string;
  repositoryName: string;
  remoteUrl?: string;
  parentId?: string;
  /** Child rows for tree hierarchy */
  _children?: FeatureTreeRow[];
  /** Whether this row is a repository group header */
  _isRepoGroup?: boolean;
  /** Number of features in this repo group */
  _featureCount?: number;
}

export interface FeatureTreeTableProps {
  data: FeatureTreeRow[];
  className?: string;
  onFeatureClick?: (featureId: string) => void;
}

const STATUS_LABELS: Record<FeatureStatus, string> = {
  'action-needed': 'Action Needed',
  'in-progress': 'In Progress',
  pending: 'Pending',
  blocked: 'Blocked',
  error: 'Error',
  done: 'Done',
};

/** SVG repo icon — lucide FolderGit2 */
const REPO_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><circle cx="12" cy="13" r="2"/><path d="M14 13h3"/><path d="M7 13h3"/></svg>`;

function statusFormatter(cell: CellComponent): string {
  const row = cell.getRow().getData() as FeatureTreeRow;
  if (row._isRepoGroup) return '';
  const value = cell.getValue() as FeatureStatus;
  const label = STATUS_LABELS[value] ?? value;
  return `<span class="status-pill status-pill--${value}"><span class="status-dot"></span>${label}</span>`;
}

function nameFormatter(cell: CellComponent): string {
  const row = cell.getRow().getData() as FeatureTreeRow;

  if (row._isRepoGroup) {
    const countLabel = row._featureCount === 1 ? '1 Feature' : `${row._featureCount ?? 0} Features`;
    const remoteLabel = row.remoteUrl
      ? `<span class="repo-remote-url">${escapeHtml(row.remoteUrl)}</span>`
      : '';

    return `<span class="repo-name-cell">${REPO_ICON_SVG}<span class="repo-name-text"><span class="repo-name-primary"><span class="repo-name-title">${escapeHtml(row.name)}</span><span class="repo-feature-count">${countLabel}</span></span>${remoteLabel}</span></span>`;
  }

  return escapeHtml(cell.getValue() as string);
}

function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildColumns(onFeatureClick?: (featureId: string) => void): ColumnDefinition[] {
  return [
    {
      title: 'Name',
      field: 'name',
      widthGrow: 3,
      formatter: nameFormatter,
      ...(onFeatureClick && {
        cellClick: (_e: UIEvent, cell: CellComponent) => {
          const data = cell.getRow().getData() as FeatureTreeRow;
          if (data._isRepoGroup) return;
          onFeatureClick(data.id);
        },
        cssClass: 'cursor-pointer',
      }),
    },
    {
      title: 'Status',
      field: 'status',
      widthGrow: 1.5,
      formatter: statusFormatter,
    },
    {
      title: 'Lifecycle',
      field: 'lifecycle',
      widthGrow: 1.5,
      formatter: (cell: CellComponent) => {
        const row = cell.getRow().getData() as FeatureTreeRow;
        if (row._isRepoGroup) return '';
        return cell.getValue() as string;
      },
    },
    {
      title: 'Branch',
      field: 'branch',
      widthGrow: 2,
      formatter: (cell: CellComponent) => {
        const row = cell.getRow().getData() as FeatureTreeRow;
        if (row._isRepoGroup) return '';
        const val = cell.getValue() as string;
        if (!val) return '';
        return `<code style="font-size:12px;color:var(--color-muted-foreground,#64748b);font-family:var(--font-mono)">${escapeHtml(val)}</code>`;
      },
    },
  ];
}

/**
 * Build tree-structured data grouped by repository.
 * Each repository becomes a parent node with its features as children.
 * Features that have parent-child relationships are nested within their repository group.
 */
export function buildTreeData(flatData: FeatureTreeRow[]): FeatureTreeRow[] {
  if (flatData.length === 0) return [];

  // Group features by repository
  const byRepo = new Map<string, FeatureTreeRow[]>();
  for (const item of flatData) {
    const repoName = item.repositoryName || 'Unknown';
    if (!byRepo.has(repoName)) {
      byRepo.set(repoName, []);
    }
    byRepo.get(repoName)!.push(item);
  }

  const roots: FeatureTreeRow[] = [];

  for (const [repoName, features] of byRepo) {
    // Build parent-child relationships within this repo group
    const lookup = new Map<string, FeatureTreeRow>();
    const repoChildren: FeatureTreeRow[] = [];

    for (const item of features) {
      lookup.set(item.id, { ...item, _children: [] });
    }

    for (const item of features) {
      const node = lookup.get(item.id)!;
      if (item.parentId && lookup.has(item.parentId)) {
        lookup.get(item.parentId)!._children!.push(node);
      } else {
        repoChildren.push(node);
      }
    }

    // Clean up empty _children arrays
    for (const node of lookup.values()) {
      if (node._children?.length === 0) {
        delete node._children;
      }
    }

    // Get remoteUrl from the first feature in this group
    const remoteUrl = features[0]?.remoteUrl;

    // Always create repo group nodes (inventory view is repo-centric)
    const repoGroup: FeatureTreeRow = {
      id: `repo-${repoName}`,
      name: repoName,
      status: 'pending',
      lifecycle: '',
      branch: '',
      repositoryName: repoName,
      remoteUrl,
      _isRepoGroup: true,
      _featureCount: features.length,
      _children: repoChildren,
    };
    roots.push(repoGroup);
  }

  return roots;
}

export function FeatureTreeTable({ data, className, onFeatureClick }: FeatureTreeTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabulatorRef = useRef<Tabulator | null>(null);
  const onFeatureClickRef = useRef(onFeatureClick);
  onFeatureClickRef.current = onFeatureClick;

  const stableOnFeatureClick = useCallback((featureId: string) => {
    onFeatureClickRef.current?.(featureId);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const treeData = buildTreeData(data);
    const columns = buildColumns(stableOnFeatureClick);

    const table = new Tabulator(containerRef.current, {
      data: treeData,
      columns,
      dataTree: true,
      dataTreeStartExpanded: true,
      layout: 'fitColumns',
      height: '100%',
      placeholder: 'No repositories found',
      headerSortClickElement: 'icon',
      rowFormatter: (row: RowComponent) => {
        const rowData = row.getData() as FeatureTreeRow;
        if (rowData._isRepoGroup) {
          row.getElement().classList.add('tabulator-row-repo-group');
        }
      },
    });

    tabulatorRef.current = table;

    return () => {
      table.destroy();
      tabulatorRef.current = null;
    };
  }, [data, stableOnFeatureClick]);

  return (
    <div
      data-testid="feature-tree-table"
      className={cn('h-full w-full', className)}
      ref={containerRef}
    />
  );
}
