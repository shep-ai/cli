'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Play, Loader2, AlertCircle } from 'lucide-react';
import { isWriteQuery } from '@/lib/sql-validation';
import { CellValueDialog } from './cell-value-dialog';

const MAX_CELL_LENGTH = 100;

export interface QueryRunnerProps {
  onExecute: (sql: string) => Promise<{
    columns?: string[];
    rows?: Record<string, unknown>[];
    error?: string;
  }>;
}

function formatCellDisplay(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  return String(value);
}

export function QueryRunner({ onExecute }: QueryRunnerProps) {
  const [sql, setSql] = useState('');
  const [result, setResult] = useState<{
    columns?: string[];
    rows?: Record<string, unknown>[];
    error?: string;
  } | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    columnName: string;
    value: string;
  }>({ open: false, columnName: '', value: '' });

  const handleExecute = async () => {
    setClientError(null);
    setResult(null);

    const trimmed = sql.trim();
    if (!trimmed) {
      setClientError('Query cannot be empty');
      return;
    }

    if (isWriteQuery(trimmed)) {
      setClientError(
        'Write operations are not allowed. Only SELECT and PRAGMA queries are permitted.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await onExecute(trimmed);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const error = clientError ?? result?.error;

  return (
    <div className="flex flex-col gap-4" data-testid="query-runner">
      <div className="flex flex-col gap-2">
        <Label htmlFor="sql-query" className="text-xs font-medium">
          SQL Query
        </Label>
        <Textarea
          id="sql-query"
          placeholder="SELECT * FROM features LIMIT 10"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          className="bg-muted/30 font-mono text-xs"
          rows={4}
          data-testid="query-runner-input"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleExecute}
            disabled={loading || sql.trim().length === 0}
            size="sm"
            className="gap-1.5"
            data-testid="query-runner-execute"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {loading ? 'Executing...' : 'Execute'}
          </Button>
        </div>
      </div>

      {error ? (
        <div
          className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border border-red-200 p-3 text-sm dark:border-red-900"
          role="alert"
          aria-live="polite"
          data-testid="query-runner-error"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-xs">{error}</span>
        </div>
      ) : null}

      {result?.columns && result.rows ? (
        <div data-testid="query-runner-results">
          <div className="text-muted-foreground mb-2 text-xs">
            {result.rows.length} row{result.rows.length !== 1 ? 's' : ''} returned
          </div>
          <div className="border-border overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {result.columns.map((col) => (
                    <TableHead
                      key={col}
                      className="font-mono text-xs font-medium whitespace-nowrap"
                    >
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row, rowIdx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <TableRow key={rowIdx}>
                    {result.columns!.map((col) => {
                      const display = formatCellDisplay(row[col]);
                      const truncated = display.length > MAX_CELL_LENGTH;
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
                              {display.slice(0, MAX_CELL_LENGTH)}...
                            </button>
                          ) : (
                            <span
                              className={display === 'NULL' ? 'text-muted-foreground italic' : ''}
                            >
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
        </div>
      ) : null}

      <CellValueDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        columnName={dialogState.columnName}
        value={dialogState.value}
      />
    </div>
  );
}
