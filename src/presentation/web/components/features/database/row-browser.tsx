'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { CellValueDialog } from './cell-value-dialog';

const MAX_CELL_LENGTH = 100;

export interface RowBrowserProps {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

function formatCellDisplay(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  return String(value);
}

function isTruncated(value: string): boolean {
  return value.length > MAX_CELL_LENGTH;
}

function truncate(value: string): string {
  if (isTruncated(value)) {
    return `${value.slice(0, MAX_CELL_LENGTH)}...`;
  }
  return value;
}

export function RowBrowser({
  columns,
  rows,
  totalRows,
  page,
  pageSize,
  onPageChange,
  loading,
}: RowBrowserProps) {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    columnName: string;
    value: string;
  }>({ open: false, columnName: '', value: '' });

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const isFirstPage = page === 0;
  const isLastPage = page >= totalPages - 1;

  if (loading) {
    return (
      <div
        className="text-muted-foreground flex items-center justify-center gap-2 p-12 text-sm"
        data-testid="row-browser-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading rows...
      </div>
    );
  }

  if (rows.length === 0 && totalRows === 0) {
    return (
      <div
        className="text-muted-foreground flex items-center justify-center p-12 text-sm"
        data-testid="row-browser-empty"
      >
        This table has no rows
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="row-browser">
      {/* Pagination bar */}
      <div className="flex items-center justify-between" data-testid="row-browser-pagination">
        <span className="text-muted-foreground text-xs tabular-nums">
          {totalRows.toLocaleString()} row{totalRows !== 1 ? 's' : ''} &middot; Page {page + 1} of{' '}
          {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange(page - 1)}
            disabled={isFirstPage}
            data-testid="row-browser-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange(page + 1)}
            disabled={isLastPage}
            data-testid="row-browser-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Data table */}
      <div className="border-border overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((col) => (
                <TableHead key={col} className="font-mono text-xs font-medium whitespace-nowrap">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIdx) => (
              // eslint-disable-next-line react/no-array-index-key
              <TableRow key={rowIdx}>
                {columns.map((col) => {
                  const display = formatCellDisplay(row[col]);
                  const truncated = isTruncated(display);
                  return (
                    <TableCell key={col} className="max-w-[300px] py-1.5 font-mono text-xs">
                      {truncated ? (
                        <button
                          className="text-primary cursor-pointer text-left underline-offset-2 hover:underline"
                          onClick={() =>
                            setDialogState({ open: true, columnName: col, value: display })
                          }
                          title="Click to view full value"
                        >
                          {truncate(display)}
                        </button>
                      ) : (
                        <span className={display === 'NULL' ? 'text-muted-foreground italic' : ''}>
                          {display}
                        </span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CellValueDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        columnName={dialogState.columnName}
        value={dialogState.value}
      />
    </div>
  );
}
