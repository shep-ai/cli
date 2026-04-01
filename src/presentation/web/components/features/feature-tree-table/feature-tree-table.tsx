'use client';

import { useEffect, useRef, useCallback } from 'react';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import type { ColumnDefinition, CellComponent } from 'tabulator-tables';
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
  const value = cell.getValue() as FeatureStatus;
  const color = STATUS_COLORS[value] ?? '#94a3b8';
  const label = STATUS_LABELS[value] ?? value;
  return `<span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>${label}</span>`;
}

function buildColumns(onFeatureClick?: (featureId: string) => void): ColumnDefinition[] {
  const columns: ColumnDefinition[] = [
    {
      title: 'Name',
      field: 'name',
      widthGrow: 3,
      ...(onFeatureClick && {
        cellClick: (_e: UIEvent, cell: CellComponent) => {
          const row = cell.getRow();
          const id = row.getData().id as string;
          onFeatureClick(id);
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
    },
    {
      title: 'Branch',
      field: 'branch',
      widthGrow: 2,
    },
    {
      title: 'Repository',
      field: 'repositoryName',
      widthGrow: 2,
    },
  ];
  return columns;
}

/**
 * Build tree-structured data from a flat list of features.
 * Features with a `parentId` become children of their parent.
 * Top-level features (no parentId) are roots.
 */
export function buildTreeData(flatData: FeatureTreeRow[]): FeatureTreeRow[] {
  const lookup = new Map<string, FeatureTreeRow>();
  const roots: FeatureTreeRow[] = [];

  // First pass: index all items
  for (const item of flatData) {
    lookup.set(item.id, { ...item, _children: [] });
  }

  // Second pass: build parent-child relationships
  for (const item of flatData) {
    const node = lookup.get(item.id)!;
    if (item.parentId && lookup.has(item.parentId)) {
      lookup.get(item.parentId)!._children!.push(node);
    } else {
      roots.push(node);
    }
  }

  // Clean up empty _children arrays
  for (const node of lookup.values()) {
    if (node._children?.length === 0) {
      delete node._children;
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
