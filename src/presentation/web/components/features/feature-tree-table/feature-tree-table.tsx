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
  parentId?: string;
  /** Child rows for tree hierarchy */
  _children?: FeatureTreeRow[];
  /** Whether this row is a repository group header */
  _isRepoGroup?: boolean;
}

export interface FeatureTreeTableProps {
  data: FeatureTreeRow[];
  className?: string;
  onFeatureClick?: (featureId: string) => void;
}

const STATUS_COLORS: Record<FeatureStatus, string> = {
  'action-needed': '#f59e0b',
  'in-progress': '#3b82f6',
  pending: '#94a3b8',
  blocked: '#9ca3af',
  error: '#ef4444',
  done: '#10b981',
};

const STATUS_LABELS: Record<FeatureStatus, string> = {
  'action-needed': 'Action Needed',
  'in-progress': 'In Progress',
  pending: 'Pending',
  blocked: 'Blocked',
  error: 'Error',
  done: 'Done',
};

function statusFormatter(cell: CellComponent): string {
  const row = cell.getRow().getData() as FeatureTreeRow;
  if (row._isRepoGroup) return '';
  const value = cell.getValue() as FeatureStatus;
  const color = STATUS_COLORS[value] ?? '#94a3b8';
  const label = STATUS_LABELS[value] ?? value;
  return `<span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>${label}</span>`;
}

function buildColumns(onFeatureClick?: (featureId: string) => void): ColumnDefinition[] {
  return [
    {
      title: 'Name',
      field: 'name',
      widthGrow: 3,
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
        return cell.getValue() as string;
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

    // If there's only one repo, skip the group wrapper
    if (byRepo.size === 1) {
      roots.push(...repoChildren);
    } else {
      // Create a repo group node
      const repoGroup: FeatureTreeRow = {
        id: `repo-${repoName}`,
        name: repoName,
        status: 'pending',
        lifecycle: '',
        branch: '',
        repositoryName: repoName,
        _isRepoGroup: true,
        _children: repoChildren,
      };
      roots.push(repoGroup);
    }
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
      placeholder: 'No features found',
      headerSortClickElement: 'icon',
      rowHeight: 40,
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
